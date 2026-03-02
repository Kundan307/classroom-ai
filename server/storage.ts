import type { Session, CreateSession, DetectionSnapshot } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getSessions(): Promise<Session[]>;
  getSession(id: string): Promise<Session | undefined>;
  createSession(data: CreateSession): Promise<Session>;
  endSession(id: string): Promise<Session | undefined>;
  addSnapshot(sessionId: string, snapshot: DetectionSnapshot): Promise<void>;
}

export class MemStorage implements IStorage {
  private sessions: Map<string, Session>;

  constructor() {
    this.sessions = new Map();
  }

  async getSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values()).sort(
      (a, b) => b.startedAt - a.startedAt
    );
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async createSession(data: CreateSession): Promise<Session> {
    const id = randomUUID();
    const session: Session = {
      id,
      name: data.name,
      startedAt: Date.now(),
      peakStudentCount: 0,
      avgAttentionScore: 0,
      snapshots: [],
    };
    this.sessions.set(id, session);
    return session;
  }

  async endSession(id: string): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    session.endedAt = Date.now();

    if (session.snapshots.length > 0) {
      session.avgAttentionScore = Math.round(
        session.snapshots.reduce((a, s) => a + s.attentionScore, 0) /
          session.snapshots.length
      );
      session.peakStudentCount = Math.max(
        ...session.snapshots.map((s) => s.studentCount)
      );
    }

    this.sessions.set(id, session);
    return session;
  }

  async addSnapshot(
    sessionId: string,
    snapshot: DetectionSnapshot
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.snapshots.push(snapshot);

    if (snapshot.studentCount > session.peakStudentCount) {
      session.peakStudentCount = snapshot.studentCount;
    }

    this.sessions.set(sessionId, session);
  }
}

export const storage = new MemStorage();