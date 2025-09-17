import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, useState, useEffect } from 'react-native';
import { styles } from './styles';
import { useStore } from '@/store';
import { observer } from 'mobx-react-lite';

export const TagTree = observer(({ 
  tag, 
  level = 0, 
  isSelected, 
  onChangeState,
  expandedTags = new Set(),
  onToggleExpansion 
}) => {
  const store = useStore();
  
  // Check if this tag has descendants beyond immediate children
  const hasDeepDescendants = useCallback(() => {
    const checkDeepChildren = (currentTag) => {
      if (!currentTag.children || currentTag.children.length === 0) {
        return false;
      }
      // If any child has children, then we have deep descendants
      return currentTag.children.some(child => 
        (child.children && child.children.length > 0) || checkDeepChildren(child)
      );
    };
    return checkDeepChildren(tag);
  }, [tag]);

  // Set default collapsed state for branches with deep descendants
  useEffect(() => {
    if (tag.children && tag.children.length > 0 && onToggleExpansion) {
      // Collapse by default if this branch has descendants beyond immediate children
      if (!expandedTags.has(tag.id) && !hasDeepDescendants()) {
        onToggleExpansion(tag.id, true); // Expand simple parent-child relationships
      }
    }
  }, [tag.id, tag.children, hasDeepDescendants, expandedTags, onToggleExpansion]);
  
  const areAllChildrenSelected = useCallback((currentTag) => {
    if (!currentTag.children || currentTag.children.length === 0) {
      return store.activeFilters.tagIds.has(currentTag.id);
    }
    return currentTag.children.every(child => areAllChildrenSelected(child));
  }, [store.activeFilters.tagIds]);

  const toggleSelection = useCallback(() => {
    onChangeState(!isSelected, tag.id);
  }, [isSelected, tag.id, onChangeState]);

  const toggleExpansion = useCallback(() => {
    if (onToggleExpansion) {
      onToggleExpansion(tag.id, !isExpanded);
    }
  }, [tag.id, isExpanded, onToggleExpansion]);

  const isCurrentSelected = isSelected || areAllChildrenSelected(tag);
  const hasChildren = tag.children && tag.children.length > 0;
  const isExpanded = expandedTags.has(tag.id);

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