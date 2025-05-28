import {
  Dimensions,
  Image,
  Text,
  View,
  VirtualizedList,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import { useCallback, useMemo, useRef } from 'react';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { CommonActions } from '@react-navigation/native';
import Share from 'react-native-share';
import { Button } from '@/components/molecules';
import { styles } from './styles';

const screenWidth = Dimensions.get('window').width;
const itemsPerRowPortrat = 3;
const itemsPerRowLandscape = 4;
let itemsPerRow = itemsPerRowPortrat;
let w = screenWidth / itemsPerRow;

styles.picture = {
  width: w,
  height: w,
  backgroundColor: '#ffffff',
};

Dimensions.addEventListener('change', ({ window: { width, height } }) => {
  if (width < height) {
    itemsPerRow = itemsPerRowPortrat;
  } else {
    itemsPerRow = itemsPerRowLandscape;
  }
  w = screenWidth / itemsPerRow;
});

const Picture = observer(({ id, uri, name, onPress }) => {
  const isExist = useRef(true);
  const store = useStore();

  const select = useCallback(() => {
    store.addToUserSelection(id);
  }, []);

  const handlePress = useCallback(() => {
    if (store.userSelectedImages.has(id)) {
      store.removeFromUserSelection(id);
    } else {
      onPress();
    }
  }, [store.userSelectedImages]);

  const imageStyle = useMemo(() => 
    store.userSelectedImages.has(id)
      ? { ...styles.picture, ...styles.pictureSelected }
      : styles.picture
  , [store.userSelectedImages.has(id)]);

  if (!isExist.current) {
    return (
      <View style={styles.picture}>
        <Text>Этого файла нет на диске</Text>
        <Text>{name}</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={handlePress} onLongPress={select}>
      <Image
        style={imageStyle}
        source={{ isStatic: true, uri }}
        onError={() => {
          isExist.current = false;
        }}
        loading="lazy"
        fadeDuration={0}
      />
    </TouchableOpacity>
  );
});

const Row = observer(({ item, onPress }) => {
  return (
    <View style={styles.row}>
      {item.map((pic, i) => (
        <Picture
          key={pic?.id ?? Math.random()}
          uri={pic.uri}
          name={pic.name}
          onPress={() => onPress(pic.id)}
          id={pic?.id}
        />
      ))}
    </View>
  );
});

export const Gallery = observer(({ navigation }) => {
  const store = useStore();

  const openFilters = useCallback(() => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Filter',
      }),
    );
  }, [navigation]);

  const showImage = useCallback((imageId) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'ImageSlider',
        params: {
          id: imageId,
        },
      }),
    );
  }, [navigation]);

  const handleShare = useCallback(async () => {
    try {
      const urls = store.images.reduce((acc, image) => {
        if (store.userSelectedImages.has(image.id)) {
          acc.push(image.uri);
        }
        return acc;
      }, []);

      await Share.open({ urls });
    } catch (error) {
      store.addLog(error.message);
    }
  }, [store.images, store.userSelectedImages]);

  const getItem = useCallback((data, index) => 
    store.images.slice(
      index * itemsPerRow,
      index * itemsPerRow + itemsPerRow,
    )
  , [store.images]);

  const getItemCount = useCallback(() => 
    Math.ceil(store.images.length / itemsPerRow)
  , [store.images.length]);

  const keyExtractor = useCallback(item => 
    item[0]?.uri || Math.random().toString()
  , []);

  return (
    <View style={styles.wrapper}>
      <>
        <View style={styles.titleWrapper}>
          {store.userSelectedImages.size > 0 && (
            <TouchableOpacity onPress={store.addAllToUserSelection}>
              <Text style={styles.title}>Выбрать все</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>
            {store.userSelectedImages.size > 0
              ? `${store.userSelectedImages.size} / `
              : ''}
            {store.images.length} фото
          </Text>
          {store.userSelectedImages.size > 0 && (
            <TouchableOpacity onPress={store.dropUserSelection}>
              <Text style={styles.title}>Развыбрать все</Text>
            </TouchableOpacity>
          )}
        </View>
        {store.images.length > 0 ? (
          <VirtualizedList
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={5}
            removeClippedSubviews={true}
            renderItem={props => (
              <Row
                {...props}
                maxIndex={store.images.length}
                onPress={showImage}
              />
            )}
            keyExtractor={keyExtractor}
            getItemCount={getItemCount}
            getItem={getItem}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Откройте фильтры, чтобы показать фото</Text>
          </View>
        )}
      </>
      <View style={styles.filterBtn}>
        <View style={styles.button}>
          <Button onPress={openFilters} title="Фильтр" color="#00ff00" textColor="#000000" />
        </View>
        {store.userSelectedImages.size > 0 && (
          <View style={styles.button}>
            <Button onPress={handleShare} title="Поделиться" />
          </View>
        )}
      </View>
      {store.isPermissionDenied && (
        <Text style={styles.emptyStateText}>
          Пожалуйста, разрешите приложению доступ ко всем файлам (в настройках
          приложения)
        </Text>
      )}
    </View>
  );
});