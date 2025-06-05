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
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'TT Tricks Trial Bold',
    color: '#1a1a1a',
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    fontFamily: 'TT Tricks Trial Regular',
    color: '#1a1a1a',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  currentPath: {
    fontSize: 14,
    fontFamily: 'TT Tricks Trial Medium',
    color: '#1a1a1a',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  folderPicker: {
    marginTop: 12,
  },
  tagList: {
    maxHeight: 300,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
});