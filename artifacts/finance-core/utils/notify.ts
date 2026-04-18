import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

function haptic(type: Haptics.NotificationFeedbackType) {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(type).catch(() => {});
}

export function notifySuccess(msg: string) {
  haptic(Haptics.NotificationFeedbackType.Success);
  // TODO: trocar por componente Toast quando disponível
  if (Platform.OS !== 'web') Alert.alert('OK', msg);
}

export function notifyError(msg: string = 'Não foi possível concluir a operação. Tente novamente.') {
  haptic(Haptics.NotificationFeedbackType.Error);
  if (Platform.OS !== 'web') Alert.alert('Erro', msg);
}

export function notifyInfo(msg: string) {
  if (Platform.OS !== 'web') Alert.alert('Aviso', msg);
}
