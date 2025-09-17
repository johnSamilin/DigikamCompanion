import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingRight: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  albumButton: {
    flex: 1,
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  album: {
    fontSize: 16,
    fontFamily: 'TT Tricks Trial Bold',
    color: '#1a1a1a',
    letterSpacing: 1,
    flex: 1,
    textTransform: 'uppercase',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 0,
    backgroundColor: '#00ff00',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    transform: [{ rotate: '5deg' }],
  },
  checkmarkText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    transform: [{ rotate: '-5deg' }],
  },
});