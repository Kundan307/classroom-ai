import { z } from "zod";

export const behaviorTypes = ["Attentive", "Engaged", "Confused", "Distracted", "Drowsy", "Present"] as const;
export type BehaviorType = (typeof behaviorTypes)[number];

export const studentDetectionSchema = z.object({
  id: z.number(),
  box: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  behavior: z.enum(behaviorTypes),
  confidence: z.number(),
  age: z.number(),
  gender: z.string(),
  expressions: z.record(z.number()),
});

export type StudentDetection = z.infer<typeof studentDetectionSchema>;

export const detectionSnapshotSchema = z.object({
  timestamp: z.number(),
  studentCount: z.number(),
  attentionScore: z.number(),
  behaviors: z.record(z.number()),
});

export type DetectionSnapshot = z.infer<typeof detectionSnapshotSchema>;

export const sessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  startedAt: z.number(),
  endedAt: z.number().optional(),
  peakStudentCount: z.number(),
  avgAttentionScore: z.number(),
  snapshots: z.array(detectionSnapshotSchema),
});

export type Session = z.infer<typeof sessionSchema>;

export const createSessionSchema = z.object({
  name: z.string().min(1).max(100),
});

export type CreateSession = z.infer<typeof createSessionSchema>;

export const addSnapshotSchema = detectionSnapshotSchema;
export type AddSnapshot = z.infer<typeof addSnapshotSchema>;

export const BEHAVIOR_COLORS: Record<BehaviorType, string> = {
  Attentive: "#facc15",
  Engaged: "#22d3ee",
  Confused: "#f97316",
  Distracted: "#f43f5e",
  Drowsy: "#ef4444",
  Present: "#a78bfa",
};

export const BEHAVIOR_ICONS: Record<BehaviorType, string> = {
  Attentive: "focus",
  Engaged: "smile",
  Confused: "help-circle",
  Distracted: "eye-off",
  Drowsy: "moon",
  Present: "user",
};