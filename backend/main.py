"""
Texture3D AI - Complete Backend API
FastAPI server for image-to-3D conversion with TripoSR
"""

import os
import uuid
import asyncio
import json
import tempfile
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from enum import Enum

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
import aiofiles
from PIL import Image
import numpy as np

# Configure paths
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
TEMP_DIR = BASE_DIR / "temp"

# Meshy API Configuration
MESHY_API_KEY = os.getenv("MESHY_API_KEY", "")

# Create directories
for dir_path in [UPLOAD_DIR, OUTPUT_DIR, TEMP_DIR]:
    dir_path.mkdir(exist_ok=True)


async def generate_3d_with_meshy(image_path: str, job_id: str) -> bool:
    """Generate 3D model using Meshy AI API"""
    if not MESHY_API_KEY:
        print("Meshy API key not configured")
        return False

    import httpx

    try:
        print(f"Starting Meshy AI generation for job {job_id}")

        # Step 1: Upload image and start generation
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Upload image
            with open(image_path, "rb") as f:
                files = {"file": f}
                upload_response = await client.post(
                    "https://api.meshy.ai/v2/image-to-3d",
                    headers={"Authorization": f"Bearer {MESHY_API_KEY}"},
                    files=files
                )

            if upload_response.status_code != 202:
                print(f"Meshy upload failed: {upload_response.text}")
                return False

            result = upload_response.json()
            task_id = result["result"]

            # Step 2: Poll for completion
            while True:
                await asyncio.sleep(3)
                status_response = await client.get(
                    f"https://api.meshy.ai/v2/image-to-3d/{task_id}",
                    headers={"Authorization": f"Bearer {MESHY_API_KEY}"}
                )

                status_data = status_response.json()
                task_status = status_data.get("status")

                if task_status == "SUCCEEDED":
                    model_url = status_data["model_urls"]["glb"]
                    # Download the model
                    model_response = await client.get(model_url)
                    output_path = OUTPUT_DIR / f"{job_id}.glb"
                    with open(output_path, "wb") as f:
                        f.write(model_response.content)

                    # Also save as OBJ
                    if status_data.get("model_urls", {}).get("obj"):
                        obj_url = status_data["model_urls"]["obj"]
                        obj_response = await client.get(obj_url)
                        obj_path = OUTPUT_DIR / f"{job_id}.obj"
                        with open(obj_path, "wb") as f:
                            f.write(obj_response.content)

                    print(f"Meshy 3D model generated: {job_id}")
                    return True

                elif task_status == "FAILED":
                    print(f"Meshy generation failed: {status_data.get('error')}")
                    return False

    except Exception as e:
        print(f"Meshy API error: {e}")
        return False

app = FastAPI(
    title="Texture3D AI API",
    description="AI-powered image-to-3D conversion API using TripoSR",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Enums
class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ExportFormat(str, Enum):
    OBJ = "obj"
    GLB = "glb"
    STL = "stl"
    USDZ = "usdz"


# Pydantic Models
class JobCreate(BaseModel):
    remove_background: bool = True
    texture_resolution: int = 1024


class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: int
    message: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    input_image_url: Optional[str] = None
    output_model_url: Optional[str] = None
    output_texture_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    error: Optional[str] = None


class JobListResponse(BaseModel):
    jobs: List[JobResponse]
    total: int


class HealthResponse(BaseModel):
    status: str
    version: str
    model_loaded: bool
    timestamp: datetime
    gpu_available: bool


# In-memory job storage (use Redis in production)
jobs_db = {}


def get_model_loader():
    """Lazy load the 3D generation model"""
    model = None
    device = None

    def load_model():
        nonlocal model, device
        if model is None:
            try:
                import torch
                device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
                print(f"Using device: {device}")

                # Try importing TripoSR
                try:
                    from tripsr import TripoSR
                    model = TripoSR(device=device)
                    print("TripoSR model loaded successfully")
                except ImportError:
                    # Fallback to Depth image method
                    print("TripoSR not available, using depth-based method")
                    model = None

            except Exception as e:
                print(f"Error loading model: {e}")
                device = "cpu"
        return model, device

    return load_model


load_3d_model = get_model_loader()


@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint"""
    model, device = load_3d_model()
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        model_loaded=model is not None,
        timestamp=datetime.now(),
        gpu_available=str(device) != "cpu" if device else False
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Detailed health check"""
    model, device = load_3d_model()
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        model_loaded=model is not None,
        timestamp=datetime.now(),
        gpu_available=str(device) != "cpu" if device else False
    )


