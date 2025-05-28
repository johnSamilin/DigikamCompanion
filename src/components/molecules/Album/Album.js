import { Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

const styles = {
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
};

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
          {isSelected && <Text style={styles.selected}>Selected</Text>}
          }
        </View>
      </View>
    </TouchableOpacity>
  );
}