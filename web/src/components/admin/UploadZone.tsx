import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image as ImageIcon, X, Sparkles, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UploadZoneProps {
  onImageUpload: (file: File, preview: string) => void;
  uploadedImage: string | null;
  onClear: () => void;
}

export const UploadZone = ({ onImageUpload, uploadedImage, onClear }: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      const preview = URL.createObjectURL(file);
      onImageUpload(file, preview);
    }
  }, [onImageUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      onImageUpload(file, preview);
    }
  }, [onImageUpload]);

  const startCamera = async () => {
    try {
      setShowCamera(true);
      setCameraReady(false);

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
        await videoRef.current.play();
      }
      streamRef.current = stream;
    } catch (err) {
      console.error('Camera error:', err);
      setShowCamera(false);
      alert('Camera permission denied or unavailable.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCameraReady(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (width === 0 || height === 0) {
      alert('Camera not ready yet. Please wait.');
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const preview = URL.createObjectURL(blob);
      onImageUpload(file, preview);
      stopCamera();
    }, 'image/jpeg', 0.92);
  };

  // Camera View
  if (showCamera) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border-2 border-primary/50"
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Initializing camera...</p>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={stopCamera}
            className="bg-background/80 backdrop-blur-sm"
          >
            <X className="w-5 h-5 mr-2" />
            Cancel
          </Button>
          <Button
            variant="gold"
            size="lg"
            onClick={capturePhoto}
            disabled={!cameraReady}
            className="min-w-[140px]"
          >
            <Camera className="w-5 h-5 mr-2" />
            {cameraReady ? 'Capture' : 'Wait...'}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {!uploadedImage ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative flex flex-col items-center justify-center w-full aspect-[4/3] rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300",
                isDragging
                  ? "border-primary bg-primary/5 shadow-glow"
                  : "border-border hover:border-primary/50 hover:bg-surface-hover/50"
              )}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <motion.div
                animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                className="flex flex-col items-center text-center p-8"
              >
                <motion.div
                  animate={isDragging ? { y: -10 } : { y: 0 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={cn(
                    "w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-colors",
                    isDragging ? "bg-primary/20" : "bg-muted"
                  )}
                >
                  <Upload className={cn(
                    "w-10 h-10 transition-colors",
                    isDragging ? "text-primary" : "text-muted-foreground"
                  )} />
                </motion.div>

                <h3 className="font-display text-xl text-foreground mb-2">
                  Upload Artwork
                </h3>
                <p className="text-muted-foreground mb-4">
                  Drag and drop your artwork here, or click to browse
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ImageIcon className="w-4 h-4" />
                  <span>PNG, JPG, WEBP up to 50MB</span>
                </div>
              </motion.div>

              {/* Decorative corners */}
              <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary/30 rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary/30 rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary/30 rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-primary/30 rounded-br-lg" />
            </label>

            {/* Camera Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="lg"
                onClick={startCamera}
                className="gap-2"
              >
                <Camera className="w-5 h-5" />
                Use Camera
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-card border border-border"
          >
            <img
              src={uploadedImage}
              alt="Uploaded artwork"
              className="w-full h-full object-contain bg-background/50"
            />

            {/* Clear button */}
            <button
              onClick={onClear}
              className="absolute top-4 right-4 p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-destructive hover:border-destructive hover:text-destructive-foreground transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Info badge */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm border border-border">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Ready for AI Analysis</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
