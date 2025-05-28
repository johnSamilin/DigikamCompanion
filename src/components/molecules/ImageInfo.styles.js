import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  wrapper: {
    padding: 20,
  },
  name: {
    textAlign: 'center',
    color: '#1a1a1a',
    fontFamily: 'TT Tricks Trial Bold',
    fontSize: 16,
    marginBottom: 12,
    letterSpacing: 1,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  buttons: {
    gap: 12,
  },
});