@app.post("/api/upload", response_model=JobResponse)
async def upload_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    remove_background: bool = Query(True),
    texture_resolution: int = Query(1024, ge=512, le=2048)
):
    """
    Upload an image for 3D conversion
    - remove_background: Enable/disable background removal (default: True)
    - texture_resolution: Texture resolution (512, 1024, 2048)
    """
    # Validate file type
    allowed_types = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: PNG, JPG, WEBP. Got: {file.content_type}"
        )

    # Validate file size (10MB max)
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size: 10MB"
        )

    # Generate unique job ID
    job_id = str(uuid.uuid4())

    # Save uploaded file
    file_extension = file.filename.split(".")[-1].lower() if "." in file.filename else "png"
    if file_extension not in ["png", "jpg", "jpeg", "webp"]:
        file_extension = "png"

    input_filename = f"{job_id}_input.{file_extension}"
    input_path = UPLOAD_DIR / input_filename

    async with aiofiles.open(input_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    # Create job record
    job = JobResponse(
        job_id=job_id,
        status=JobStatus.PENDING,
        progress=0,
        message="Image uploaded. Processing started.",
        created_at=datetime.now(),
        input_image_url=f"/api/images/{input_filename}"
    )
    jobs_db[job_id] = job

    # Start background processing
    background_tasks.add_task(
        process_image_to_3d,
        job_id,
        str(input_path),
        remove_background,
        texture_resolution
    )

    return job


@app.get("/api/jobs", response_model=JobListResponse)
async def list_jobs(limit: int = Query(20, ge=1, le=100)):
    """List all jobs"""
    jobs_list = sorted(
        [JobResponse(**job) if isinstance(job, dict) else job for job in jobs_db.values()],
        key=lambda x: x.created_at,
        reverse=True
    )[:limit]

    return JobListResponse(
        jobs=jobs_list,
        total=len(jobs_db)
    )


@app.get("/api/jobs/{job_id}", response_model=JobResponse)
async def get_job_status(job_id: str):
    """Get the status of a conversion job"""
    if job_id not in jobs_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    job_data = jobs_db[job_id]
    if isinstance(job_data, dict):
        return JobResponse(**job_data)
    return job_data


@app.get("/api/download/{job_id}")
async def download_model(
    job_id: str,
    format: ExportFormat = Query(ExportFormat.OBJ)
):
    """Download the generated 3D model in specified format"""
    if job_id not in jobs_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    job = jobs_db[job_id]
    if isinstance(job, dict):
        job = JobResponse(**job)

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job is not completed. Current status: {job.status}"
        )

    if not job.output_model_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Output model not found"
        )

    # Get the model file
    model_filename = job.output_model_url.split("/")[-1]
    model_path = OUTPUT_DIR / model_filename

    if not model_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Output file not found"
        )

    # Convert format if needed
    if format != ExportFormat.OBJ:
        converted_path = await convert_format(model_path, format)
        if converted_path:
            return FileResponse(
                path=converted_path,
                filename=f"model_{job_id}.{format.value}",
                media_type="application/octet-stream"
            )

    return FileResponse(
        path=model_path,
        filename=f"model_{job_id}.{format.value}",
        media_type="application/octet-stream"
    )


