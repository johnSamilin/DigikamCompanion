import { SafeScreen } from '@/components/template';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import Gallery from 'react-native-awesome-gallery';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
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
		width: '100%',
		position: 'absolute',
		backgroundColor: 'white',
	},
	infoWrapperHidden: {
		height: 45,
	},
};

function ImageSlider({ route }) {
	const { images } = useStore();
	const [selectedImage, setSelectedImage] = useState();
	let initialIndex = 0;
	const uris = images.map(({ uri, id }, index) => {
		if (id === route.params.id) {
			initialIndex = index;
		}

		return uri;
	});

	const onChangeImage = index => {
		setSelectedImage(images[index]);
	};

	const [isPanelShown, setPanelState] = useState(false);
	const showPanel = () => {
		setPanelState(true);
	};
	const hidePanel = () => {
		setPanelState(false);
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
				{selectedImage && <ImageInfo currentImage={selectedImage} />}
			</View>
		</SafeScreen>
	);
}
export default observer(ImageSlider);
