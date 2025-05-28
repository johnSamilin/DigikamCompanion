```javascript
import { Pressable, Text } from 'react-native';
import { styles } from './styles';

export function Tag({ onClick, name }) {
  return (
    <Pressable style={styles.wrapper} onPress={onClick}>
      <Text style={styles.name}>{name}</Text>
    </Pressable>
  );
}
```