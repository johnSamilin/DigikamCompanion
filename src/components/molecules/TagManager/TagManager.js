import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Modal, Alert } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import { Button } from '@/components/molecules';
import { Tag } from '@/components/molecules/Tag/Tag';
import { styles } from './styles';

export const TagManager = observer(({ imageId, visible, onClose }) => {
  const store = useStore();
  const [newTagName, setNewTagName] = useState('');
  const [selectedParentTag, setSelectedParentTag] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const imageTags = store.imagetags.get(imageId) || [];
  const imageTagIds = new Set(imageTags.map(t => t.tagid));

  const handleAddTag = async (tagId) => {
    setIsLoading(true);
    try {
      await store.addTagToPhoto(tagId, imageId);
    } catch (error) {
      Alert.alert('Error', 'Failed to add tag to photo');
    }
    setIsLoading(false);
  };

  const handleRemoveTag = async (tagId) => {
    setIsLoading(true);
    try {
      await store.removeTagFromPhoto(tagId, imageId);
    } catch (error) {
      Alert.alert('Error', 'Failed to remove tag from photo');
    }
    setIsLoading(false);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert('Error', 'Tag name cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      const newTag = await store.createTag(newTagName.trim(), selectedParentTag);
      await store.addTagToPhoto(newTag.id, imageId);
      setNewTagName('');
      setSelectedParentTag(null);
      setShowCreateForm(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create tag');
    }
    setIsLoading(false);
  };

  const handleClose = async () => {
    // Sync database when closing tag manager
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

  const renderTagTree = (tag, level = 0) => {
    const isAssigned = imageTagIds.has(tag.id);
    
    return (
      <View key={tag.id}>
        <View style={[styles.tagItem, { paddingLeft: level * 20 + 16 }]}>
          <Text style={styles.tagName}>{tag.name}</Text>
          <View style={styles.tagActions}>
            {isAssigned ? (
              <Button
                title="Remove"
                onPress={() => handleRemoveTag(tag.id)}
                color="#ff0000"
                style={styles.actionButton}
              />
            ) : (
              <Button
                title="Add"
                onPress={() => handleAddTag(tag.id)}
                color="#00ff00"
                textColor="#000000"
                style={styles.actionButton}
              />
            )}
          </View>
        </View>
        {tag.children?.map(child => renderTagTree(child, level + 1))}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Manage Tags</Text>
          <View style={styles.headerButtons}>
            {store.hasUnsavedChanges && (
              <Button 
                title="Save" 
                onPress={store.forceSyncDatabase}
                color="#00ff00"
                textColor="#000000"
                style={styles.saveButton}
              />
            )}
            <Button title="Close" onPress={handleClose} />
          </View>
        </View>

        <View style={styles.currentTags}>
          <Text style={styles.sectionTitle}>Current Tags:</Text>
          <View style={styles.tagsWrapper}>
            {imageTags.map(tag => (
              <Tag
                key={tag.tagid}
                name={tag.tagname}
                onClick={() => handleRemoveTag(tag.tagid)}
              />
            ))}
            {imageTags.length === 0 && (
              <Text style={styles.noTags}>No tags assigned</Text>
            )}
          </View>
        </View>

        <View style={styles.createSection}>
          {!showCreateForm ? (
            <Button
              title="Create New Tag"
              onPress={() => setShowCreateForm(true)}
              color="#00ff00"
              textColor="#000000"
            />
          ) : (
            <View style={styles.createForm}>
              <TextInput
                style={styles.input}
                placeholder="Tag name"
                value={newTagName}
                onChangeText={setNewTagName}
                autoFocus
              />
              <View style={styles.formButtons}>
                <Button
                  title="Create"
                  onPress={handleCreateTag}
                  disabled={!newTagName.trim() || isLoading}
                />
                <Button
                  title="Cancel"
                  onPress={() => {
                    setShowCreateForm(false);
                    setNewTagName('');
                    setSelectedParentTag(null);
                  }}
                  color="#ff0000"
                />
              </View>
            </View>
          )}
        </View>

        <View style={styles.allTags}>
          <Text style={styles.sectionTitle}>All Tags:</Text>
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