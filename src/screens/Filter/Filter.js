import {
  Text,
  View,
  Button,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { SafeScreen } from '@/components/template';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import { CommonActions } from '@react-navigation/native';
import { Album, TagTree } from '@/components/molecules';
import { useCallback, useMemo, useRef, useState } from 'react';
import PagerView from 'react-native-pager-view';
import { styles } from './styles';

function Filter({ navigation }) {
  const store = useStore();
  const [activeTab, setActiveTab] = useState(0);
  const pagerRef = useRef(null);
  const { width } = useWindowDimensions();

  const albums = useMemo(() => {
    const list = [];
    store.albums.forEach(a => list.unshift(a));
    return list;
  }, [store.albums]);

  const rootTags = useMemo(() => {
    const list = [];
    store.tagTree.forEach(tag => list.unshift(tag));
    return list;
  }, [store.tagTree]);

  const search = useCallback(() => {
    store.selectPhotos({
      albumIds: [...store.activeFilters.albumIds],
      tagIds: [...store.activeFilters.tagIds],
    });
    navigation.dispatch(CommonActions.goBack());
  }, [store.activeFilters, navigation]);

  const toggleAlbum = useCallback((newState, id) => {
    if (newState) {
      store.addAlbumToFilters(id);
    } else {
      store.removeAlbumFromFilters(id);
    }
  }, [store]);

  const toggleTag = useCallback((newState, id) => {
    if (newState) {
      store.addTagToFilters(id);
    } else {
      store.removeTagFromFilters(id);
    }
  }, [store]);

  const onTabPress = useCallback((index) => {
    setActiveTab(index);
    pagerRef.current?.setPage(index);
  }, []);

  const onPageSelected = useCallback((e) => {
    setActiveTab(e.nativeEvent.position);
  }, []);

  return (
    <SafeScreen>
      <View style={styles.container}>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === 0 && styles.activeTab]}
            onPress={() => onTabPress(0)}
          >
            <Text style={[styles.tabText, activeTab === 0 && styles.activeTabText]}>
              Tags
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 1 && styles.activeTab]}
            onPress={() => onTabPress(1)}
          >
            <Text style={[styles.tabText, activeTab === 1 && styles.activeTabText]}>
              Albums
            </Text>
          </Pressable>
        </View>

        <PagerView
          ref={pagerRef}
          style={styles.pagerView}
          initialPage={0}
          onPageSelected={onPageSelected}
        >
          <ScrollView key="1" style={{ width }}>
            {rootTags.map(tag => (
              <TagTree
                key={tag.id}
                tag={tag}
                isSelected={store.activeFilters.tagIds.has(tag.id)}
                onChangeState={toggleTag}
              />
            ))}
          </ScrollView>

          <ScrollView key="2" style={{ width }}>
            {albums.map(album => (
              <Album
                key={album.id}
                {...album}
                isSelected={store.activeFilters.albumIds.has(album.id)}
                onChangeState={toggleAlbum}
              />
            ))}
          </ScrollView>
        </PagerView>

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