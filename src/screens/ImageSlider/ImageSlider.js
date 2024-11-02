import { SafeScreen } from '@/components/template';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import Gallery from 'react-native-awesome-gallery';
import { useState } from 'react';
import { Button, Modal, Text, ToastAndroid, View } from 'react-native';
import { ImageInfo } from '@/components/molecules/ImageInfo';

const styles = {
	wrapper: {
		height: '100%',
		width: '100%',
	},
	infoWrapper: {
		display: 'flex',
		flexDirection: 'column',
		bottom: 0,
		width: '90%',
		left: '5%',
		borderRadius: 5,
		position: 'absolute',
		backgroundColor: 'beige',
	},
	infoWrapperHidden: {
		height: 45,
		bottom: -5,
	},
	tagModalContent: {
		backgroundColor: 'beige',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		bottom: 0,
		width: '90%',
		borderRadius: 5,
		paddingTop: 10,
		paddingBottom: 10,
		paddingLeft: 10,
		paddingRight: 10,
	},
	tagModalWrapper: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		height: '100%',
	},
	modalButton: {
		margin: 5,
	},
	modalTagName: {
		fontSize: 20,
		color: 'black',
	},
};

function ImageSlider({ route }) {
	const store = useStore();
	const [selectedImage, setSelectedImage] = useState();
	let initialIndex = 0;
	const uris = store.images.map(({ uri, id }, index) => {
		if (id === route.params.id) {
			initialIndex = index;
		}

		return uri;
	});

	const onChangeImage = index => {
		setSelectedImage(store.images[index]);
	};

	const [isPanelShown, setPanelState] = useState(false);
	const showPanel = () => {
		setPanelState(true);
	};
	const hidePanel = () => {
		setPanelState(false);
	};

	const [modalVisible, setModalVisible] = useState(false);
	const [selectedTag, setSelectedTag] = useState();
	const [isInProcess, setProcess] = useState(false);
	const showTagsModal = tagid => {
		const tag = store.tags.get(tagid);
		if (tag) {
			setSelectedTag(tag);
			setModalVisible(true);
		} else {
			ToastAndroid.show('Такого тега не нашли', ToastAndroid.LONG);
		}
	};
	const hideTagsModal = () => {
		setModalVisible(false);
	};

	const removeTag = async () => {
		setProcess(true);
		store
			.removeTagFromPhoto(selectedTag.id, selectedImage.id)
			.then(() => {
				hideTagsModal();
			})
			.catch(() => {
				ToastAndroid.show('Не получилось удалить тег', ToastAndroid.LONG);
			})
			.finally(() => {
				setProcess(false);
			});
	};

	return (
		<SafeScreen>
			<View style={styles.wrapper} onTouchStart={hidePanel}>
				<Gallery
					data={uris}
					initialIndex={initialIndex}
					numToRender={3}
					onIndexChange={onChangeImage}
				/>
			</View>
			<View
				style={
					isPanelShown
						? styles.infoWrapper
						: { ...styles.infoWrapper, ...styles.infoWrapperHidden }
				}
				onTouchStart={showPanel}
			>
				{selectedImage && (
					<ImageInfo currentImage={selectedImage} onTagClick={showTagsModal} />
				)}
			</View>
			<Modal animationType="none" transparent visible={modalVisible}>
				<View style={styles.tagModalWrapper}>
					<View style={styles.tagModalContent}>
						<Text style={styles.modalTagName}>Тег {selectedTag?.name}</Text>
						{isInProcess && <Text>Обработка...</Text>}
						<View style={styles.modalButton}>
							<Button title="Удалить" onPress={removeTag} />
						</View>
						<View style={styles.modalButton}>
							<Button
								style={styles.modalButton}
								title="Найти все фото"
								onPress={hideTagsModal}
							/>
						</View>
						<View style={styles.modalButton}>
							<Button
								style={styles.modalButton}
								title="Закрыть"
								onPress={hideTagsModal}
							/>
						</View>
					</View>
				</View>
			</Modal>
		</SafeScreen>
	);
}
export default observer(ImageSlider);
