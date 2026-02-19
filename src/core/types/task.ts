export type TaskStatus = "pending" | "completed";

export type Task = {
  id: string;                 // uuid
  title: string;
  category?: string | null;   // e.g., Home, Study
  dueAt?: string | null;      // ISO string (optional)
  reminderMinutes?: number | null; // e.g., 10
  status: TaskStatus;
  createdAt: string;          // ISO string
  updatedAt: string;          // ISO string
  notificationId?: string | null; // local notification reference
  imageUri?: string | null;   // local file path for captured photo
  imageUrl?: string | null;   // Firebase Storage download URL
  imageBase64?: string | null; // temporary base64 for upload (not stored)
  userId?: string;            // Firebase user ID for security
};
