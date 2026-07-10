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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PagerView from 'react-native-pager-view';
import { styles } from './styles';

function Filter({ navigation }) {
  const store = useStore();
  const [activeTab, setActiveTab] = useState(0);
  const pagerRef = useRef(null);
  const { width } = useWindowDimensions();

  // Depth of descendants below a tag: leaf = 0, children only = 1,
  // grandchildren = 2, and so on.
  const getDescendantDepth = useCallback((tag) => {
    if (!tag.children || tag.children.length === 0) {
      return 0;
    }
    return 1 + Math.max(...tag.children.map(getDescendantDepth));
  }, []);

  // By default expand every tag that has children, EXCEPT branches whose
  // subtree is deeper than 2 levels of descendants — those start collapsed.
  const defaultExpandedTags = useMemo(() => {
    const expanded = new Set();
    const walk = (tag) => {
      const hasChildren = tag.children && tag.children.length > 0;
      if (hasChildren && getDescendantDepth(tag) <= 2) {
        expanded.add(tag.id);
      }
      if (hasChildren) {
        tag.children.forEach(walk);
      }
    };
    store.tagTree.forEach(walk);
    return expanded;
  }, [store.tagTree, getDescendantDepth]);

  const [expandedTags, setExpandedTags] = useState(defaultExpandedTags);

  // Re-apply defaults whenever the computed default set changes
  // (e.g. tags finished loading from the database).
  useEffect(() => {
    setExpandedTags(defaultExpandedTags);
  }, [defaultExpandedTags]);

  // By default expand every album that has children, EXCEPT branches whose
  // subtree is deeper than 2 levels of descendants — those start collapsed.
  // Album hierarchy is encoded in relativePath (e.g. "/2024/01").
  const defaultExpandedAlbums = useMemo(() => {
    const albumList = Array.from(store.albums.values());

    // Depth of descendants below an album path: no children = 0,
    // direct children only = 1, grandchildren = 2, and so on.
    const getAlbumDepth = (relativePath) => {
      const ownSegments = relativePath.split('/').length;
      let maxDepth = 0;
      albumList.forEach(album => {
        if (album.relativePath.startsWith(relativePath + '/')) {
          const depth = album.relativePath.split('/').length - ownSegments;
          if (depth > maxDepth) {
            maxDepth = depth;
          }
        }
      });
      return maxDepth;
    };

    const expanded = new Set();
    albumList.forEach(album => {
      const depth = getAlbumDepth(album.relativePath);
      if (depth > 0 && depth <= 2) {
        expanded.add(album.id);
      }
    });
    return expanded;
  }, [store.albums]);

  const [expandedAlbums, setExpandedAlbums] = useState(defaultExpandedAlbums);

  // Re-apply defaults whenever the computed default set changes
  // (e.g. albums finished loading from the database).
  useEffect(() => {
    setExpandedAlbums(defaultExpandedAlbums);
  }, [defaultExpandedAlbums]);

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