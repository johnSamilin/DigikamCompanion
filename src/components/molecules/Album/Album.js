import { Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useState, useEffect, useCallback } from 'react';
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

  // Check if this album has descendants beyond immediate children
  const hasDeepDescendants = useCallback(() => {
    const checkDeepChildren = (currentPath) => {
      const directChildren = Array.from(store.albums.values()).filter(album => 
        album.relativePath.startsWith(currentPath + '/') && 
        album.relativePath.split('/').length === currentPath.split('/').length + 1
      );
      
      // If any direct child has its own children, then we have deep descendants
      return directChildren.some(child => 
        Array.from(store.albums.values()).some(grandchild =>
          grandchild.relativePath.startsWith(child.relativePath + '/') &&
          grandchild.relativePath !== child.relativePath
        )
      );
    };
  // Get direct children of this album
  const children = Array.from(store.albums.values()).filter(album => 
    album.relativePath.startsWith(relativePath + '/') && 
    album.relativePath.split('/').length === relativePath.split('/').length + 1
  ).sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    return checkDeepChildren(relativePath);
  const hasChildren = children.length > 0;
  const isExpanded = expandedAlbums.has(id);
  
  // Set default collapsed state for branches with deep descendants
  useEffect(() => {
    if (hasChildren && onToggleExpansion) {
      // Collapse by default if this branch has descendants beyond immediate children
      if (!expandedAlbums.has(id) && !hasDeepDescendants()) {
        onToggleExpansion(id, true); // Expand simple parent-child relationships
      }
    }
  }, [id, hasChildren, hasDeepDescendants, expandedAlbums, onToggleExpansion]);
  }, [relativePath, store.albums]);
  const hasSelectedChildren = Array.from(store.albums.values()).some(album => 
    album.relativePath.startsWith(relativePath + '/') && 
    store.activeFilters.albumIds.has(album.id)
  );
  
  const toggleExpansion = () => {
    if (onToggleExpansion) {
      onToggleExpansion(id, !isExpanded);
    }
  };

  const toggleSelection = () => {
    onChangeState(!isSelected, id);
  };

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