@app.get("/api/download/texture/{job_id}")
async def download_texture(job_id: str):
    """Download the generated texture map"""
    if job_id not in jobs_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    job = jobs_db[job_id]
    if isinstance(job, dict):
        job = JobResponse(**job)

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job is not completed. Current status: {job.status}"
        )

    if not job.output_texture_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Texture not found"
        )

    texture_filename = job.output_texture_url.split("/")[-1]
    texture_path = OUTPUT_DIR / texture_filename

    if not texture_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Texture file not found"
        )

    return FileResponse(
        path=texture_path,
        filename=f"texture_{job_id}.png",
        media_type="image/png"
    )


@app.get("/api/images/{filename}")
async def get_image(filename: str):
    """Serve uploaded images"""
    image_path = UPLOAD_DIR / filename
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    return FileResponse(
        path=image_path,
        media_type="image/png"
    )


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    """Delete a job and its associated files"""
    if job_id not in jobs_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    job = jobs_db[job_id]
    if isinstance(job, dict):
        job = JobResponse(**job)

    # Delete input file
    if job.input_image_url:
        input_filename = job.input_image_url.split("/")[-1]
        input_path = UPLOAD_DIR / input_filename
        if input_path.exists():
            input_path.unlink()

    # Delete output files
    if job.output_model_url:
        model_filename = job.output_model_url.split("/")[-1]
        model_path = OUTPUT_DIR / model_filename
        if model_path.exists():
            model_path.unlink()

    if job.output_texture_url:
        texture_filename = job.output_texture_url.split("/")[-1]
        texture_path = OUTPUT_DIR / texture_filename
        if texture_path.exists():
            texture_path.unlink()

    # Remove from database
    del jobs_db[job_id]

    return {"message": "Job deleted successfully"}


async def convert_format(input_path: Path, format: ExportFormat) -> Optional[Path]:
    """Convert model to different format"""
    try:
        import trimesh

        mesh = trimesh.load(input_path)
        output_path = input_path.parent / f"{input_path.stem}.{format.value}"

        if format == ExportFormat.GLB:
            mesh.export(str(output_path), file_type="glb")
        elif format == ExportFormat.STL:
            mesh.export(str(output_path), file_type="stl")
        elif format == ExportFormat.USDZ:
            mesh.export(str(output_path), file_type="usd")

        return output_path
    except Exception as e:
        print(f"Error converting format: {e}")
        return None


