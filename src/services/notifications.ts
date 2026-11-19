import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

export interface AcademicReminder {
  id: string;
  title: string;
  description: string;
  starts_at: string;
}

export async function scheduleAcademicReminder(
  reminder: AcademicReminder,
): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  const finalStatus = existingStatus === 'granted'
    ? existingStatus
    : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('academic-calendar', {
      name: 'Calendrier académique',
      importance: AndroidImportance.DEFAULT,
    });
  }

  const startsAt = new Date(`${reminder.starts_at}T09:00:00`);
  const notificationTime = new Date(startsAt);
  notificationTime.setDate(notificationTime.getDate() - 1);
  if (notificationTime.getTime() <= Date.now()) return null;

  return Notifications.scheduleNotificationAsync({
    identifier: `academic-${reminder.id}`,
    content: {
      title: 'Échéance académique',
      body: `${reminder.title} : ${reminder.description}`,
      data: { type: 'academic-calendar', eventId: reminder.id },
      ...(Platform.OS === 'android' ? { channelId: 'academic-calendar' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: notificationTime,
    },
  });
}
