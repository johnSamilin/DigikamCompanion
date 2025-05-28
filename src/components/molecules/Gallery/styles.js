import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  row: {
    flexDirection: 'row',
  },
  filterBtn: {
    position: 'absolute',
    right: 20,
    bottom: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  titleWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  pictureSelected: {
    opacity: 0.25,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    marginVertical: 6,
    minWidth: 120,
  },
  buttonContainer: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionButton: {
    marginBottom: 8,
  }
});
