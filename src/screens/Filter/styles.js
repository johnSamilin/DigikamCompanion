import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 3,
    borderBottomColor: '#1a1a1a',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  activeTab: {
    backgroundColor: '#1a1a1a',
    transform: [{ rotate: '-1deg' }, { scale: 1.02 }],
  },
  tabText: {
    fontSize: 18,
    fontFamily: 'TT Tricks Trial Black',
    color: '#1a1a1a',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  activeTabText: {
    color: '#ffffff',
  },
  pagerView: {
    flex: 1,
  },
  buttonsWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderTopWidth: 3,
    borderTopColor: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  button: {
    minWidth: 120,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 3,
    borderColor: '#1a1a1a',
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'TT Tricks Trial Bold',
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  searchClear: {
    width: 44,
    height: 44,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1a1a1a',
    backgroundColor: '#1a1a1a',
  },
  searchClearText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'TT Tricks Trial Black',
  },
  emptyResult: {
    padding: 24,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'TT Tricks Trial Bold',
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});