async def process_image_to_3d(
    job_id: str,
    input_path: str,
    remove_background: bool,
    texture_resolution: int
):
    """Background task to process image and generate 3D model"""
    job = jobs_db[job_id]
    if isinstance(job, dict):
        job = JobResponse(**job)

    temp_files = []

    try:
        # Update to processing
        job.status = JobStatus.PROCESSING
        job.progress = 5
        job.message = "Loading image..."
        jobs_db[job_id] = job.model_dump()

        # Try Meshy AI first if API key is configured
        if MESHY_API_KEY:
            job.progress = 20
            job.message = "Using AI to generate 3D model..."
            jobs_db[job_id] = job.model_dump()

            meshy_success = await generate_3d_with_meshy(input_path, job_id)

            if meshy_success:
                # Generate thumbnail
                img = Image.open(input_path).convert("RGB")
                thumbnail_path = await generate_thumbnail(img, job_id)

                # Success!
                job.status = JobStatus.COMPLETED
                job.progress = 100
                job.message = "3D model generated successfully!"
                job.completed_at = datetime.now()
                job.output_model_url = f"/api/download/{job_id}?format=obj"
                job.output_texture_url = f"/api/download/texture/{job_id}"
                job.thumbnail_url = f"/api/images/{thumbnail_path.name}" if thumbnail_path else None
                jobs_db[job_id] = job.model_dump()
                return  # Exit early if Meshy succeeded

        # Fallback: Local processing (lower quality)
        # Step 1: Load and preprocess image
        from PIL import Image
        import numpy as np

        img = Image.open(input_path).convert("RGB")

        # Resize for processing
        max_size = 1024
        if max(img.size) > max_size:
            img.thumbnail((max_size, max_size), Image.LANCZOS)

        # Step 2: Remove background if requested
        if remove_background:
            job.progress = 10
            job.message = "Removing background..."
            jobs_db[job_id] = job.model_dump()

            try:
                from rembg import remove

                # Save temp file for rembg
                temp_input = TEMP_DIR / f"{job_id}_input.png"
                img.save(temp_input)
                temp_files.append(temp_input)

                # Remove background
                output = remove(img)
                no_bg_path = TEMP_DIR / f"{job_id}_nobg.png"
                output.save(no_bg_path)
                temp_files.append(no_bg_path)

                img = output
            except Exception as e:
                print(f"Background removal failed: {e}")
                # Continue without background removal

        # Step 3: Generate depth map
        job.progress = 25
        job.message = "Generating depth map..."
        jobs_db[job_id] = job.model_dump()

        depth_map = await generate_depth_map(img)

        # Step 4: Generate normal map
        job.progress = 40
        job.message = "Generating normal map..."
        jobs_db[job_id] = job.model_dump()

        normal_map = await generate_normal_map(img, depth_map)

        # Step 5: Generate 3D mesh
        job.progress = 55
        job.message = "Generating 3D geometry..."
        jobs_db[job_id] = job.model_dump()

        mesh = await generate_mesh_from_depth(depth_map, normal_map)

        # Step 6: Generate texture
        job.progress = 75
        job.message = "Generating textures..."
        jobs_db[job_id] = job.model_dump()

        texture_path = await generate_texture(img, job_id, texture_resolution)

        # Step 7: Apply texture to mesh
        job.progress = 90
        job.message = "Applying textures..."
        jobs_db[job_id] = job.model_dump()

        mesh = await apply_texture_to_mesh(mesh, texture_path, img)

        # Step 8: Save output
        job.progress = 95
        job.message = "Saving model..."
        jobs_db[job_id] = job.model_dump()

        output_obj = OUTPUT_DIR / f"{job_id}.obj"
        output_glb = OUTPUT_DIR / f"{job_id}.glb"

        # Save as OBJ
        mesh.export(str(output_obj))

        # Save as GLB
        try:
            mesh.export(str(output_glb), file_type="glb")
        except Exception as e:
            print(f"GLB export failed: {e}")

        # Generate thumbnail
        thumbnail_path = await generate_thumbnail(img, job_id)

        # Update job completed
        job.status = JobStatus.COMPLETED
        job.progress = 100
        job.message = "3D model generated successfully!"
        job.completed_at = datetime.now()
        job.output_model_url = f"/api/download/{job_id}?format=obj"
        job.output_texture_url = f"/api/download/texture/{job_id}"
        job.thumbnail_url = f"/api/images/{thumbnail_path.name}" if thumbnail_path else None
        jobs_db[job_id] = job.model_dump()

    except Exception as e:
        print(f"Error processing image: {e}")
        import traceback
        traceback.print_exc()

        job.status = JobStatus.FAILED
        job.error = str(e)
        job.completed_at = datetime.now()
        jobs_db[job_id] = job.model_dump()

    finally:
        # Clean up temp files
        for temp_file in temp_files:
            if temp_file.exists():
                temp_file.unlink()


# Cache for depth model
_depth_model = None
_depth_processor = None

