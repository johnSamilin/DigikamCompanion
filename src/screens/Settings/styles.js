import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'TT Tricks Trial Black',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'TT Tricks Trial Bold',
    color: '#1a1a1a',
    marginBottom: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tagList: {
    flex: 1,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
});