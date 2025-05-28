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
});