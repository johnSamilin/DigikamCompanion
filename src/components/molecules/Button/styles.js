import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#000000',
    transform: [{ rotate: '-1deg' }, { scale: 1.02 }],
  },
  text: {
    fontSize: 16,
    fontFamily: 'TT Tricks Trial Black',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});