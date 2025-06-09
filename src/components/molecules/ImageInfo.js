import { Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import Share from 'react-native-share';
import { Tag } from './Tag';
import { Button } from '@/components/molecules';
import { styles } from './ImageInfo.styles';
import { useState } from 'react';
import { TagManager } from './TagManager/TagManager';

export const ImageInfo = observer(({ currentImage, onTagClick }) => {
  const store = useStore();
  const [showTagManager, setShowTagManager] = useState(false);

  const handleShare = async () => {
    try {
      await Share.open({
        url: currentImage.uri,
      });
    } catch (error) {
      store.addLog(error.message);
    }
  };

  const toggleSelection = () => {
    if (store.userSelectedImages.has(currentImage.id)) {
      store.removeFromUserSelection(currentImage.id);
    } else {
      store.addToUserSelection(currentImage.id);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.name}>
        {currentImage?.uri.replace(store.fileUriPrefix, '')}
      </Text>
      <View style={styles.tagsWrapper}>
        {store.imagetags.get(currentImage.id)?.map(t => (
          <Tag
            key={t.tagid}
            name={t.tagname}
            onClick={() => onTagClick(t.tagid)}
          />
        ))}
      </View>
      <View style={styles.buttons}>
        <Button 
          title="Manage Tags" 
          onPress={() => setShowTagManager(true)}
          color="#00ff00"
          textColor="#000000"
        />
        <Button 
          title="Share" 
          onPress={handleShare}
          color="#1a1a1a"
        />
        {store.userSelectedImages.size > 0 && (
          <Button
            onPress={toggleSelection}
            title={store.userSelectedImages.has(currentImage.id) ? 'Unselect' : 'Select'}
            color={store.userSelectedImages.has(currentImage.id) ? '#ff0000' : '#1a1a1a'}
          />
        )}
      </View>
      
      <TagManager
        imageId={currentImage.id}
        visible={showTagManager}
        onClose={() => setShowTagManager(false)}
      />
    </View>
  );
});