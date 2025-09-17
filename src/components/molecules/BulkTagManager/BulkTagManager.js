import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Modal, Alert } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import { Button } from '@/components/molecules';
import { Tag } from '@/components/molecules/Tag/Tag';
import { styles } from './styles';

export const BulkTagManager = observer(({ visible, onClose }) => {
  const store = useStore();
  const [isLoading, setIsLoading] = useState(false);

  const selectedImageIds = Array.from(store.userSelectedImages);

  // Get all tags that are common to ALL selected photos
  const commonTags = useMemo(() => {
    if (selectedImageIds.length === 0) return [];

    const tagCounts = new Map();
    
    // Count how many photos have each tag
    selectedImageIds.forEach(imageId => {
      const imageTags = store.imagetags.get(imageId) || [];
      imageTags.forEach(tag => {
        tagCounts.set(tag.tagid, (tagCounts.get(tag.tagid) || 0) + 1);
      });
    });

    // Only include tags that appear in ALL selected photos
    const common = [];
    tagCounts.forEach((count, tagId) => {
      if (count === selectedImageIds.length) {
        const tag = store.tags.get(tagId);
        if (tag) {
          common.push({ tagid: tagId, tagname: tag.name });
        }
      }
    });

    return common;
  }, [selectedImageIds, store.imagetags, store.tags]);

  // Get all tags that are assigned to at least one selected photo
  const assignedTags = useMemo(() => {
    const tagSet = new Set();
    selectedImageIds.forEach(imageId => {
      const imageTags = store.imagetags.get(imageId) || [];
      imageTags.forEach(tag => tagSet.add(tag.tagid));
    });
    return Array.from(tagSet);
  }, [selectedImageIds, store.imagetags]);

  const handleAddTag = async (tagId) => {
    setIsLoading(true);
    try {
      // Add tag to all selected photos that don't already have it
      const promises = selectedImageIds.map(async (imageId) => {
        const imageTags = store.imagetags.get(imageId) || [];
        const hasTag = imageTags.some(t => t.tagid === tagId);
        if (!hasTag) {
          return store.addTagToPhoto(tagId, imageId);
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      
      const tag = store.tags.get(tagId);
      Alert.alert('Success', `Added "${tag?.name}" to ${selectedImageIds.length} photos`);
    } catch (error) {
      Alert.alert('Error', 'Failed to add tag to photos');
    }
    setIsLoading(false);
  };

  const handleRemoveCommonTag = async (tagId) => {
    setIsLoading(true);
    try {
      // Remove tag from all selected photos
      const promises = selectedImageIds.map(imageId => 
        store.removeTagFromPhoto(tagId, imageId)
      );

      await Promise.all(promises);
      
      const tag = store.tags.get(tagId);
      Alert.alert('Success', `Removed "${tag?.name}" from ${selectedImageIds.length} photos`);
    } catch (error) {
      Alert.alert('Error', 'Failed to remove tag from photos');
    }
    setIsLoading(false);
  };

  const handleClose = async () => {
    // Sync database when closing bulk tag manager
    if (store.hasUnsavedChanges) {
      setIsLoading(true);
      try {
        await store.syncDatabaseToOriginal();
      } catch (error) {
        Alert.alert('Warning', 'Failed to save changes to database. Changes may be lost.');
      }
      setIsLoading(false);
    }
    onClose();
  };

  const renderTagTree = (tag, level = 0, expandedTags = new Set()) => {
    const isAssignedToSome = assignedTags.includes(tag.id);
    const isCommonToAll = commonTags.some(t => t.tagid === tag.id);
    const hasChildren = tag.children && tag.children.length > 0;
    const isExpanded = expandedTags.has(tag.id);
    
    const toggleExpansion = () => {
      const newExpandedTags = new Set(expandedTags);
      if (isExpanded) {
        newExpandedTags.delete(tag.id);
      } else {
        newExpandedTags.add(tag.id);
      }
      // You might want to store this in component state if you need persistence
    };
    
    return (
      <View key={tag.id}>
        <View style={[styles.tagItem, { paddingLeft: level * 20 + 16 }]}>
          <View style={styles.tagRowContainer}>
            {hasChildren && (
              <TouchableOpacity onPress={toggleExpansion} style={styles.expandButton}>
                <Text style={styles.expandIcon}>
                  {isExpanded ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>
            )}
            {!hasChildren && <View style={styles.expandButtonPlaceholder} />}
            <Text style={styles.tagName}>
              {tag.name}
              {isCommonToAll && <Text style={styles.commonIndicator}> (all)</Text>}
              }
              {isAssignedToSome && !isCommonToAll && <Text style={styles.someIndicator}> (some)</Text>}
              }
            </Text>
          </View>
          <View style={styles.tagActions}>
            {isCommonToAll ? (
              <Button
                title="Remove"
                onPress={() => handleRemoveCommonTag(tag.id)}
                color="#ff0000"
                style={styles.actionButton}
                disabled={isLoading}
              />
            ) : (
              <Button
                title="Add"
                onPress={() => handleAddTag(tag.id)}
                color="#00ff00"
                textColor="#000000"
                style={styles.actionButton}
                disabled={isLoading}
              />
            )}
          </View>
        </View>
        {hasChildren && isExpanded && tag.children.map(child => renderTagTree(child, level + 1, expandedTags))}
      </View>
    );
  };

  if (selectedImageIds.length === 0) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            Bulk Edit Tags ({selectedImageIds.length} photos)
          </Text>
          <View style={styles.headerButtons}>
            {store.hasUnsavedChanges && (
              <Button 
                title="Save" 
                onPress={store.forceSyncDatabase}
                color="#00ff00"
                textColor="#000000"
                style={styles.saveButton}
                disabled={isLoading}
              />
            )}
            <Button 
              title="Close" 
              onPress={handleClose}
              disabled={isLoading}
            />
          </View>
        </View>

        {commonTags.length > 0 && (
          <View style={styles.commonTags}>
            <Text style={styles.sectionTitle}>Common Tags (in all photos):</Text>
            <View style={styles.tagsWrapper}>
              {commonTags.map(tag => (
                <Tag
                  key={tag.tagid}
                  name={tag.tagname}
                  onClick={() => handleRemoveCommonTag(tag.tagid)}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.allTags}>
          <Text style={styles.sectionTitle}>All Tags:</Text>
          <Text style={styles.legend}>
            • <Text style={styles.commonIndicator}>(all)</Text> = tag is in all selected photos
            {'\n'}• <Text style={styles.someIndicator}>(some)</Text> = tag is in some selected photos
          </Text>
          <ScrollView style={styles.tagsList}>
            {Array.from(store.tagTree.values()).map(tag => renderTagTree(tag))}
          </ScrollView>
        </View>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
});