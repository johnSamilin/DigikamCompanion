import { Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { styles } from './styles';

export function Album({
  id,
  albumRoot,
  relativePath,
  isSelected = false,
  onChangeState,
}) {
  const path = relativePath.split('/');
  const level = path.length - 1;
  const name = path[level];
  
  return (
    <TouchableOpacity onPress={() => onChangeState(!isSelected, id)}>
      <View
        style={[
          styles.container,
          { paddingLeft: level * 20 + 16 }
        ]}
      >
        <View style={styles.innerContainer}>
          <Text style={styles.album}>{name}</Text>
          {isSelected && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}