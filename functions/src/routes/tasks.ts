import { Router } from "express";
import {
  createTask,
  deleteTask,
  getUserTaskById,
  listUserTasks,
  upsertTaskById
} from "../services/tasksService";

export const tasksRouter = Router();

tasksRouter.get("/", async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const tasks = await listUserTasks(userId);
    res.status(200).json({ data: tasks });
  } catch (error) {
    console.error("List tasks failed", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

tasksRouter.get("/:id", async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const task = await getUserTaskById(userId, req.params.id);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.status(200).json({ data: task });
  } catch (error) {
    console.error("Get task failed", error);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

tasksRouter.post("/", async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const task = await createTask(userId, req.body ?? {});
    res.status(201).json({ data: task });
  } catch (error) {
    console.error("Create task failed", error);
    res.status(400).json({ error: (error as Error).message || "Failed to create task" });
  }
});

tasksRouter.put("/:id", async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const task = await upsertTaskById(userId, req.params.id, req.body ?? {});
    res.status(200).json({ data: task });
  } catch (error) {
    console.error("Upsert task failed", error);
    res.status(400).json({ error: (error as Error).message || "Failed to upsert task" });
  }
});

tasksRouter.delete("/:id", async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const deleted = await deleteTask(userId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error("Delete task failed", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});
