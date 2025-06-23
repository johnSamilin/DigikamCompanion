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
    fontSize: 20,
    fontFamily: 'TT Tricks Trial Black',
    color: '#1a1a1a',
    letterSpacing: 1,
    textTransform: 'uppercase',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    minWidth: 80,
  },
  commonTags: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
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
  legend: {
    fontSize: 14,
    fontFamily: 'TT Tricks Trial Regular',
    color: '#666666',
    marginBottom: 12,
    lineHeight: 20,
  },
  commonIndicator: {
    color: '#00aa00',
    fontFamily: 'TT Tricks Trial Bold',
  },
  someIndicator: {
    color: '#ff8800',
    fontFamily: 'TT Tricks Trial Bold',
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