
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
    marginTop: 24,
  },
  buttonsWrapper: {
    flexDirection: 'row',
    position: 'absolute',
    right: 20,
    bottom: 30,
    gap: 12,
  },
  button: {
    minWidth: 100,
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
  resetButton: {
    backgroundColor: '#ef4444',
  }
});
