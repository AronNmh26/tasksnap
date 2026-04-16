import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { adminAuth, adminDb } from "../config/firebase";

const OTP_COLLECTION = "passwordResetOtps";
const OTP_EXPIRY_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MIN_PASSWORD_LENGTH = 8;

type OtpRecord = {
  email: string;
  codeHash: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getOtpDocumentId(email: string): string {
  return encodeURIComponent(normalizeEmail(email));
}

function hashOtp(email: string, code: string): string {
  return crypto
    .createHash("sha256")
    .update(`${normalizeEmail(email)}:${code}`)
    .digest("hex");
}

function generateOtpCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function getResetMailConfig() {
  const user = process.env.RESET_EMAIL_USER?.trim();
  const pass = process.env.RESET_EMAIL_APP_PASSWORD?.trim();
  const from = process.env.RESET_EMAIL_FROM?.trim();

  if (!user || !pass || !from) {
    throw new Error(
      "Missing RESET_EMAIL_USER, RESET_EMAIL_APP_PASSWORD, or RESET_EMAIL_FROM for OTP email delivery."
    );
  }

  return { user, pass, from };
}

function getMailTransporter() {
  const { user, pass } = getResetMailConfig();

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass }
  });
}

async function sendOtpEmail(email: string, code: string) {
  const transporter = getMailTransporter();
  const { from } = getResetMailConfig();

  await transporter.sendMail({
    from,
    to: email,
    subject: "TaskSnap password reset code",
    text: `Your TaskSnap password reset code is ${code}. It expires in 5 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 8px;">TaskSnap password reset</h2>
        <p>Use the verification code below to reset your password.</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${code}</p>
        <p>This code expires in 5 minutes.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `
  });
}

function isMatchingOtpHash(expectedHash: string, email: string, code: string): boolean {
  const incomingHash = hashOtp(email, code);
  return crypto.timingSafeEqual(
    Buffer.from(expectedHash, "hex"),
    Buffer.from(incomingHash, "hex")
  );
}

export async function requestPasswordResetOtp(rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  const docRef = adminDb.collection(OTP_COLLECTION).doc(getOtpDocumentId(email));
  const existingRecord = await docRef.get();

  if (existingRecord.exists) {
    const current = existingRecord.data() as OtpRecord;
    if (Date.now() - current.createdAt < RESEND_COOLDOWN_MS) {
      throw new Error("Please wait a minute before requesting another code.");
    }
  }

  try {
    await adminAuth.getUserByEmail(email);
  } catch (error: any) {
    if (error?.code === "auth/user-not-found") {
      return;
    }
    throw error;
  }

  const code = generateOtpCode();
  const now = Date.now();

  await docRef.set({
    email,
    codeHash: hashOtp(email, code),
    createdAt: now,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0
  } satisfies OtpRecord);

  await sendOtpEmail(email, code);
}

export async function resetPasswordWithOtp(rawEmail: string, rawCode: string, newPassword: string) {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.trim();

  if (newPassword.trim().length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const docRef = adminDb.collection(OTP_COLLECTION).doc(getOtpDocumentId(email));
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new Error("No active reset code was found. Please request a new code.");
  }

  const record = snapshot.data() as OtpRecord;

  if (Date.now() > record.expiresAt) {
    await docRef.delete();
    throw new Error("This verification code has expired. Please request a new one.");
  }

  const nextAttempts = (record.attempts ?? 0) + 1;
  if (!isMatchingOtpHash(record.codeHash, email, code)) {
    if (nextAttempts >= MAX_ATTEMPTS) {
      await docRef.delete();
      throw new Error("Too many invalid attempts. Please request a new code.");
    }

    await docRef.update({ attempts: nextAttempts });
    throw new Error("The verification code is incorrect.");
  }

  const user = await adminAuth.getUserByEmail(email);
  await adminAuth.updateUser(user.uid, { password: newPassword });
  await adminAuth.revokeRefreshTokens(user.uid);
  await docRef.delete();
}
