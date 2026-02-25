# Texture3D AI

AI-powered image-to-3D conversion web application.

## Project Structure

```
ollama-demo/
├── backend/           # Python FastAPI backend
│   ├── main.py       # API server
│   ├── requirements.txt
│   └── README.md
│
├── texture3d-ai/     # Next.js frontend
│   ├── src/
│   ├── public/
│   └── package.json
│
├── SPEC.md           # Project specification
└── README.md         # This file
```

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

The API runs at `http://localhost:8000`

### Frontend

```bash
cd texture3d-ai
npm install
npm run dev
```

The frontend runs at `http://localhost:3000`

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)
```
PORT=8000
HOST=0.0.0.0
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload image for 3D conversion |
| GET | `/api/jobs/{job_id}` | Get job status |
| GET | `/api/jobs` | List all jobs |
| GET | `/api/download/{job_id}` | Download model (format: obj/glb/stl) |
| DELETE | `/api/jobs/{job_id}` | Delete job |

## Features

- Drag & drop image upload
- Background removal using rembg
- Depth map generation using MiDaS/MobileNet
- Normal map generation
- 3D mesh generation from depth maps
- UV-mapped texture generation
- Multiple export formats (OBJ, GLB, STL)
- Real-time progress tracking
- 3D model preview with rotation controls

## Tech Stack

### Frontend
- Next.js 14
- React
- Three.js / React Three Fiber
- Framer Motion
- Tailwind CSS

### Backend
- FastAPI
- PyTorch
- rembg
- trimesh
- Pillow
