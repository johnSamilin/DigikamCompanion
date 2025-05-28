import {
  Button,
  Dimensions,
  Image,
  Text,
  View,
  VirtualizedList,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import { useCallback, useRef } from 'react';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { CommonActions } from '@react-navigation/native';
import Share from 'react-native-share';
import { styles } from './styles';

const screenWidth = Dimensions.get('window').width;
const itemsPerRowPortrat = 4;
const itemsPerRowLandscape = 6;
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
  }, []);

  return isExist.current ? (
    <TouchableOpacity onPress={handlePress} onLongPress={select}>
      <Image
        style={
          store.userSelectedImages.has(id)
            ? { ...styles.picture, ...styles.pictureSelected }
            : styles.picture
        }
        source={{ isStatic: true, uri }}
        onError={() => {
          isExist.current = false;
        }}
      />
    </TouchableOpacity>
  ) : (
    <View style={styles.picture}>
      <Text>Этого файла нет на диске</Text>
      <Text>{name}</Text>
    </View>
  );
});

function Row({ item, onPress }) {
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
}

export const Gallery = observer(({ navigation }) => {
  const store = useStore();

  const openFilters = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Filter',
      }),
    );
  };

  const showImage = imageId => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'ImageSlider',
        params: {
          id: imageId,
        },
      }),
    );
  };

  const handleShare = async () => {
    try {
      await Share.open({
        urls: store.images.reduce((acc, image) => {
          if (store.userSelectedImages.has(image.id)) {
            acc.push(image.uri);
          }

          return acc;
        }, []),
      });
    } catch (error) {
      store.addLog(error.message);
    }
  };

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
            initialNumToRender={4}
            renderItem={props => (
              <Row
                {...props}
                maxIndex={store.images.length}
                onPress={showImage}
              />
            )}
            keyExtractor={item => item[0]?.uri}
            getItemCount={() => Math.ceil(store.images.length)}
            getItem={(data, index) =>
              store.images.slice(
                index * itemsPerRow,
                index * itemsPerRow + itemsPerRow,
              )
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Откройте фильтры, чтобы показать фото</Text>
          </View>
        )}
      </>
      <View style={styles.filterBtn}>
        <View style={styles.button}>
          <Button onPress={openFilters} title="Фильтр" />
        </View>
        {store.userSelectedImages.size > 0 && (
          <View style={styles.button}>
            <Button onPress={handleShare} title="Поделиться" />
          </View>
        )}
      </View>
      {store.isPermissionDenied && (
        <Text>
          Пожалуйста, разрешите приложению доступ ко всем файлам (в настройках
          приложения)
        </Text>
      )}
    </View>
  );
});