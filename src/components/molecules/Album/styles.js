```javascript
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  album: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  selected: {
    fontSize: 13,
    color: '#10b981',
    marginTop: 4,
    fontWeight: '500',
  },
  innerContainer: {
    flexDirection: 'column',
  }
});
```