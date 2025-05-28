import {
  Text,
  View,
  Button,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeScreen } from '@/components/template';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import { CommonActions } from '@react-navigation/native';
import { Album } from '@/components/molecules';
import { useMemo, useState } from 'react';
import { styles } from './styles';

function Filter({ navigation }) {
  const store = useStore();
  const [activeTab, setActiveTab] = useState('tags');

  const albums = useMemo(() => {
    const list = [];
    store.albums.forEach(a => list.push(a));
    return list;
  }, [store.albums]);

  const tags = useMemo(() => {
    const list = [];
    store.tags.forEach(tag => list.push(tag));
    return list;
  }, [store.tags]);

  const search = () => {
    store.selectPhotos({
      albumIds: [...store.activeFilters.albumIds],
      tagIds: [...store.activeFilters.tagIds],
    });
    navigation.dispatch(CommonActions.goBack());
  };

  const toggleAlbum = (newState, id) => {
    if (newState === true) {
      store.addAlbumToFilters(id);
    } else {
      store.removeAlbumFromFilters(id);
    }
  };

  const toggleTag = (newState, id) => {
    if (newState === true) {
      store.addTagToFilters(id);
    } else {
      store.removeTagFromFilters(id);
    }
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <View style={styles.tabs}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'tags' && styles.activeTab,
            ]}
            onPress={() => setActiveTab('tags')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'tags' && styles.activeTabText,
              ]}
            >
              Tags
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'albums' && styles.activeTab,
            ]}
            onPress={() => setActiveTab('albums')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'albums' && styles.activeTabText,
              ]}
            >
              Albums
            </Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content}>
          {activeTab === 'tags' ? (
            <View>
              {tags.map(tag => (
                <Album
                  key={tag.id}
                  id={tag.id}
                  relativePath={tag.name}
                  isSelected={store.activeFilters.tagIds.has(tag.id)}
                  onChangeState={toggleTag}
                />
              ))}
            </View>
          ) : (
            <View>
              {albums.map(album => (
                <Album
                  key={album.id}
                  {...album}
                  isSelected={store.activeFilters.albumIds.has(album.id)}
                  onChangeState={toggleAlbum}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.buttonsWrapper}>
          <View style={styles.button}>
            <Button title="Search" onPress={search} />
          </View>
          {store.isFilterApplied && (
            <View style={styles.button}>
              <Button
                title="Reset"
                onPress={store.resetFilters}
                color="#ef4444"
              />
            </View>
          )}
        </View>
      </View>
    </SafeScreen>
  );
}

export default observer(Filter);