// API utility for communicating with backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface JobStatus {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  created_at: string;
  completed_at?: string;
  input_image_url?: string;
  output_model_url?: string;
  output_texture_url?: string;
  thumbnail_url?: string;
  error?: string;
}

export async function uploadImage(
  file: File,
  options: {
    removeBackground?: boolean;
    textureResolution?: number;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<JobStatus> {
  const { removeBackground = true, textureResolution = 1024 } = options;

  const formData = new FormData();
  formData.append("file", file);

  const params = new URLSearchParams({
    remove_background: String(removeBackground),
    texture_resolution: String(textureResolution),
  });

  const response = await fetch(`${API_BASE_URL}/api/upload?${params}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to upload image");
  }

  return response.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to get job status");
  }

  return response.json();
}

export async function pollJobStatus(
  jobId: string,
  onProgress: (status: JobStatus) => void,
  interval: number = 1000
): Promise<JobStatus> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getJobStatus(jobId);
        onProgress(status);

        if (status.status === "completed") {
          resolve(status);
          return;
        }

        if (status.status === "failed") {
          reject(new Error(status.error || "Job failed"));
          return;
        }

        // Continue polling
        setTimeout(poll, interval);
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
}

export async function downloadModel(
  jobId: string,
  format: "obj" | "glb" | "stl" = "obj"
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/api/download/${jobId}?format=${format}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to download model");
  }

  return response.blob();
}

export async function downloadTexture(jobId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/download/texture/${jobId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to download texture");
  }

  return response.blob();
}

export async function deleteJob(jobId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to delete job");
  }
}

export async function checkHealth(): Promise<{
  status: string;
  version: string;
  model_loaded: boolean;
  gpu_available: boolean;
}> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}

export function getImageUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
}