async def generate_depth_map(image: Image.Image):
    """Generate depth map using Depth Anything V2 - much better than simple methods"""
    global _depth_model, _depth_processor

    import numpy as np

    # Try using Depth Anything V2 from Hugging Face
    try:
        from transformers import AutoModelForDepthEstimation, AutoImageProcessor
        import torch

        # Use small model for CPU efficiency
        model_name = "LiheYoung/depth-anything-small-hf"

        if _depth_model is None:
            print(f"Loading Depth Anything model: {model_name}")
            _depth_processor = AutoImageProcessor.from_pretrained(model_name)
            _depth_model = AutoModelForDepthEstimation.from_pretrained(model_name)
            _depth_model.eval()

        # Prepare image
        img_resized = image.resize((518, 518), Image.LANCZOS)

        # Get depth prediction
        inputs = _depth_processor(images=img_resized, return_tensors="pt")

        with torch.no_grad():
            outputs = _depth_model(**inputs)
            depth_pred = outputs.predicted_depth

        # Resize back to original size
        depth_np = torch.nn.functional.interpolate(
            depth_pred.unsqueeze(1),
            size=image.size,
            mode="bilinear",
            align_corners=False
        ).squeeze().numpy()

        # Normalize to 0-1
        depth_np = (depth_np - depth_np.min()) / (depth_np.max() - depth_np.min() + 1e-8)

        print(f"Depth Anything V2 generated depth map successfully")
        return depth_np

    except Exception as e:
        print(f"Depth Anything failed: {e}")
        print("Falling back to improved depth estimation")

        # Fallback: 改进的深度图生成
        import scipy.ndimage

        img_gray = np.array(image.convert("L")).astype(float) / 255.0
        edges = scipy.ndimage.sobel(img_gray)
        depth = 0.7 * (1 - img_gray) + 0.3 * np.abs(edges)
        depth = scipy.ndimage.gaussian_filter(depth, sigma=3)
        depth = (depth - depth.min()) / (depth.max() - depth.min() + 1e-8)

        return depth


async def generate_normal_map(image: Image.Image, depth_map):
    """Generate normal map from depth map"""
    import numpy as np

    # Simple normal map from depth
    depth = np.array(depth_map)
    if len(depth.shape) == 3:
        depth = depth[:, :, 0]

    # Compute gradients
    dy = np.gradient(depth, axis=0)
    dx = np.gradient(depth, axis=1)

    # Compute normals
    normal = np.dstack([-dx, -dy, np.ones_like(depth)])
    normal = normal / (np.linalg.norm(normal, axis=2, keepdims=True) + 1e-8)

    # Convert to 0-255
    normal = ((normal + 1) / 2 * 255).astype(np.uint8)

    return Image.fromarray(normal)


async def generate_mesh_from_depth(depth_map, normal_map):
    """Generate 3D mesh from depth and normal maps - 改进的网格生成"""
    import numpy as np
    import trimesh

    # Convert to numpy
    if isinstance(depth_map, np.ndarray):
        depth = depth_map
    else:
        depth = np.array(depth_map)

    if len(depth.shape) == 3:
        depth = depth[:, :, 0]

    # Use higher resolution for better detail (but not too high for CPU)
    h, w = depth.shape
    target_size = 128  # Increased from low resolution for better quality

    from PIL import Image
    depth_resized = np.array(Image.fromarray(depth).resize((target_size, target_size), Image.LANCZOS))

    # Apply bilateral filter for edge-preserving smoothing
    try:
        import scipy.ndimage
        depth_resized = scipy.ndimage.median_filter(depth_resized, size=3)
    except:
        pass

    # Create vertices with proper 3D displacement
    vertices = []
    faces = []

    # Add a base plane for support
    base_height = -0.3  # Lower base to show more of the object

    for y in range(target_size):
        for x in range(target_size):
            # Normalized coordinates
            u = x / (target_size - 1)
            v = y / (target_size - 1)

            # Get depth value (0-1)
            z = depth_resized[y, x]

            # Create 3D displacement - use depth as Z coordinate
            # Scale and center
            vx = (u - 0.5) * 2  # X: -1 to 1
            vy = (v - 0.5) * 2  # Y: -1 to 1

            # Z with more pronounced depth variation
            vz = z * 1.5 - 0.5 + base_height

            # Add some height based on depth gradient for more detail
            if x > 0 and y > 0 and x < target_size - 1 and y < target_size - 1:
                dzdx = (depth_resized[y, x+1] - depth_resized[y, x-1]) / 2
                dzdy = (depth_resized[y+1, x] - depth_resized[y-1, x]) / 2
                vz += (dzdx * 0.3 + dzdy * 0.3)  # Add gradient-based height

            vertices.append([vx, vy, vz])

    # Create faces with proper winding
    for y in range(target_size - 1):
        for x in range(target_size - 1):
            i = y * target_size + x
            # Triangle 1
            faces.append([i, i + target_size, i + 1])
            # Triangle 2
            faces.append([i + 1, i + target_size, i + target_size + 1])

    vertices = np.array(vertices, dtype=np.float64)
    faces = np.array(faces, dtype=np.int64)

    # Create mesh
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces)

    # Smooth the mesh
    try:
        # Fill holes
        mesh.fill_holes()
    except Exception as e:
        print(f"Smoothing note: {e}")

    # Fix normals
    try:
        mesh.fix_normals()
    except:
        pass

    # Scale to reasonable size
    mesh.vertices *= 0.8

    return mesh


