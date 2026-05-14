import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { DiaryProvider, useDiary } from '@/store/diary-context';
import { requestNotificationPermission } from '@/utils/notifications';

export const unstable_settings = {
  anchor: '(tabs)',
};

/** Runs inside DiaryProvider — handles auto-spillover on app open */
function AppInit() {
  const router = useRouter();
  const { todos, isLoaded, spilloverTodo, deleteTodo } = useDiary();
  const spilloverDoneRef = useRef(false);

  // Notification permission + tap listener — runs once on mount
  useEffect(() => {
    // expo-notifications push support was removed from Expo Go in SDK 53+
    // Skip setup when running inside Expo Go to avoid crashes
    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo) return;

    requestNotificationPermission();

    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as { date?: string } | undefined;
      if (data?.date) router.push(`/day/${data.date}`);
    });

    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-spillover: runs once AFTER data loads from AsyncStorage
  useEffect(() => {
    if (!isLoaded || spilloverDoneRef.current) return;
    spilloverDoneRef.current = true;

    const todayIso = new Date().toISOString().slice(0, 10);
    todos.forEach(todo => {
      if (todo.autoSpillover && !todo.completed && todo.dueDate && todo.dueDate < todayIso) {
        spilloverTodo(todo, todayIso);
        deleteTodo(todo.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <DiaryProvider>
      <AppInit />
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="day/[date]" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </DiaryProvider>
  );
}
