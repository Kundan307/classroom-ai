import { useMemo } from "react";
import type { StudentDetection, BehaviorType } from "@shared/schema";
import { BEHAVIOR_COLORS } from "@shared/schema";
import {
  Users,
  Brain,
  TrendingUp,
  Eye,
  Smile,
  HelpCircle,
  EyeOff,
  Moon,
  User,
} from "lucide-react";

interface StatsOverlayProps {
  students: StudentDetection[];
  attentionScore: number;
  isActive: boolean;
}

const behaviorIcons: Record<BehaviorType, typeof Eye> = {
  Attentive: Eye,
  Engaged: Smile,
  Confused: HelpCircle,
  Distracted: EyeOff,
  Drowsy: Moon,
  Present: User,
};

export function StatsOverlay({ students, attentionScore, isActive }: StatsOverlayProps) {
  const behaviorCounts = useMemo(() => {
    const counts: Record<BehaviorType, number> = {
      Attentive: 0,
      Engaged: 0,
      Confused: 0,
      Distracted: 0,
      Drowsy: 0,
      Present: 0,
    };
    students.forEach((s) => {
      counts[s.behavior]++;
    });
    return counts;
  }, [students]);

  const totalStudents = students.length;
  const scoreColor =
    attentionScore >= 70
      ? "text-behavior-attentive"
      : attentionScore >= 40
      ? "text-behavior-confused"
      : "text-behavior-drowsy";

  if (!isActive) return null;

  return (
    <>
      <div
        className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap gap-2"
        data-testid="stats-overlay"
      >
        <GlassCard data-testid="stat-student-count">
          <Users className="w-4 h-4 text-primary" />
          <div>
            <span className="text-lg font-bold text-white leading-none">
              {totalStudents}
            </span>
            <span className="text-[10px] text-white/60 ml-1.5 uppercase tracking-wider">
              Students
            </span>
          </div>
        </GlassCard>

        <GlassCard data-testid="stat-attention-score">
          <Brain className={`w-4 h-4 ${scoreColor}`} />
          <div>
            <span className={`text-lg font-bold leading-none ${scoreColor}`}>
              {attentionScore}%
            </span>
            <span className="text-[10px] text-white/60 ml-1.5 uppercase tracking-wider">
              Attention
            </span>
          </div>
        </GlassCard>

        <GlassCard data-testid="stat-trending">
          <TrendingUp className="w-4 h-4 text-chart-2" />
          <div>
            <span className="text-lg font-bold text-white leading-none">
              {totalStudents > 0
                ? Math.round(
                    ((behaviorCounts.Attentive + behaviorCounts.Engaged) /
                      totalStudents) *
                      100
                  )
                : 0}
              %
            </span>
            <span className="text-[10px] text-white/60 ml-1.5 uppercase tracking-wider">
              Engaged
            </span>
          </div>
        </GlassCard>
      </div>

      <div
        className="absolute top-3 right-3 z-10 flex flex-col gap-1.5"
        data-testid="behavior-breakdown-overlay"
      >
        {(Object.entries(behaviorCounts) as [BehaviorType, number][])
          .filter(([, count]) => count > 0)
          .map(([behavior, count]) => {
            const Icon = behaviorIcons[behavior];
            return (
              <div
                key={behavior}
                className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-md border border-white/10"
                data-testid={`behavior-badge-${behavior.toLowerCase()}`}
              >
                <Icon
                  className="w-3.5 h-3.5"
                  style={{ color: BEHAVIOR_COLORS[behavior] }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: BEHAVIOR_COLORS[behavior] }}
                >
                  {count}
                </span>
                <span className="text-[10px] text-white/50">{behavior}</span>
              </div>
            );
          })}
      </div>
    </>
  );
}

function GlassCard({
  children,
  ...props
}: {
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-black/50 backdrop-blur-md border border-white/10"
      {...props}
    >
      {children}
    </div>
  );
}