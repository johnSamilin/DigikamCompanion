import { SafeScreen } from '@/components/template';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import Gallery from 'react-native-awesome-gallery';
import { useState } from 'react';
import { Modal, Text, ToastAndroid, View } from 'react-native';
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
      ToastAndroid.show('Такого тега не нашли', ToastAndroid.LONG);
    }
  };
  
  const hideTagsModal = () => setModalVisible(false);

  const removeTag = async () => {
    setProcess(true);
    store
      .removeTagFromPhoto(selectedTag.id, selectedImage.id)
      .then(hideTagsModal)
      .catch(() => {
        ToastAndroid.show('Не получилось удалить тег', ToastAndroid.LONG);
      })
      .finally(() => {
        setProcess(false);
      });
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
              Тег {selectedTag?.name}
            </Text>
            {isInProcess && (
              <Text style={styles.modalProcessing}>Обработка...</Text>
            )}
            <View style={styles.modalButtons}>
              <Button 
                title="Удалить" 
                onPress={removeTag}
                color="#ff0000"
              />
              <Button 
                title="Найти все фото" 
                onPress={hideTagsModal}
                color="#00ff00"
                textColor="#000000"
              />
              <Button 
                title="Закрыть" 
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