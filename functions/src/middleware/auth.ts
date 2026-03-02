import type { NextFunction, Request, Response } from "express";
import { adminAuth } from "../config/firebase";

export async function authenticateRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Missing or invalid Authorization header. Expected: Bearer <FirebaseIdToken>"
    });
    return;
  }

  const idToken = authHeader.slice("Bearer ".length).trim();

  if (!idToken) {
    res.status(401).json({ error: "Empty bearer token" });
    return;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification failed", error);
    res.status(401).json({ error: "Unauthorized" });
  }
}
