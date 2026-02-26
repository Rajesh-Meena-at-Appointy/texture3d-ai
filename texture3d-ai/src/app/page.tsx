"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, MeshDistortMaterial, Float, RoundedBox, Torus, Icosahedron, Cone } from "@react-three/drei";
import * as THREE from "three";
import {
  Upload,
  Image as ImageIcon,
  Box,
  Download,
  Share2,
  Zap,
  Shield,
  Clock,
  ArrowRight,
  Check,
  Star,
  Menu,
  X,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sparkles,
  User,
  Mountain,
  ShoppingBag,
  Palette,
  Building2,
  Car,
  Loader2,
  AlertCircle,
  WifiOff,
} from "lucide-react";

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface JobStatus {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  input_image_url?: string;
  output_model_url?: string;
  output_texture_url?: string;
  thumbnail_url?: string;
  error?: string;
}

interface SampleImage {
  id: number;
  name: string;
  category: string;
  color: string;
  gradient: string;
  icon: React.ComponentType<{ className?: string }>;
}

const sampleImages: SampleImage[] = [
  { id: 1, name: "Portrait", category: "Character", color: "#f472b6", gradient: "from-pink-500 to-rose-500", icon: User },
  { id: 2, name: "Landscape", category: "Nature", color: "#22c55e", gradient: "from-green-500 to-emerald-500", icon: Mountain },
  { id: 3, name: "Product", category: "Commercial", color: "#3b82f6", gradient: "from-blue-500 to-cyan-500", icon: ShoppingBag },
  { id: 4, name: "Abstract", category: "Creative", color: "#a855f7", gradient: "from-purple-500 to-violet-500", icon: Palette },
  { id: 5, name: "Architecture", category: "Building", color: "#f59e0b", gradient: "from-amber-500 to-yellow-500", icon: Building2 },
  { id: 6, name: "Vehicle", category: "Transport", color: "#06b6d4", gradient: "from-cyan-500 to-blue-500", icon: Car },
];

