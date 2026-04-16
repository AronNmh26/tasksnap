import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { tasksRouter } from "./routes/tasks";
import { authenticateRequest } from "./middleware/auth";

export function createApp() {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/tasks", authenticateRequest, tasksRouter);

  return app;
}
