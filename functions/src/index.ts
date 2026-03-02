import cors from "cors";
import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { healthRouter } from "./routes/health";
import { tasksRouter } from "./routes/tasks";
import { authenticateRequest } from "./middleware/auth";

setGlobalOptions({
  region: "us-central1",
  maxInstances: 10
});

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.use("/health", healthRouter);
app.use("/tasks", authenticateRequest, tasksRouter);

export const api = onRequest(app);
