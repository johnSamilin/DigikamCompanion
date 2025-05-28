import {
  Text,
  View,
  Button,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeScreen } from '@/components/template';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import { CommonActions } from '@react-navigation/native';
import { Album } from '@/components/molecules';
import { useMemo } from 'react';

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
    marginTop: 24,
  },
  buttonsWrapper: {
    flexDirection: 'row',
    position: 'absolute',
    right: 20,
    bottom: 30,
    gap: 12,
  },
  button: {
    minWidth: 100,
  },
  buttonContainer: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: '#ef4444',
  }
});

function Filter({ navigation }) {
	const store = useStore();

	const albums = useMemo(() => {
		const list = [];
		store.albums.forEach(a => list.push(a));

		return list;
	}, [store.albums]);

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
			<ScrollView style={styles.wrapper}>
				<Text style={styles.sectionTitle}>Tags</Text>
				{[...store.tags].map(([id, tag]) => (
					<Album
						key={tag.id}
						id={tag.id}
						relativePath={tag.name}
						isSelected={store.activeFilters.tagIds.has(tag.id)}
						onChangeState={toggleTag}
					/>
				))}
				<Text style={styles.sectionTitle}>Albums</Text>
				{albums.map(album => (
					<Album
						key={album.id}
						{...album}
						isSelected={store.activeFilters.albumIds.has(album.id)}
						onChangeState={toggleAlbum}
					/>
				))}
			</ScrollView>
			<View style={styles.buttonsWrapper}>
				<Button title="Найти" onPress={search} />
				{store.isFilterApplied && (
					<View style={styles.button}>
						<Button title="Сбросить" onPress={store.resetFilters} />
					</View>
				)}
			</View>
		</SafeScreen>
	);
}
export default observer(Filter);