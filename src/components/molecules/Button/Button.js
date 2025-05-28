import { Pressable, Text } from 'react-native';
import { styles } from './styles';

export function Button({ 
  onPress, 
  title, 
  color = '#1a1a1a',
  textColor = '#ffffff',
  style,
}) {
  return (
    <Pressable 
      style={[
        styles.button,
        { backgroundColor: color },
        style
      ]} 
      onPress={onPress}
    >
      <Text style={[
        styles.text,
        { color: textColor }
      ]}>
        {title}
      </Text>
    </Pressable>
  );
}