import {
	Button,
	Dimensions,
	Image,
	SafeAreaView,
	ScrollView,
	Text,
	ToastAndroid,
	View,
	VirtualizedList,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import { useEffect, useRef, useState } from 'react';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { CommonActions } from '@react-navigation/native';
import { Filters } from '../Filters/Filters';

const screenWidth = Dimensions.get('window').width;
const itemsPerRowPortrat = 4;
const itemsPerRowLandscape = 6;
let itemsPerRow = itemsPerRowPortrat;
let w = screenWidth / itemsPerRow;

Dimensions.addEventListener('change', ({ window: { width, height } }) => {
	if (width < height) {
		itemsPerRow = itemsPerRowPortrat;
	} else {
		itemsPerRow = itemsPerRowLandscape;
	}

	// TODO: поворот
	w = screenWidth / itemsPerRow;
});

const styles = {
	wrapper: {
		display: 'flex',
		flexDirection: 'column',
		height: '100%',
	},
	row: {
		display: 'flex',
		flexDirection: 'row',
	},
	filterBtn: {
		position: 'absolute',
		right: 20,
		bottom: 60,
	},
	title: {
		fontSize: 15,
		fontWeight: 'bold',
		paddingTop: 10,
		paddingBottom: 10,
		textAlign: 'center',
	},
	picture: {
		width: w,
		height: w,
		borderWidth: 1,
		borderColor: 'white',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyState: {
		flexGrow: 1,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
	},
};

function Picture({ uri, name, onPress }) {
	const isExist = useRef(true);

	return isExist.current ? (
		<TouchableOpacity onPress={onPress}>
			<Image
				style={styles.picture}
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
}

function Row({ item, onPress }) {
	return (
		<View style={styles.row}>
			{item.map((pic, i) => (
				<Picture
					key={pic?.id ?? Math.random()}
					uri={pic.uri}
					name={pic.name}
					onPress={() => onPress(pic.id)}
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

	return (
		<View style={styles.wrapper}>
			{/* <RNGallery data={store.images.map(i => i.uri)} /> */}
			<>
				<Text style={styles.title}>{store.images.length} фото</Text>
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
						<Text>А фото-то и нет...</Text>
						<Text>Ну или запрос в БД еще не завершен</Text>
					</View>
				)}
			</>
			<View style={styles.filterBtn}>
				<Button onPress={openFilters} title="Фильтр" />
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
