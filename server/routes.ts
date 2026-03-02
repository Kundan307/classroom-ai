import type { Express } from "express";
import { createServer, type Server } from "http";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { createSessionSchema, addSnapshotSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/sessions", async (_req, res) => {
    const sessions = await storage.getSessions();
    res.json(sessions);
  });

  app.get("/api/sessions/:id", async (req, res) => {
    const session = await storage.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json(session);
  });

  app.post("/api/sessions", async (req, res) => {
    const parsed = createSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const session = await storage.createSession(parsed.data);
    res.status(201).json(session);
  });

  app.patch("/api/sessions/:id/end", async (req, res) => {
    const session = await storage.endSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json(session);
  });

  app.post("/api/sessions/:id/snapshots", async (req, res) => {
    const parsed = addSnapshotSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    await storage.addSnapshot(req.params.id, parsed.data);
    res.status(201).json({ success: true });
  });

  app.get("/api/download-codebase", (_req, res) => {
    try {
      const archivePath = path.join(process.cwd(), "classroom-ai-codebase.tar.gz");
      execSync(
        `tar czf ${archivePath} --exclude='node_modules' --exclude='.git' --exclude='.cache' --exclude='.local' --exclude='.config' --exclude='.upm' --exclude='.breakpoints' --exclude='classroom-ai-codebase.tar.gz' -C ${process.cwd()} .`
      );
      res.setHeader("Content-Type", "application/gzip");
      res.setHeader("Content-Disposition", "attachment; filename=classroom-ai-codebase.tar.gz");
      const stream = fs.createReadStream(archivePath);
      stream.pipe(res);
      stream.on("end", () => {
        fs.unlinkSync(archivePath);
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to create archive" });
    }
  });

  return httpServer;
}