import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 0,
    marginRight: 8,
    marginBottom: 8,
    transform: [{ rotate: '-1deg' }],
  },
  name: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'TT Tricks Trial Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});