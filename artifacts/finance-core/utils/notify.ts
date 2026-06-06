import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { toast } from '@/utils/toast';

function haptic(type: Haptics.NotificationFeedbackType) {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(type).catch(() => {});
}

export function notifySuccess(msg: string) {
  haptic(Haptics.NotificationFeedbackType.Success);
  toast.success(msg);
}

export function notifyError(msg: string = 'Não foi possível concluir a operação. Tente novamente.') {
  haptic(Haptics.NotificationFeedbackType.Error);
  toast.error(msg);
}

export function notifyInfo(msg: string) {
  toast.info(msg);
}
