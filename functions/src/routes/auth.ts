import { Router } from "express";
import {
  requestPasswordResetOtp,
  resetPasswordWithOtp
} from "../services/passwordResetService";

export const authRouter = Router();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

authRouter.post("/password-reset/request", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();

    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }

    await requestPasswordResetOtp(email);

    res.status(200).json({
      data: {
        message: "If this email exists, a verification code has been sent."
      }
    });
  } catch (error) {
    console.error("Request password reset OTP failed", error);
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to send verification code."
    });
  }
});

authRouter.post("/password-reset/confirm", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const code = String(req.body?.code ?? "").trim();
    const newPassword = String(req.body?.newPassword ?? "");

    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      res.status(400).json({ error: "Please enter the 6-digit verification code." });
      return;
    }

    if (newPassword.trim().length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters." });
      return;
    }

    await resetPasswordWithOtp(email, code, newPassword);

    res.status(200).json({
      data: {
        message: "Your password has been updated. You can log in now."
      }
    });
  } catch (error) {
    console.error("Confirm password reset OTP failed", error);
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to reset password."
    });
  }
});
