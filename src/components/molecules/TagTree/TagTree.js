import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './styles';
import { useStore } from '@/store';
import { observer } from 'mobx-react-lite';

export const TagTree = observer(({
  tag,
  level = 0,
  isSelected,
  onChangeState,
  expandedTags = new Set(),
  onToggleExpansion,
}) => {
  const store = useStore();

  const areAllChildrenSelected = useCallback((currentTag) => {
    if (!currentTag.children || currentTag.children.length === 0) {
      return store.activeFilters.tagIds.has(currentTag.id);
    }
    return currentTag.children.every(child => areAllChildrenSelected(child));
  }, [store.activeFilters.tagIds]);

  const hasChildren = tag.children && tag.children.length > 0;
  const isExpanded = expandedTags.has(tag.id);

  const toggleSelection = useCallback(() => {
    onChangeState(!isSelected, tag.id);
  }, [isSelected, tag.id, onChangeState]);

  const toggleExpansion = useCallback(() => {
    if (onToggleExpansion) {
      onToggleExpansion(tag.id, !isExpanded);
    }
  }, [tag.id, isExpanded, onToggleExpansion]);

  const isCurrentSelected = isSelected || areAllChildrenSelected(tag);

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
          <TouchableOpacity onPress={toggleSelection} style={styles.tagButton}>
            <View style={styles.innerContainer}>
              <Text style={styles.tag}>{tag.name}</Text>
              {isCurrentSelected && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
      {hasChildren && isExpanded && tag.children.map(child => (
        <TagTree
          key={child.id}
          tag={child}
          level={level + 1}
          isSelected={isCurrentSelected}
          onChangeState={onChangeState}
          expandedTags={expandedTags}
          onToggleExpansion={onToggleExpansion}
        />
      ))}
    </View>
  );
});
