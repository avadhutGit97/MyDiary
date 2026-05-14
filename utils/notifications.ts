import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'task-reminders';

// Configure how notifications appear when the app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

/** Create the Android notification channel (must be called before scheduling). */
export async function setupNotificationChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Task Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
    });
}

export async function requestNotificationPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    await setupNotificationChannel();
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
}

export async function scheduleTaskReminder(
    taskId: string,
    title: string,
    date: string,
    time: string,
): Promise<string | null> {
    try {
        const granted = await requestNotificationPermission();
        if (!granted) return null;

        const [year, month, day] = date.split('-').map(Number);
        const [hour, minute] = time.split(':').map(Number);

        const trigger = new Date(year, month - 1, day, hour, minute, 0);
        if (trigger <= new Date()) return null; // past time – skip

        const id = await Notifications.scheduleNotificationAsync({
            identifier: `task-${taskId}`,
            content: {
                title: '⏰ Task Reminder',
                body: title,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.MAX,
                vibrate: [0, 250, 250, 250],
                data: { date },
                ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: trigger,
            },
        });
        return id;
    } catch {
        return null;
    }
}

/** Cancel a previously scheduled notification */
export async function cancelTaskReminder(notificationId: string): Promise<void> {
    try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch {
        // ignore
    }
}
