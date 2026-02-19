import * as Notifications from "expo-notifications";

// Ask permission once (safe for web too; web may be limited)
export async function configureNotifications() {
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
  if (perm.status !== "granted") {
    await Notifications.requestPermissionsAsync();
  }
}

export async function scheduleTaskReminder(params: {
  title: string;
  dueAtIso: string;          // when task is due
  reminderMinutes: number;   // minutes before due
}): Promise<string | null> {
  const due = new Date(params.dueAtIso);
  const triggerTime = new Date(due.getTime() - params.reminderMinutes * 60 * 1000);

  // If trigger already passed, don't schedule
  if (triggerTime.getTime() <= Date.now()) return null;

  const secondsFromNow = Math.floor((triggerTime.getTime() - Date.now()) / 1000);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "TaskSnap Reminder",
      body: params.title,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsFromNow },
  });

  return id;
}

export async function cancelReminder(notificationId?: string | null) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore
  }
}
