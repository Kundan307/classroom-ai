import { useState, useCallback, useRef, useEffect } from "react";
import { CameraFeed } from "@/components/camera-feed";
import { StatsOverlay } from "@/components/stats-overlay";
import { AnalyticsPanel } from "@/components/analytics-panel";
import { useTheme } from "@/components/theme-provider";
import { computeAttentionScore, computeBehaviorDistribution } from "@/lib/face-detection";
import type { StudentDetection, DetectionSnapshot } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
  Play,
  Square,
  Sun,
  Moon,
  Monitor,
  BarChart3,
  Maximize2,
  Minimize2,
  Download,
  RotateCcw,
  Scan,
  Zap,
  Shield,
  Users,
  Cpu,
} from "lucide-react";

type Tab = "monitor" | "analytics";

export default function HomePage() {
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("monitor");
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<"idle" | "loading" | "active" | "error">("idle");
  const [students, setStudents] = useState<StudentDetection[]>([]);
  const [attentionScore, setAttentionScore] = useState(0);
  const [snapshots, setSnapshots] = useState<DetectionSnapshot[]>([]);
  const [sessionStart, setSessionStart] = useState<number>(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [peakStudentCount, setPeakStudentCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const cameraContainerRef = useRef<HTMLDivElement>(null);
  const durationIntervalRef = useRef<number>(0);

  const handleDetection = useCallback((detectedStudents: StudentDetection[]) => {
    setStudents(detectedStudents);
    const score = computeAttentionScore(detectedStudents);
    setAttentionScore(score);
    setPeakStudentCount((prev) => Math.max(prev, detectedStudents.length));

    const snapshot: DetectionSnapshot = {
      timestamp: Date.now(),
      studentCount: detectedStudents.length,
      attentionScore: score,
      behaviors: computeBehaviorDistribution(detectedStudents),
    };

    setSnapshots((prev) => {
      const updated = [...prev, snapshot];
      return updated.length > 300 ? updated.slice(-300) : updated;
    });
  }, []);

  const handleStatusChange = useCallback(
    (status: "idle" | "loading" | "active" | "error") => {
      setCameraStatus(status);
    },
    []
  );

  const startMonitoring = () => {
    setIsMonitoring(true);
    setSessionStart(Date.now());
    setSnapshots([]);
    setPeakStudentCount(0);
    setActiveTab("monitor");
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    setCameraStatus("idle");
    setStudents([]);
    setAttentionScore(0);
  };

  const toggleFullscreen = async () => {
    if (!cameraContainerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await cameraContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {}
  };

  const exportData = () => {
    const data = {
      sessionStart,
      sessionDuration,
      peakStudentCount,
      avgAttention,
      snapshots,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `classroom-session-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (isMonitoring && cameraStatus === "active") {
      durationIntervalRef.current = window.setInterval(() => {
        setSessionDuration(Date.now() - sessionStart);
      }, 1000);
    } else {
      clearInterval(durationIntervalRef.current);
    }
    return () => clearInterval(durationIntervalRef.current);
  }, [isMonitoring, cameraStatus, sessionStart]);

  useEffect(() => {
    const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  const avgAttention = snapshots.length > 0
    ? Math.round(snapshots.reduce((a, s) => a + s.attentionScore, 0) / snapshots.length)
    : 0;

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <header className="relative z-20 border-b border-border">
        <div className="flex items-center justify-between gap-2 px-4 h-14">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setLocation("/"); setActiveTab("monitor"); }}
              className="flex items-center gap-2.5 group"
              data-testid="link-home"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <Scan className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight leading-none text-foreground font-mono">
                  ClassroomAI
                </span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5 hidden sm:block font-mono">
                  v2.0 · Neural Monitor
                </span>
              </div>
            </button>

            <div className="h-6 w-px bg-border hidden sm:block" />

            <nav className="hidden sm:flex items-center gap-1" data-testid="nav-tabs">
              <button
                onClick={() => setActiveTab("monitor")}
                className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium transition-all ${
                  activeTab === "monitor"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
                data-testid="tab-monitor"
              >
                <Monitor className="w-3.5 h-3.5" />
                Live Monitor
                {activeTab === "monitor" && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium transition-all ${
                  activeTab === "analytics"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
                data-testid="tab-analytics"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Analytics
                {activeTab === "analytics" && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {isMonitoring && cameraStatus === "active" && (
              <>
                <div className="hidden md:flex items-center gap-2 mr-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/40">
                    <Users className="w-3 h-3" />
                    <span className="font-mono font-semibold text-foreground">{students.length}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/40">
                    <span className="font-mono">{formatDuration(sessionDuration)}</span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="hidden sm:flex border-primary/30 bg-primary/5"
                  data-testid="badge-session-active"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow mr-1.5" />
                  <span className="text-primary">Live</span>
                </Badge>
              </>
            )}

            {!isMonitoring ? (
              <Button size="sm" onClick={startMonitoring} data-testid="button-start-monitoring">
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Start
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={stopMonitoring} data-testid="button-stop-monitoring">
                <Square className="w-3.5 h-3.5 mr-1.5" />
                Stop
              </Button>
            )}

            {snapshots.length > 0 && (
              <Button size="icon" variant="ghost" onClick={exportData} data-testid="button-export">
                <Download className="w-4 h-4" />
              </Button>
            )}

            <div className="h-5 w-px bg-border" />

            <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme-toggle">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="sm:hidden flex items-center px-3 pb-2 gap-1">
          <button
            onClick={() => setActiveTab("monitor")}
            className={`relative flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all flex-1 ${
              activeTab === "monitor"
                ? "bg-muted text-foreground"
                : "text-muted-foreground"
            }`}
            data-testid="tab-monitor-mobile"
          >
            <Monitor className="w-3.5 h-3.5" />
            Monitor
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`relative flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all flex-1 ${
              activeTab === "analytics"
                ? "bg-muted text-foreground"
                : "text-muted-foreground"
            }`}
            data-testid="tab-analytics-mobile"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Analytics
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {activeTab === "monitor" && (
          <div className="flex flex-col h-full">
            <div
              ref={cameraContainerRef}
              className="relative flex-1 min-h-0 bg-black"
              data-testid="camera-section"
            >
              <CameraFeed
                isActive={isMonitoring}
                onDetection={handleDetection}
                onStatusChange={handleStatusChange}
              />
              <StatsOverlay
                students={students}
                attentionScore={attentionScore}
                isActive={cameraStatus === "active"}
              />

              {cameraStatus === "active" && (
                <div className="absolute top-3 right-3 z-10">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="bg-black/40 backdrop-blur-md border border-white/10 text-white"
                    onClick={toggleFullscreen}
                    data-testid="button-fullscreen"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                </div>
              )}

              {!isMonitoring && snapshots.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-background z-10">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-center">
                      <Scan className="w-12 h-12 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-primary/40 rounded-tl" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-primary/40 rounded-tr" />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-primary/40 rounded-bl" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-primary/40 rounded-br" />
                  </div>
                  <div className="text-center max-w-lg px-4">
                    <h2 className="text-2xl font-bold text-foreground mb-2 font-mono tracking-tight">
                      Neural Classroom Monitor
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Dual-model AI vision pipeline — face landmarks for expression analysis, COCO-SSD for full-body person tracking. All processing runs locally in WebGL.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg px-4">
                    {[
                      { icon: Scan, label: "Face Analysis", desc: "68-point landmarks", color: "text-cyber-cyan" },
                      { icon: Users, label: "Body Tracking", desc: "COCO-SSD model", color: "text-cyber-violet" },
                      { icon: Cpu, label: "WebGL Compute", desc: "Real-time inference", color: "text-cyber-yellow" },
                      { icon: Shield, label: "Edge Processing", desc: "Zero cloud upload", color: "text-cyber-green" },
                    ].map((feature) => (
                      <div
                        key={feature.label}
                        className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <feature.icon className={`w-5 h-5 ${feature.color}`} />
                        <div className="text-center">
                          <span className="text-xs font-medium text-foreground block font-mono">{feature.label}</span>
                          <span className="text-[10px] text-muted-foreground">{feature.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button size="lg" onClick={startMonitoring} className="mt-1 font-mono" data-testid="button-start-hero">
                    <Play className="w-4 h-4 mr-2" />
                    Initialize Monitor
                  </Button>
                </div>
              )}

              {!isMonitoring && snapshots.length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/95 z-10">
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-foreground mb-1">Session Ended</h3>
                    <p className="text-sm text-muted-foreground">
                      {snapshots.length} snapshots captured over {Math.round(sessionDuration / 1000)}s
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={startMonitoring} data-testid="button-restart">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      New Session
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("analytics")} data-testid="button-view-analytics">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Analytics
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="p-4 max-w-6xl mx-auto">
            {snapshots.length > 0 ? (
              <AnalyticsPanel
                snapshots={snapshots}
                sessionDuration={sessionDuration}
                currentStudentCount={students.length}
                peakStudentCount={peakStudentCount}
                avgAttention={avgAttention}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-1">No Analytics Data</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Start a monitoring session to begin collecting analytics data. Real-time charts and insights will appear here.
                  </p>
                </div>
                <Button onClick={startMonitoring} data-testid="button-start-analytics">
                  <Play className="w-4 h-4 mr-2" />
                  Start Monitoring
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}