// Different 3D model geometries based on image type
function Model3D({ modelType, imageUrl, color }: { modelType: number; imageUrl: string | null; color: string }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [textureError, setTextureError] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setTexture(null);
      setTextureError(false);
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (loadedTexture) => {
        loadedTexture.wrapS = THREE.RepeatWrapping;
        loadedTexture.wrapT = THREE.RepeatWrapping;
        setTexture(loadedTexture);
        setTextureError(false);
      },
      undefined,
      () => {
        setTextureError(true);
        setTexture(null);
      }
    );
  }, [imageUrl]);

  const materialProps = {
    roughness: 0.3,
    metalness: 0.1,
  };

  const renderModel = () => {
    const hasTexture = texture && !textureError;

    switch (modelType) {
      case 1: // Portrait - Head/Bust shape
        return (
          <group>
            <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.3}>
              <mesh position={[0, 0, 0]} scale={1.2}>
                <sphereGeometry args={[0.8, 64, 64]} />
                {hasTexture ? (
                  <meshStandardMaterial {...materialProps} map={texture} />
                ) : (
                  <MeshDistortMaterial color={color} distort={0.2} speed={1.5} roughness={0.3} metalness={0.2} />
                )}
              </mesh>
              {/* Neck */}
              <mesh position={[0, -0.9, 0]} scale={[0.6, 0.5, 0.5]}>
                <cylinderGeometry args={[0.3, 0.4, 0.8, 32]} />
                {hasTexture ? (
                  <meshStandardMaterial {...materialProps} map={texture} />
                ) : (
                  <meshStandardMaterial color={color} {...materialProps} />
                )}
              </mesh>
            </Float>
          </group>
        );

      case 2: // Landscape - Terrain/Mountain
        return (
          <Float speed={1} rotationIntensity={0.2} floatIntensity={0.2}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} scale={1.5}>
              <planeGeometry args={[3, 3, 64, 64]} />
              {hasTexture ? (
                <meshStandardMaterial {...materialProps} map={texture} side={THREE.DoubleSide} />
              ) : (
                <MeshDistortMaterial color={color} distort={0.3} speed={1} roughness={0.5} />
              )}
            </mesh>
            {/* Mountains */}
            <mesh position={[-0.8, 0.3, -0.5]} rotation={[0, 0, 0.3]}>
              <coneGeometry args={[0.6, 1.2, 6]} />
              {hasTexture ? (
                <meshStandardMaterial {...materialProps} map={texture} />
              ) : (
                <meshStandardMaterial color={color} {...materialProps} />
              )}
            </mesh>
            <mesh position={[0.6, 0.2, -0.3]} rotation={[0, 0, -0.2]}>
              <coneGeometry args={[0.5, 1, 6]} />
              {hasTexture ? (
                <meshStandardMaterial {...materialProps} map={texture} />
              ) : (
                <meshStandardMaterial color={color} {...materialProps} />
              )}
            </mesh>
            <mesh position={[0.2, 0.4, 0.4]} rotation={[0, 0, 0.1]}>
              <coneGeometry args={[0.4, 0.9, 6]} />
              {hasTexture ? (
                <meshStandardMaterial {...materialProps} map={texture} />
              ) : (
                <meshStandardMaterial color={color} {...materialProps} />
              )}
            </mesh>
          </Float>
        );

      case 3: // Product - Box/Package
        return (
          <Float speed={2} rotationIntensity={0.4} floatIntensity={0.4}>
            <RoundedBox args={[1.2, 1.2, 1.2]} radius={0.1} scale={1.3}>
              {hasTexture ? (
                <meshStandardMaterial {...materialProps} map={texture} />
              ) : (
                <MeshDistortMaterial color={color} distort={0.15} speed={2} roughness={0.2} metalness={0.3} />
              )}
            </RoundedBox>
            {/* Product lid */}
            <mesh position={[0, 0.75, 0]} scale={[1.2, 0.15, 1.2]}>
              <boxGeometry args={[1.2, 0.15, 1.2]} />
              {hasTexture ? (
                <meshStandardMaterial {...materialProps} map={texture} />
              ) : (
                <meshStandardMaterial color={color} {...materialProps} />
              )}
            </mesh>
          </Float>
        );

      case 4: // Abstract - Icosahedron
        return (
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh scale={1.5}>
              <icosahedronGeometry args={[1, 1]} />
              {hasTexture ? (
                <meshStandardMaterial {...materialProps} map={texture} />
              ) : (
                <MeshDistortMaterial color={color} distort={0.4} speed={2} roughness={0.1} metalness={0.5} />
              )}
            </mesh>
          </Float>
        );

      case 5: // Architecture - Building
        return (
          <Float speed={1} rotationIntensity={0.2} floatIntensity={0.2}>
            {/* Main building */}
            <mesh position={[0, 0, 0]} scale={[1, 2, 1]}>
              <boxGeometry args={[1, 1, 1]} />
              {hasTexture ? (
                <meshStandardMaterial {...materialProps} map={texture} />
              ) : (
                <meshStandardMaterial color={color} {...materialProps} />
              )}
            </mesh>
            {/* Windows grid */}
            {[...Array(3)].map((_, i) => (
              <mesh key={i} position={[-0.51, -0.5 + i * 0.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[0.3, 0.3]} />
                <meshStandardMaterial color="#1a1a25" emissive="#6366f1" emissiveIntensity={0.3} />
              </mesh>
            ))}
            {/* Roof */}
            <mesh position={[0, 1.1, 0]} scale={[1.1, 0.1, 1.1]}>
              <boxGeometry args={[1, 0.1, 1]} />
              {hasTexture ? (
                <meshStandardMaterial {...materialProps} map={texture} />
              ) : (
                <meshStandardMaterial color={color} {...materialProps} />
              )}
            </mesh>
          </Float>
        );

      case 6: // Vehicle - Car shape
        return (
          <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.3}>
            {/* Car body */}
            <mesh position={[0, 0, 0]} scale={[1.8, 0.5, 0.8]}>
              <boxGeometry args={[1, 1, 1]} />
              {hasTexture ? (
                <meshStandardMaterial {...materialProps} map={texture} />
              ) : (
                <MeshDistortMaterial color={color} distort={0.1} speed={1.5} roughness={0.2} metalness={0.4} />
              )}
            </mesh>
            {/* Car top */}
            <mesh position={[0.2, 0.45, 0]} scale={[0.8, 0.4, 0.7]}>
              <boxGeometry args={[1, 1, 1]} />
              {hasTexture ? (
                <meshStandardMaterial {...materialProps} map={texture} />
              ) : (
                <meshStandardMaterial color={color} {...materialProps} />
              )}
            </mesh>
            {/* Wheels */}
            {[-0.5, 0.5].map((x) => (
              <group key={x}>
                <mesh position={[x, -0.25, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.2, 0.08, 16, 32]} />
                  <meshStandardMaterial color="#1a1a25" roughness={0.8} />
                </mesh>
                <mesh position={[x, -0.25, -0.45]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.2, 0.08, 16, 32]} />
                  <meshStandardMaterial color="#1a1a25" roughness={0.8} />
                </mesh>
              </group>
            ))}
          </Float>
        );

      default: // Default - Torus Knot
        return (
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh scale={1.5}>
              <torusKnotGeometry args={[0.6, 0.25, 128, 32]} />
              {hasTexture ? (
                <meshStandardMaterial {...materialProps} map={texture} />
              ) : (
                <MeshDistortMaterial color={color} distort={0.3} speed={2} roughness={0.2} metalness={0.8} />
              )}
            </mesh>
          </Float>
        );
    }
  };

  return <>{renderModel()}</>;
}

