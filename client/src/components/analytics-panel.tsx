import { useMemo } from "react";
import type { DetectionSnapshot, BehaviorType } from "@shared/schema";
import { BEHAVIOR_COLORS } from "@shared/schema";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  Brain,
  TrendingUp,
  Clock,
  Eye,
  Smile,
  HelpCircle,
  EyeOff,
  Moon,
  User,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AnalyticsPanelProps {
  snapshots: DetectionSnapshot[];
  sessionDuration: number;
  currentStudentCount: number;
  peakStudentCount: number;
  avgAttention: number;
}

const behaviorIcons: Record<BehaviorType, typeof Eye> = {
  Attentive: Eye,
  Engaged: Smile,
  Confused: HelpCircle,
  Distracted: EyeOff,
  Drowsy: Moon,
  Present: User,
};

export function AnalyticsPanel({
  snapshots,
  sessionDuration,
  currentStudentCount,
  peakStudentCount,
  avgAttention,
}: AnalyticsPanelProps) {
  const timelineData = useMemo(() => {
    const recent = snapshots.slice(-60);
    return recent.map((s, i) => ({
      time: i,
      students: s.studentCount,
      attention: s.attentionScore,
    }));
  }, [snapshots]);

  const behaviorData = useMemo(() => {
    if (snapshots.length === 0) return [];
    const last = snapshots[snapshots.length - 1];
    if (!last?.behaviors) return [];

    return Object.entries(last.behaviors)
      .filter(([, count]) => count > 0)
      .map(([name, value]) => ({
        name,
        value,
        color: BEHAVIOR_COLORS[name as BehaviorType] || "#666",
      }));
  }, [snapshots]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const attentionColor =
    avgAttention >= 70
      ? "text-behavior-attentive"
      : avgAttention >= 40
      ? "text-behavior-confused"
      : "text-behavior-drowsy";

  return (
    <div
      className="w-full space-y-4 animate-fade-in"
      data-testid="analytics-panel"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          icon={<Users className="w-4 h-4" />}
          label="Current"
          value={currentStudentCount.toString()}
          color="text-primary"
          testId="metric-current"
        />
        <MetricCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Peak"
          value={peakStudentCount.toString()}
          color="text-chart-2"
          testId="metric-peak"
        />
        <MetricCard
          icon={<Brain className="w-4 h-4" />}
          label="Avg Attention"
          value={`${avgAttention}%`}
          color={attentionColor}
          testId="metric-attention"
        />
        <MetricCard
          icon={<Clock className="w-4 h-4" />}
          label="Duration"
          value={formatDuration(sessionDuration)}
          color="text-muted-foreground"
          testId="metric-duration"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="md:col-span-2 bg-card/80 border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Student Count & Attention Timeline
              </span>
            </div>
            <div className="h-36" data-testid="chart-timeline">
              {timelineData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="studentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="attentionGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#facc15" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#facc15" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={[0, "auto"]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(220, 6%, 10%)",
                        border: "1px solid hsl(220, 5%, 18%)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        color: "#fff",
                      }}
                      labelFormatter={() => ""}
                    />
                    <Area
                      type="monotone"
                      dataKey="students"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      fill="url(#studentGrad)"
                      name="Students"
                    />
                    <Area
                      type="monotone"
                      dataKey="attention"
                      stroke="#facc15"
                      strokeWidth={1.5}
                      fill="url(#attentionGrad)"
                      name="Attention %"
                      strokeDasharray="4 2"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                  Collecting data...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Behavior Distribution
              </span>
            </div>
            <div className="flex items-center gap-4" data-testid="chart-behaviors">
              {behaviorData.length > 0 ? (
                <>
                  <div className="w-24 h-24 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={behaviorData}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={40}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {behaviorData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    {behaviorData.map(({ name, value, color }) => {
                      const Icon = behaviorIcons[name as BehaviorType];
                      return (
                        <div
                          key={name}
                          className="flex items-center gap-2"
                          data-testid={`behavior-stat-${name.toLowerCase()}`}
                        >
                          <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
                          <span className="text-xs text-foreground truncate flex-1">
                            {name}
                          </span>
                          <span
                            className="text-xs font-semibold"
                            style={{ color }}
                          >
                            {value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="w-full h-24 flex items-center justify-center text-muted-foreground text-xs">
                  No data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  testId: string;
}) {
  return (
    <Card className="bg-card/80 border-card-border" data-testid={testId}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`${color}`}>{icon}</div>
        <div>
          <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}