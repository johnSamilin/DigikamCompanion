import { Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useCallback } from 'react';
import { styles } from './styles';
import { useStore } from '@/store';
import { observer } from 'mobx-react-lite';

export const Album = observer(({
  id,
  albumRoot,
  relativePath,
  isSelected = false,
  onChangeState,
  level = 0,
  expandedAlbums = new Set(),
  onToggleExpansion,
}) => {
  const store = useStore();
  const path = relativePath.split('/');
  const name = path[level];

  // Direct children of this album (one path segment deeper).
  const children = Array.from(store.albums.values())
    .filter(album =>
      album.relativePath.startsWith(relativePath + '/') &&
      album.relativePath.split('/').length === relativePath.split('/').length + 1,
    )
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const hasChildren = children.length > 0;
  const isExpanded = expandedAlbums.has(id);

  const hasSelectedChildren = Array.from(store.albums.values()).some(album =>
    album.relativePath.startsWith(relativePath + '/') &&
    store.activeFilters.albumIds.has(album.id),
  );

  const toggleExpansion = useCallback(() => {
    if (onToggleExpansion) {
      onToggleExpansion(id, !isExpanded);
    }
  }, [id, isExpanded, onToggleExpansion]);

  const toggleSelection = useCallback(() => {
    onChangeState(!isSelected, id);
  }, [isSelected, id, onChangeState]);

  return (
    <View>
      <View style={[styles.container, { paddingLeft: level * 20 + 16 }]}>
        <View style={styles.rowContainer}>
          {hasChildren && (
            <TouchableOpacity onPress={toggleExpansion} style={styles.expandButton}>
              <Text style={styles.expandIcon}>
                {isExpanded ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>
          )}
          {!hasChildren && <View style={styles.expandButtonPlaceholder} />}
          <TouchableOpacity onPress={toggleSelection} style={styles.albumButton}>
            <View style={styles.innerContainer}>
              <Text style={styles.album}>{name}</Text>
              {(isSelected || hasSelectedChildren) && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
      {hasChildren && isExpanded && children.map(child => (
        <Album
          key={child.id}
          {...child}
          level={level + 1}
          isSelected={store.activeFilters.albumIds.has(child.id)}
          onChangeState={onChangeState}
          expandedAlbums={expandedAlbums}
          onToggleExpansion={onToggleExpansion}
        />
      ))}
    </View>
  );
});
