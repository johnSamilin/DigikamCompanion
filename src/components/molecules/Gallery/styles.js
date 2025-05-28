import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  row: {
    flexDirection: 'row',
  },
  filterBtn: {
    position: 'absolute',
    right: 20,
    bottom: 60,
    borderRadius: 0,
    overflow: 'hidden',
    transform: [{ rotate: '2deg' }],
  },
  titleWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 3,
    borderBottomColor: '#1a1a1a',
  },
  title: {
    fontSize: 16,
    fontFamily: 'TT Tricks Trial Black',
    color: '#1a1a1a',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pictureSelected: {
    opacity: 0.25,
    transform: [{ rotate: '2deg' }, { scale: 0.95 }],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: 'TT Tricks Trial Bold',
    color: '#1a1a1a',
    textAlign: 'center',
    lineHeight: 24,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  button: {
    marginVertical: 6,
    minWidth: 120,
    transform: [{ rotate: '-2deg' }],
  },
  buttonContainer: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 0,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'TT Tricks Trial Black',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  actionButton: {
    marginBottom: 8,
    transform: [{ rotate: '2deg' }],
  }
});