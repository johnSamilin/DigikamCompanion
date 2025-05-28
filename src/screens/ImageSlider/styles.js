import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  wrapper: {
    height: '100%',
    width: '100%',
    backgroundColor: '#ffffff',
  },
  infoWrapper: {
    position: 'absolute',
    bottom: 0,
    width: '90%',
    left: '5%',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#1a1a1a',
    transform: [{ rotate: '-1deg' }],
  },
  infoWrapperHidden: {
    height: 45,
    bottom: -5,
  },
  modalWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#ffffff',
    padding: 20,
    borderWidth: 3,
    borderColor: '#1a1a1a',
    transform: [{ rotate: '1deg' }],
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'TT Tricks Trial Black',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  modalProcessing: {
    fontSize: 16,
    fontFamily: 'TT Tricks Trial Bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalButtons: {
    gap: 12,
  },
});