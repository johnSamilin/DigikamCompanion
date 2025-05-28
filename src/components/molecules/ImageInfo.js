import { Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import Share from 'react-native-share';
import { Tag } from './Tag';
import { Button } from '@/components/molecules';
import { styles } from './ImageInfo.styles';

export const ImageInfo = observer(({ currentImage, onTagClick }) => {
  const store = useStore();

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
          title="Поделиться" 
          onPress={handleShare}
          color="#00ff00"
          textColor="#000000"
        />
        {store.userSelectedImages.size > 0 && (
          <Button
            onPress={toggleSelection}
            title={store.userSelectedImages.has(currentImage.id) ? 'Развыбрать' : 'Выбрать'}
            color={store.userSelectedImages.has(currentImage.id) ? '#ff0000' : '#1a1a1a'}
          />
        )}
      </View>
    </View>
  );
});