function ModelViewer({ modelType, imageUrl, color }: { modelType: number; imageUrl: string | null; color: string }) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="relative w-full h-full">
      <Canvas camera={{ position: [0, 0, 5 / zoom], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#6366f1" />
        <pointLight position={[5, 5, 5]} intensity={0.3} color="#f472b6" />
        <Model3D modelType={modelType} imageUrl={imageUrl} color={color} />
        <OrbitControls
          autoRotate={autoRotate}
          autoRotateSpeed={2}
          enableZoom={true}
          enablePan={false}
          minDistance={2}
          maxDistance={10}
        />
      </Canvas>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
          title={autoRotate ? "Pause rotation" : "Auto rotate"}
        >
          {autoRotate ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.5, 2))}
          className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.5, 0.5))}
          className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
          title="Reset view"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
}

function AnimatedOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="orb w-[600px] h-[600px] bg-primary/20 -top-40 -left-40 animate-pulse-glow" />
      <div className="orb w-[500px] h-[500px] bg-accent/15 top-1/2 -right-20 animate-pulse-glow" style={{ animationDelay: "1s" }} />
      <div className="orb w-[400px] h-[400px] bg-primary/10 bottom-0 left-1/3 animate-pulse-glow" style={{ animationDelay: "2s" }} />
    </div>
  );
}

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Box className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold font-[var(--font-outfit)]">Texture3D</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-text-secondary hover:text-text-primary transition-colors">Features</a>
          <a href="#how-it-works" className="text-text-secondary hover:text-text-primary transition-colors">How It Works</a>
          <a href="#gallery" className="text-text-secondary hover:text-text-primary transition-colors">Gallery</a>
          <a href="#pricing" className="text-text-secondary hover:text-text-primary transition-colors">Pricing</a>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <button className="px-5 py-2.5 rounded-full border border-border hover:border-primary transition-colors">
            Sign In
          </button>
          <button className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary-glow transition-colors font-medium">
            Get Started
          </button>
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-border"
          >
            <nav className="flex flex-col p-6 gap-4">
              <a href="#features" className="text-text-secondary hover:text-text-primary">Features</a>
              <a href="#how-it-works" className="text-text-secondary hover:text-text-primary">How It Works</a>
              <a href="#gallery" className="text-text-secondary hover:text-text-primary">Gallery</a>
              <a href="#pricing" className="text-text-secondary hover:text-text-primary">Pricing</a>
              <button className="w-full py-3 rounded-full bg-primary font-medium">Get Started</button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function SampleIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return <Icon className="w-6 h-6 text-white/90" />;
}

