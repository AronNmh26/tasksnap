import { Platform } from "react-native";
import Constants from "expo-constants";

const isExpoGoAndroid = Platform.OS === "android" && Constants.appOwnership === "expo";

export function isNotificationsAvailable(): boolean {
  return !isExpoGoAndroid;
}

type NotificationsModule = typeof import("expo-notifications");
let _notifications: NotificationsModule | null = null;

function getNotifications(): NotificationsModule | null {
  if (isExpoGoAndroid) return null;
  if (_notifications) return _notifications;
  // Lazy-load to avoid Expo Go Android runtime errors
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _notifications = require("expo-notifications");
  return _notifications;
}

export async function configureNotifications() {
  const Notifications = getNotifications();
  if (!Notifications) {
    console.warn(
      "[notifications] Expo Go on Android does not support push notifications in SDK 53+."
    );
    return;
  }
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }
}

// Ask permission once (safe for web too; web may be limited)
export async function ensureNotificationPermission(): Promise<"granted" | "denied" | "undetermined"> {
  const Notifications = getNotifications();
  if (!Notifications) {
    console.warn(
      "[notifications] Skipping notification permissions in Expo Go on Android."
    );
    return "undetermined";
  }
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const perm = await Notifications.getPermissionsAsync();
  if (perm.status === "granted") return perm.status;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status;
}

export async function scheduleTaskReminder(params: {
  title: string;
  dueAtIso: string;          // when task is due
  reminderMinutes: number;   // minutes before due
  category?: string | null;
}): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return null;
  }
  const status = await ensureNotificationPermission();
  if (status !== "granted") return null;

  const due = new Date(params.dueAtIso);
  const triggerTime = new Date(due.getTime() - params.reminderMinutes * 60 * 1000);

  // If trigger already passed, don't schedule
  if (triggerTime.getTime() <= Date.now()) return null;

  const secondsFromNow = Math.floor((triggerTime.getTime() - Date.now()) / 1000);
  const categoryLabel = params.category?.trim() ? `${params.category} task` : "task";
  const reminderWindowLabel =
    params.reminderMinutes === 60
      ? "in 1 hour"
      : `in ${params.reminderMinutes} minutes`;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "TaskSnap Reminder",
      body: `Hi there. "${params.title}" is due ${reminderWindowLabel}. Open TaskSnap to review your ${categoryLabel} and stay on track.`,
      data: {
        type: "task-reminder",
        dueAtIso: params.dueAtIso,
        title: params.title,
        category: params.category ?? null,
      },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsFromNow },
  });

  return id;
}

export async function cancelReminder(notificationId?: string | null) {
  const Notifications = getNotifications();
  if (!Notifications) return;
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore
  }
}

export async function cancelAllReminders() {
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}
