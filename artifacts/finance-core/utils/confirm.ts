import { Alert, ActionSheetIOS, Platform } from 'react-native';

export async function confirmDestructive(
  title: string,
  message?: string,
  destructiveLabel: string = 'Excluir',
): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          message,
          options: ['Cancelar', destructiveLabel],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 1,
        },
        (index) => resolve(index === 1),
      );
    } else {
      Alert.alert(
        title,
        message,
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
          { text: destructiveLabel, style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    }
  });
}
