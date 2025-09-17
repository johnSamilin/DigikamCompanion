import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
  },
  title: {
    fontSize: 24,
    fontFamily: 'TT Tricks Trial Black',
    color: '#1a1a1a',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    minWidth: 80,
  },
  currentTags: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'TT Tricks Trial Bold',
    color: '#1a1a1a',
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  noTags: {
    fontSize: 14,
    fontFamily: 'TT Tricks Trial Regular',
    color: '#666666',
    fontStyle: 'italic',
  },
  createSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
  },
  createForm: {
    gap: 12,
  },
  input: {
    borderWidth: 2,
    borderColor: '#1a1a1a',
    padding: 12,
    fontSize: 16,
    fontFamily: 'TT Tricks Trial Regular',
    backgroundColor: '#ffffff',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  allTags: {
    flex: 1,
  },
  tagsList: {
    flex: 1,
  },
  tagItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tagRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expandButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  expandButtonPlaceholder: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  expandIcon: {
    fontSize: 12,
    fontFamily: 'TT Tricks Trial Bold',
    color: '#1a1a1a',
  },
  tagName: {
    fontSize: 16,
    fontFamily: 'TT Tricks Trial Regular',
    color: '#1a1a1a',
    flex: 1,
  },
  tagActions: {
    marginLeft: 12,
  },
  actionButton: {
    minWidth: 80,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'TT Tricks Trial Bold',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});