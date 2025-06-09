import { SafeScreen } from '@/components/template';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import Gallery from 'react-native-awesome-gallery';
import { useState } from 'react';
import { Modal, Text, ToastAndroid, View, Alert } from 'react-native';
import { ImageInfo } from '@/components/molecules/ImageInfo';
import { Button } from '@/components/molecules';
import { styles } from './styles';

function ImageSlider({ route }) {
  const store = useStore();
  const [selectedImage, setSelectedImage] = useState();
  let initialIndex = 0;
  const uris = store.images.map(({ uri, id }, index) => {
    if (id === route.params.id) {
      initialIndex = index;
    }
    return uri;
  });

  const onChangeImage = index => {
    setSelectedImage(store.images[index]);
  };

  const [isPanelShown, setPanelState] = useState(false);
  const showPanel = () => setPanelState(true);
  const hidePanel = () => setPanelState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTag, setSelectedTag] = useState();
  const [isInProcess, setProcess] = useState(false);
  
  const showTagsModal = tagid => {
    const tag = store.tags.get(tagid);
    if (tag) {
      setSelectedTag(tag);
      setModalVisible(true);
    } else {
      ToastAndroid.show('Tag not found', ToastAndroid.LONG);
    }
  };
  
  const hideTagsModal = () => setModalVisible(false);

  const removeTag = async () => {
    setProcess(true);
    try {
      await store.removeTagFromPhoto(selectedTag.id, selectedImage.id);
      hideTagsModal();
    } catch (error) {
      ToastAndroid.show('Failed to remove tag', ToastAndroid.LONG);
    } finally {
      setProcess(false);
    }
  };

  const findPhotosWithTag = () => {
    store.resetFilters();
    store.addTagToFilters(selectedTag.id);
    store.selectPhotos({
      albumIds: [],
      tagIds: [selectedTag.id],
    });
    hideTagsModal();
  };

  const deleteTagCompletely = () => {
    Alert.alert(
      'Delete Tag',
      `Are you sure you want to delete the tag "${selectedTag.name}" completely? This will remove it from all photos and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setProcess(true);
            try {
              await store.deleteTag(selectedTag.id);
              hideTagsModal();
              ToastAndroid.show('Tag deleted successfully', ToastAndroid.SHORT);
            } catch (error) {
              ToastAndroid.show('Failed to delete tag', ToastAndroid.LONG);
            } finally {
              setProcess(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeScreen>
      <View style={styles.wrapper} onTouchStart={hidePanel}>
        <Gallery
          data={uris}
          initialIndex={initialIndex}
          numToRender={3}
          onIndexChange={onChangeImage}
        />
      </View>
      <View
        style={[
          styles.infoWrapper,
          !isPanelShown && styles.infoWrapperHidden
        ]}
        onTouchStart={showPanel}
      >
        {selectedImage && (
          <ImageInfo currentImage={selectedImage} onTagClick={showTagsModal} />
        )}
      </View>
      <Modal animationType="none" transparent visible={modalVisible}>
        <View style={styles.modalWrapper}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Tag: {selectedTag?.name}
            </Text>
            {isInProcess && (
              <Text style={styles.modalProcessing}>Processing...</Text>
            )}
            <View style={styles.modalButtons}>
              <Button 
                title="Remove from Photo" 
                onPress={removeTag}
                color="#ff0000"
              />
              <Button 
                title="Find All Photos" 
                onPress={findPhotosWithTag}
                color="#00ff00"
                textColor="#000000"
              />
              <Button 
                title="Delete Tag Completely" 
                onPress={deleteTagCompletely}
                color="#ff0000"
              />
              <Button 
                title="Close" 
                onPress={hideTagsModal}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeScreen>
  );
}

export default observer(ImageSlider);