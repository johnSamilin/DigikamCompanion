import { Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { styles } from './styles';
import { useStore } from '@/store';
import { observer } from 'mobx-react-lite';

export const Album = observer(({
  id,
  albumRoot,
  relativePath,
  isSelected = false,
  onChangeState,
}) => {
  const store = useStore();
  const path = relativePath.split('/');
  const level = path.length - 1;
  const name = path[level];

  const hasSelectedChildren = Array.from(store.albums.values()).some(album => 
    album.relativePath.startsWith(relativePath + '/') && 
    store.activeFilters.albumIds.has(album.id)
  );
  
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
          {(isSelected || hasSelectedChildren) && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});