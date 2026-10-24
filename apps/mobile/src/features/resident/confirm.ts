import { Alert, Platform } from 'react-native';
export function confirmDiscard(title: string, message: string, discard: string, cancel: string, action: () => void) {
  if (Platform.OS === 'web') { if (window.confirm(`${title}\n\n${message}`)) action(); }
  else Alert.alert(title, message, [{ text: cancel, style: 'cancel' }, { text: discard, style: 'destructive', onPress: action }]);
}
