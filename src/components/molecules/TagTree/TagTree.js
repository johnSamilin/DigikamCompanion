import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './styles';

export function TagTree({ tag, level = 0, isSelected, onChangeState }) {
  const toggleSelection = useCallback(() => {
    onChangeState(!isSelected, tag.id);
  }, [isSelected, tag.id, onChangeState]);

  return (
    <View>
      <TouchableOpacity onPress={toggleSelection}>
        <View style={[styles.container, { paddingLeft: level * 20 + 16 }]}>
          <View style={styles.innerContainer}>
            <Text style={styles.tag}>{tag.name}</Text>
            {isSelected && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
      {tag.children?.map(child => (
        <TagTree
          key={child.id}
          tag={child}
          level={level + 1}
          isSelected={isSelected}
          onChangeState={onChangeState}
        />
      ))}
    </View>
  );
}