# Texture3D AI - Backend API

AI-powered image-to-3D conversion API using FastAPI.

## Features

- Image upload with drag & drop support
- Background removal using rembg
- Depth map generation using MiDaS
- Normal map generation
- 3D mesh generation from depth maps
- Texture generation and UV mapping
- Multiple export formats (OBJ, GLB, STL)
- RESTful API with job tracking
- Real-time progress updates

## Requirements

- Python 3.10+
- CUDA-capable GPU (recommended for faster processing)

## Installation

1. Create a virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

```bash
python main.py
```

The API will be available at `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 8000 | Server port |
| HOST | 0.0.0.0 | Server host |

## API Endpoints

### Health Check
```
GET /
GET /health
```

### Upload Image
```
POST /api/upload
```

Query Parameters:
- `remove_background` (bool): Enable background removal (default: true)
- `texture_resolution` (int): Texture resolution 512-2048 (default: 1024)

### Get Job Status
```
GET /api/jobs/{job_id}
```

### List Jobs
```
GET /api/jobs?limit=20
```

### Download Model
```
GET /api/download/{job_id}?format=obj|glb|stl
```

### Download Texture
```
GET /api/download/texture/{job_id}
```

### Delete Job
```
DELETE /api/jobs/{job_id}
```

## API Usage Examples

### Upload Image (cURL)
```bash
curl -X POST "http://localhost:8000/api/upload?remove_background=true&texture_resolution=1024" \
  -F "file=@image.png"
```

### Check Status
```bash
curl http://localhost:8000/api/jobs/{job_id}
```

### Download Model
```bash
curl -o model.obj "http://localhost:8000/api/download/{job_id}?format=obj"
```

### Download GLB
```bash
curl -o model.glb "http://localhost:8000/api/download/{job_id}?format=glb"
```

## Processing Pipeline

1. **Image Upload** - Validate and save input image
2. **Background Removal** - Remove background using rembg (optional)
3. **Depth Generation** - Create depth map using MobileNet
4. **Normal Generation** - Generate normal map from depth
5. **Mesh Generation** - Create 3D mesh from depth/normal
6. **Texture Generation** - Generate UV-mapped texture
7. **Export** - Save to requested format

## Output Formats

| Format | Description | Use Case |
|--------|-------------|----------|
| OBJ | Wavefront OBJ | General 3D, Blender |
| GLB | Binary glTF | Web, Three.js |
| STL | Stereolithography | 3D Printing |

## Troubleshooting

### GPU Not Available
The system will automatically fall back to CPU processing. This is slower but will still work.

### Out of Memory
Reduce `texture_resolution` to 512 in the upload request.

### Model Loading Fails
Check that all dependencies are installed correctly:
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```