async def generate_texture(image: Image.Image, job_id: str, resolution: int):
    """Generate texture map from image"""
    # Resize to target resolution
    texture = image.resize((resolution, resolution), Image.LANCZOS)

    # Save texture
    texture_path = OUTPUT_DIR / f"{job_id}_texture.png"
    texture.save(texture_path, "PNG")

    return texture_path


async def apply_texture_to_mesh(mesh, texture_path, original_image):
    """Apply texture to mesh"""
    import numpy as np
    import trimesh
    from PIL import Image

    # Load texture
    texture = Image.open(texture_path)

    # Simple UV mapping (planar projection)
    # Scale vertices to 0-1 range
    bounds = mesh.bounds
    if bounds is not None and len(bounds) > 0:
        mesh.vertices -= bounds[0]
        mesh.vertices /= (bounds[1] - bounds[0]).max()

    # Simple UV coordinates based on position
    uvs = np.zeros((len(mesh.vertices), 2))
    uvs[:, 0] = (mesh.vertices[:, 0] + 1) / 2
    uvs[:, 1] = (mesh.vertices[:, 1] + 1) / 2
    uvs = np.clip(uvs, 0, 1)

    # Create material with texture - use newer trimesh API
    try:
        # Try new API (trimesh 4.x)
        material = trimesh.material.PBRMaterial(
            baseColorFactor=[1.0, 1.0, 1.0, 1.0],
            metallicFactor=0.0,
            roughnessFactor=0.8
        )

        # Add visual
        mesh.visual = trimesh.visual.TextureVisuals(
            uv=uvs,
            material=material,
            image=texture
        )
    except (AttributeError, TypeError):
        # Fallback for older trimesh versions or simplified approach
        try:
            mesh.visual = trimesh.visual.TextureVisuals(
                uv=uvs,
                image=texture
            )
        except Exception:
            # If texture mapping fails, just use vertex colors
            pass

    return mesh


async def generate_thumbnail(image: Image.Image, job_id: str):
    """Generate thumbnail for preview"""
    # Create a simple thumbnail
    thumb = image.copy()
    thumb.thumbnail((512, 512), Image.LANCZOS)

    # Save
    thumb_path = OUTPUT_DIR / f"{job_id}_thumb.png"
    thumb.save(thumb_path, "PNG")

    return thumb_path


if __name__ == "__main__":
    import uvicorn

    # Check for GPU
    try:
        import torch
        if torch.cuda.is_available():
            print(f"GPU Available: {torch.cuda.get_device_name(0)}")
        else:
            print("Running on CPU")
    except:
        print("PyTorch not available, running on CPU")

    uvicorn.run(app, host="0.0.0.0", port=8000)
