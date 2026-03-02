import { useRef, useEffect, useState, useCallback } from "react";
import {
  loadModels,
  detectFaces,
  detectPersons,
  mergeDetections,
  drawDetections,
  isModelsLoaded,
} from "@/lib/face-detection";
import type { StudentDetection } from "@shared/schema";
import { Loader2, Camera, CameraOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraFeedProps {
  isActive: boolean;
  onDetection: (students: StudentDetection[]) => void;
  onStatusChange: (status: "idle" | "loading" | "active" | "error") => void;
  mirrored?: boolean;
}

export function CameraFeed({
  isActive,
  onDetection,
  onStatusChange,
  mirrored = true,
}: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "active" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [videoDimensions, setVideoDimensions] = useState({ width: 1280, height: 720 });
  const detectionLoopRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const updateStatus = useCallback(
    (s: "idle" | "loading" | "active" | "error") => {
      setStatus(s);
      onStatusChange(s);
    },
    [onStatusChange]
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!isActive) return;

      updateStatus("loading");

      try {
        await loadModels();
        if (cancelled) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          const vw = videoRef.current.videoWidth;
          const vh = videoRef.current.videoHeight;
          setVideoDimensions({ width: vw, height: vh });

          if (canvasRef.current) {
            canvasRef.current.width = vw;
            canvasRef.current.height = vh;
          }
        }

        updateStatus("active");
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(
            err?.name === "NotAllowedError"
              ? "Camera access was denied. Please allow camera permissions and try again."
              : err?.name === "NotFoundError"
              ? "No camera found. Please connect a camera and try again."
              : "Failed to initialize camera or AI models. Please try again."
          );
          updateStatus("error");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isActive, updateStatus]);

  useEffect(() => {
    if (status !== "active" || !isActive) return;

    let running = true;

    async function loop() {
      if (!running || !videoRef.current || !canvasRef.current) return;
      if (!isModelsLoaded()) return;

      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
        if (running) {
          detectionLoopRef.current = window.setTimeout(loop, 300);
        }
        return;
      }

      const [faceResults, personResults] = await Promise.all([
        detectFaces(video),
        detectPersons(video),
      ]);
      if (!running) return;

      const students = mergeDetections(faceResults, personResults);

      const canvas = canvasRef.current;
      if (canvas) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const scaleX = canvas.width / video.videoWidth;
          const scaleY = canvas.height / video.videoHeight;
          drawDetections(ctx, students, scaleX, scaleY, mirrored);
        }
      }

      onDetection(students);

      if (running) {
        detectionLoopRef.current = window.setTimeout(loop, 200);
      }
    }

    loop();

    return () => {
      running = false;
      clearTimeout(detectionLoopRef.current);
    };
  }, [status, isActive, onDetection, videoDimensions]);

  const mirrorStyle = mirrored ? { transform: "scaleX(-1)" } : {};

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black rounded-lg overflow-hidden"
      data-testid="camera-container"
    >
      {status === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Camera className="w-10 h-10 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">
            Camera will activate when monitoring starts
          </p>
        </div>
      )}

      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-black/80">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-primary/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="absolute -inset-2 rounded-full border border-primary/10 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-foreground font-medium text-sm">Initializing AI Models</p>
            <p className="text-muted-foreground text-xs mt-1">
              Loading face detection, landmarks & expression models...
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-black/80">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div className="text-center max-w-sm px-4">
            <p className="text-foreground font-medium text-sm">Camera Error</p>
            <p className="text-muted-foreground text-xs mt-1">{errorMsg}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
            data-testid="button-retry-camera"
          >
            <CameraOff className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        style={mirrorStyle}
        muted
        playsInline
        data-testid="camera-video"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          objectFit: "contain",
        }}
        data-testid="camera-canvas"
      />

      {status === "active" && (
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-md border border-white/10">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse-glow" />
            <span className="text-white text-xs font-medium tracking-wide">LIVE</span>
          </div>
        </div>
      )}
    </div>
  );
}