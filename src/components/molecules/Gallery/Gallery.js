import {
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
import { Filters } from '../Filters/Filters';
import { CommonActions } from '@react-navigation/native';

const screenWidth = Dimensions.get('window').width;
const itemsPerRow = 3;
const w = screenWidth / itemsPerRow;

function Picture({ uri, name }) {
	const isExist = useRef(true);
	const pictureStyle = {
		width: w,
		height: w,
		borderWidth: 1,
		borderColor: 'white',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
	};

	return isExist.current ? (
		<Image
			style={pictureStyle}
			source={{ isStatic: true, uri }}
			onError={() => {
				isExist.current = false;
			}}
		/>
	) : (
		<View style={pictureStyle}>
			<Text>Этого файла нет на диске</Text>
			<Text>{name}</Text>
		</View>
	);
}

function Row({ item }) {
	return (
		<View style={{ display: 'flex', flexDirection: 'row' }}>
			{item.map((pic, i) => (
				<Picture key={pic?.id ?? Math.random()} uri={pic.uri} name={pic.name} />
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

	return (
		<View>
			{/* <RNGallery data={store.images.map(i => i.uri)} /> */}
			{store.images.length > 0 ? (
				<>
					<VirtualizedList
						initialNumToRender={4}
						renderItem={props => (
							<Row {...props} maxIndex={store.images.length} />
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
					<TouchableOpacity onPress={openFilters}>
						<View
							style={{
								backgroundColor:
									store.activeFilters.albumIds?.length ||
										store.activeFilters.tagIds?.length
										? 'green'
										: 'coral',
								position: 'absolute',
								bottom: 0,
								left: 0,
								right: 0,
								padding: 20,
							}}
						>
							<Text
								style={{
									fontFamily: 'TT Tricks Trial Bold',
									fontSize: 30,
									color: 'black',
									textAlign: 'center',
									width: '100%',
								}}
							>
								Фильтры
							</Text>
						</View>
					</TouchableOpacity>
				</>
			) : null}
			{store.isPermissionDenied && (
				<Text>
					Пожалуйста, разрешите приложению доступ ко всем файлам (в настройках
					приложения)
				</Text>
			)}
		</View>
	);
});
