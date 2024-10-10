import { SafeScreen } from '@/components/template';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import Gallery from 'react-native-awesome-gallery';
import { useRef } from 'react';
import Share from 'react-native-share';
import { ToastAndroid } from 'react-native';

const styles = {};

function ImageSlider({ route }) {
	const { images, addLog } = useStore();
	const currentImage = useRef(null);
	let initialIndex = 0;
	const uris = images.map(({ uri, id }, index) => {
		if (id === route.params.id) {
			initialIndex = index;
		}

		return uri;
	});

	const onChangeImage = index => {
		currentImage.current = images[index];
	};

	const onLongTap = async () => {
		try {
			await Share.open({
				url: currentImage.current.uri,
			});
		} catch (error) {
			addLog(error.message);
			ToastAndroid.show(
				'Что-то не так. см. Системные сообщения',
				ToastAndroid.LONG,
			);
		}
	};

	return (
		<SafeScreen>
			<Gallery
				data={uris}
				initialIndex={initialIndex}
				numToRender={3}
				onLongPress={onLongTap}
				onIndexChange={onChangeImage}
			/>
		</SafeScreen>
	);
}
export default observer(ImageSlider);