function SampleImages({
  onSelect,
  selectedId,
}: {
  onSelect: (sample: SampleImage) => void;
  selectedId: number | null;
}) {
  return (
    <div className="mt-6 w-full max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm text-text-secondary">Try sample images</span>
      </div>
      <div className="grid grid-cols-6 gap-3">
        {sampleImages.map((sample) => (
          <motion.button
            key={sample.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(sample);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`
              relative aspect-square rounded-xl overflow-hidden transition-all
              ${selectedId === sample.id
                ? "ring-2 ring-primary ring-offset-2 ring-offset-surface"
                : ""
              }
            `}
            title={`Convert ${sample.name} to 3D`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${sample.gradient}`} />
            <div className="absolute inset-0 flex items-center justify-center">
              <SampleIcon icon={sample.icon} />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/70 to-transparent">
              <p className="text-[9px] font-medium text-white truncate text-center">{sample.name}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function Hero() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedSample, setSelectedSample] = useState<SampleImage | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [textureUrl, setTextureUrl] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Check backend connection on mount
  useEffect(() => {
    checkBackendConnection();
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      setIsBackendConnected(response.ok);
    } catch {
      setIsBackendConnected(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      processImage(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processImage(file);
    }
  }, []);

  const processImage = async (file: File) => {
    // Prevent multiple uploads
    if (isProcessing) return;

    setApiError(null);
    setIsProcessing(true);
    setProgress(0);
    setStatusMessage("Uploading image...");

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setSelectedSample(null);
      setShowPreview(true);
    };
    reader.readAsDataURL(file);

    try {
      // Upload to backend
      const formData = new FormData();
      formData.append("file", file);

      const params = new URLSearchParams({
        remove_background: "true",
        texture_resolution: "1024",
      });

      const response = await fetch(`${API_BASE_URL}/api/upload?${params}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to upload image");
      }

      const job: JobStatus = await response.json();
      setJobId(job.job_id);
      setStatusMessage(job.message);

      // Poll for status
      pollJobStatus(job.job_id);
    } catch (error) {
      console.error("Upload error:", error);
      setApiError(error instanceof Error ? error.message : "Upload failed");
      setIsProcessing(false);
    }
  };

  const pollJobStatus = (id: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${id}`);
        if (!response.ok) throw new Error("Failed to get status");

        const job: JobStatus = await response.json();
        setProgress(job.progress);
        setStatusMessage(job.message);

        if (job.status === "completed") {
          clearInterval(pollingRef.current!);
          setIsProcessing(false);
          setDownloadUrl(`${API_BASE_URL}/api/download/${id}?format=glb`);
          if (job.output_texture_url) {
            setTextureUrl(`${API_BASE_URL}${job.output_texture_url}`);
          }
        } else if (job.status === "failed") {
          clearInterval(pollingRef.current!);
          setIsProcessing(false);
          setApiError(job.error || "Processing failed");
        }
      } catch (error) {
        console.error("Polling error:", error);
        clearInterval(pollingRef.current!);
        setApiError("Failed to get job status");
        setIsProcessing(false);
      }
    }, 1000);
  };

  const handleDownload = async (format: "obj" | "glb" | "stl" = "glb") => {
    if (!jobId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/download/${jobId}?format=${format}`
      );
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `model_${jobId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      setApiError("Failed to download model");
    }
  };

  const handleShare = async () => {
    if (!jobId) return;

    const shareUrl = `${window.location.origin}?job=${jobId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Texture3D AI Model",
          text: "Check out my 3D model!",
          url: shareUrl,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      setStatusMessage("Link copied to clipboard!");
    }
  };

  const handleSampleSelect = async (sample: SampleImage) => {
    // Use sample images from a placeholder service
    const sampleUrls = [
      "https://picsum.photos/seed/portrait/512/512",
      "https://picsum.photos/seed/landscape/512/512",
      "https://picsum.photos/seed/product/512/512",
      "https://picsum.photos/seed/abstract/512/512",
      "https://picsum.photos/seed/building/512/512",
      "https://picsum.photos/seed/car/512/512",
    ];

    const imageUrl = sampleUrls[sample.id - 1];

    try {
      // Fetch the image and convert to a file
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `sample_${sample.id}.jpg`, { type: "image/jpeg" });

      // Process the image
      setUploadedImage(imageUrl);
      setSelectedSample(sample);
      setShowPreview(true);
      setApiError(null);

      processImage(file);
    } catch (error) {
      console.error("Failed to load sample image:", error);
      setApiError("Failed to load sample image");
    }
  };

  const clearUpload = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    setUploadedImage(null);
    setSelectedSample(null);
    setShowPreview(false);
    setProgress(0);
    setStatusMessage("");
    setJobId(null);
    setDownloadUrl(null);
    setTextureUrl(null);
    setApiError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <section className="min-h-screen pt-20 relative flex items-center">
      <AnimatedOrbs />
      <div className="max-w-7xl mx-auto px-6 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border mb-6">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-sm">AI-Powered 3D Generation</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold leading-tight mb-6 font-[var(--font-outfit)]">
              Transform Images into{" "}
              <span className="text-gradient">Stunning 3D Models</span>
            </h1>

            <p className="text-lg text-text-secondary mb-8 max-w-xl">
              Upload any 2D image and watch as our AI instantly converts it into a detailed,
              textured 3D model. No expertise required.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <div className="flex items-center gap-2 text-text-secondary">
                <Check className="w-5 h-5 text-success" />
                <span>Instant Processing</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <Check className="w-5 h-5 text-success" />
                <span>High-Quality Textures</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <Check className="w-5 h-5 text-success" />
                <span>Export to Multiple Formats</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button className="px-8 py-4 rounded-full bg-primary hover:bg-primary-glow transition-all glow-primary font-medium flex items-center gap-2">
                Start Creating <ArrowRight className="w-5 h-5" />
              </button>
              <button className="px-8 py-4 rounded-full border border-border hover:border-primary transition-colors flex items-center gap-2">
                View Demo
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="gradient-border rounded-3xl overflow-hidden bg-surface/50">
              {!showPreview ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    h-[500px] flex flex-col items-center justify-center cursor-pointer
                    border-2 border-dashed rounded-3xl m-4 transition-all
                    ${isDragging
                      ? "border-primary bg-primary/10 scale-[1.02]"
                      : "border-border hover:border-primary/50"
                    }
                  `}
                >
                  <div onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }} className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                      <Upload className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-xl font-medium mb-2">Drop your image here</p>
                    <p className="text-text-secondary mb-6">or click to browse</p>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 rounded-full bg-surface-elevated text-xs text-text-secondary">PNG</span>
                      <span className="px-3 py-1 rounded-full bg-surface-elevated text-xs text-text-secondary">JPG</span>
                      <span className="px-3 py-1 rounded-full bg-surface-elevated text-xs text-text-secondary">WEBP</span>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <SampleImages onSelect={handleSampleSelect} selectedId={selectedSample?.id || null} />
                </div>
              ) : isProcessing ? (
                <div className="h-[500px] flex flex-col items-center justify-center p-8">
                  <div className="w-32 h-32 mb-8 relative">
                    <svg className="w-full h-full animate-spin-slow" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#2e2e3a"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${progress * 2.83} 283`}
                        transform="rotate(-90 50 50)"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#f472b6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    </div>
                  </div>
                  <p className="text-xl font-medium mb-2">Generating 3D Model...</p>
                  <p className="text-text-secondary mb-4">{statusMessage || "AI is analyzing your image"}</p>
                  <div className="w-64 h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-text-secondary mt-2">{progress}%</p>
                </div>
              ) : (
                <div className="h-[500px] relative">
                  <ModelViewer
                    modelType={selectedSample?.id || 0}
                    imageUrl={textureUrl || uploadedImage}
                    color={selectedSample?.color || "#6366f1"}
                  />

                  {/* Image Preview Panel */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <div className="p-2 rounded-lg glass border border-border">
                      {selectedSample ? (
                        <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${selectedSample.gradient} flex items-center justify-center`}>
                          <SampleIcon icon={selectedSample.icon} />
                        </div>
                      ) : uploadedImage ? (
                        <img
                          src={uploadedImage}
                          alt="Uploaded"
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : null}
                    </div>
                  </div>

                  {/* Clear/Reset Button */}
                  <button
                    onClick={clearUpload}
                    className="absolute top-4 left-4 p-2 rounded-lg glass border border-border hover:border-primary transition-colors"
                    title="Upload new image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Error Display */}
            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{apiError}</span>
              </motion.div>
            )}

            {/* Backend Connection Status */}
            {isBackendConnected === false && !showPreview && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 flex items-center gap-2 text-sm"
              >
                <WifiOff className="w-4 h-4" />
                <span>Backend not connected. Running in demo mode.</span>
              </motion.div>
            )}

            {showPreview && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-3"
              >
                <div className="relative group">
                  <button className="px-6 py-3 rounded-full bg-primary hover:bg-primary-glow transition-all flex items-center gap-2 font-medium">
                    <Download className="w-5 h-5" /> Download
                  </button>
                  {/* Format dropdown */}
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block">
                    <div className="glass border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleDownload("glb")}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-white/10"
                      >
                        GLB (Best for Web)
                      </button>
                      <button
                        onClick={() => handleDownload("obj")}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-white/10"
                      >
                        OBJ (Universal)
                      </button>
                      <button
                        onClick={() => handleDownload("stl")}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-white/10"
                      >
                        STL (3D Printing)
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleShare}
                  className="px-6 py-3 rounded-full glass border border-border hover:border-primary transition-all flex items-center gap-2"
                >
                  <Share2 className="w-5 h-5" /> Share
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Generate high-quality 3D models in seconds, not hours. Our AI processes images instantly.",
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "Your images are processed securely and never stored. Complete privacy guaranteed.",
    },
    {
      icon: Palette,
      title: "Smart Texturing",
      description: "AI automatically generates realistic textures that match your image perfectly.",
    },
    {
      icon: Clock,
      title: "24/7 Available",
      description: "Access our powerful 3D conversion tool anytime, anywhere. No appointments needed.",
    },
    {
      icon: Box,
      title: "Multiple Formats",
      description: "Export your 3D models in OBJ, STL, GLB, and FBX formats for any use case.",
    },
    {
      icon: Download,
      title: "High Resolution",
      description: "Get production-ready 3D models with 4K texture resolution for professional use.",
    },
  ];

  return (
    <section id="features" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 font-[var(--font-outfit)]">
            Powerful <span className="text-gradient">Features</span>
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Everything you need to transform your 2D images into professional 3D models
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-8 rounded-3xl glass border border-border hover:border-primary/50 transition-all hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-text-secondary">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Upload Your Image",
      description: "Simply drag and drop any 2D image or click to browse. Supports PNG, JPG, and WEBP formats.",
    },
    {
      number: "02",
      title: "AI Processing",
      description: "Our advanced AI analyzes your image and generates a detailed 3D model with realistic textures.",
    },
    {
      number: "03",
      title: "Download & Use",
      description: "Export your 3D model in multiple formats ready for games, animations, or 3D printing.",
    },
  ];

  return (
    <section id="how-it-works" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 font-[var(--font-outfit)]">
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Transform any image into a 3D model in just three simple steps
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="relative"
            >
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-primary to-transparent z-0" />
              )}
              <div className="relative p-8 rounded-3xl glass border border-border">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6">
                  <span className="text-2xl font-bold">{step.number}</span>
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-text-secondary">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  const galleryItems = [
    { title: "Character Bust", category: "Portrait", color: "from-pink-500 to-rose-500" },
    { title: "Landscape", category: "Environment", color: "from-green-500 to-emerald-500" },
    { title: "Product Shot", category: "Commercial", color: "from-blue-500 to-cyan-500" },
    { title: "Abstract Art", category: "Creative", color: "from-purple-500 to-violet-500" },
    { title: "Architecture", category: "Interior", color: "from-amber-500 to-yellow-500" },
    { title: "Nature", category: "Wildlife", color: "from-teal-500 to-green-500" },
  ];

  return (
    <section id="gallery" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 font-[var(--font-outfit)]">
            Featured <span className="text-gradient">Gallery</span>
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Explore amazing 3D models created by our community
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative aspect-square rounded-3xl overflow-hidden cursor-pointer"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-20 group-hover:opacity-40 transition-opacity`} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Box className="w-12 h-12 text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-sm text-text-secondary mb-1">{item.category}</p>
                <h3 className="text-xl font-bold">{item.title}</h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "Free",
      period: "forever",
      description: "Perfect for trying out the technology",
      features: [
        "5 conversions per month",
        "Standard resolution",
        "Basic support",
        "OBJ export only",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Pro",
      price: "$29",
      period: "per month",
      description: "For professionals and creators",
      features: [
        "Unlimited conversions",
        "4K texture resolution",
        "Priority support",
        "All export formats",
        "Commercial license",
        "API access",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact us",
      description: "For large organizations",
      features: [
        "Everything in Pro",
        "Custom models",
        "Dedicated support",
        "SLA guarantee",
        "On-premise option",
        "Custom integrations",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 font-[var(--font-outfit)]">
            Simple <span className="text-gradient">Pricing</span>
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Choose the plan that fits your needs
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-8 rounded-3xl glass border ${
                plan.popular ? "border-primary glow-primary" : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-sm font-medium">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="text-text-secondary text-sm mb-4">{plan.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-text-secondary ml-2">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-text-secondary">
                    <Check className="w-5 h-5 text-success flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-4 rounded-full font-medium transition-all ${
                  plan.popular
                    ? "bg-primary hover:bg-primary-glow"
                    : "border border-border hover:border-primary"
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-16 border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Box className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold font-[var(--font-outfit)]">Texture3D</span>
            </div>
            <p className="text-text-secondary">
              Transform any 2D image into a detailed textured 3D model instantly with AI.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-3 text-text-secondary">
              <li><a href="#features" className="hover:text-text-primary transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-text-primary transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-text-primary transition-colors">API</a></li>
              <li><a href="#" className="hover:text-text-primary transition-colors">Integrations</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-3 text-text-secondary">
              <li><a href="#" className="hover:text-text-primary transition-colors">About</a></li>
              <li><a href="#" className="hover:text-text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-text-primary transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-3 text-text-secondary">
              <li><a href="#" className="hover:text-text-primary transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-text-primary transition-colors">Terms</a></li>
              <li><a href="#" className="hover:text-text-primary transition-colors">Security</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-text-secondary">
            © 2026 Texture3D AI. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="p-2 rounded-full glass hover:bg-white/10 transition-colors">
              <Star className="w-5 h-5" />
            </a>
            <a href="#" className="p-2 rounded-full glass hover:bg-white/10 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
              </svg>
            </a>
            <a href="#" className="p-2 rounded-full glass hover:bg-white/10 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-bg-dark">
      <Header />
      <Hero />
      <Features />
      <HowItWorks />
      <Gallery />
      <Pricing />
      <Footer />
    </main>
  );
}
