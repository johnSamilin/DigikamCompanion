import {
  Text,
  View,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { SafeScreen } from '@/components/template';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import { CommonActions } from '@react-navigation/native';
import { Album, TagTree, Button } from '@/components/molecules';
import { useCallback, useMemo, useRef, useState } from 'react';
import PagerView from 'react-native-pager-view';
import { styles } from './styles';

function Filter({ navigation }) {
  const store = useStore();
  const [activeTab, setActiveTab] = useState(0);
  const [expandedTags, setExpandedTags] = useState(new Set());
  const [expandedAlbums, setExpandedAlbums] = useState(new Set());
  const pagerRef = useRef(null);
  const { width } = useWindowDimensions();

  const albums = useMemo(() => {
    // Get only root level albums (those without parent paths)
    const rootAlbums = [];
    store.albums.forEach(album => {
      const pathParts = album.relativePath.split('/').filter(part => part.length > 0);
      if (pathParts.length === 1) { // Root level album
        rootAlbums.push(album);
      }
    });
    return rootAlbums.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
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

  const toggleTagExpansion = useCallback((tagId, shouldExpand) => {
    setExpandedTags(prev => {
      const newSet = new Set(prev);
      if (shouldExpand) {
        newSet.add(tagId);
      } else {
        newSet.delete(tagId);
      }
      return newSet;
    });
  }, []);

  const toggleAlbumExpansion = useCallback((albumId, shouldExpand) => {
    setExpandedAlbums(prev => {
      const newSet = new Set(prev);
      if (shouldExpand) {
        newSet.add(albumId);
      } else {
        newSet.delete(albumId);
      }
      return newSet;
    });
  }, []);

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
                level={0}
                isSelected={store.activeFilters.tagIds.has(tag.id)}
                onChangeState={toggleTag}
                expandedTags={expandedTags}
                onToggleExpansion={toggleTagExpansion}
              />
            ))}
          </ScrollView>

          <ScrollView key="2" style={{ width }}>
            {albums.map(album => (
              <Album
                key={album.id}
                {...album}
                level={0}
                isSelected={store.activeFilters.albumIds.has(album.id)}
                onChangeState={toggleAlbum}
                expandedAlbums={expandedAlbums}
                onToggleExpansion={toggleAlbumExpansion}
              />
            ))}
          </ScrollView>
        </PagerView>

        <View style={styles.buttonsWrapper}>
          <Button 
            title="Search" 
            onPress={search}
            color="#00ff00"
            textColor="#000000"
          />
          {store.isFilterApplied && (
            <Button
              title="Reset"
              onPress={store.resetFilters}
              color="#ff0000"
            />
          )}
        </View>
      </View>
    </SafeScreen>
  );
}

export default observer(Filter);