import {
	Text,
	View,
	DrawerLayoutAndroid,
	TouchableOpacity,
	Button,
	ScrollView,
} from 'react-native';
import { SafeScreen } from '@/components/template';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import { CommonActions } from '@react-navigation/native';
import { Album } from '@/components/molecules';
import { useMemo } from 'react';

const styles = {
	bottomBtn: {
		flexGrow: 1,
	},
	sectionTitle: {
		fontFamily: 'SenseFont1.0-Regular',
		fontSize: 40,
		color: 'red',
		textAlign: 'center',
	},
	buttonsWrapper: {
		display: 'flex',
		flexDirection: 'row',
		position: 'absolute',
		right: 20,
		bottom: 60,
	},
	button: {
		marginLeft: 20,
	},
};

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
			<ScrollView>
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
					<Button
						style={styles.button}
						title="Сбросить"
						onPress={store.resetFilters}
					/>
				)}
			</View>
		</SafeScreen>
	);
}
export default observer(Filter);
