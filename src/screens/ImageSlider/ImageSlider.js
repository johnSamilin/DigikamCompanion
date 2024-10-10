import { SafeScreen } from '@/components/template';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import Gallery from 'react-native-awesome-gallery';

const styles = {};

function ImageSlider({ route }) {
	const { images } = useStore();
	const uris = images.map(({ uri }) => uri);
	const initialIndex = images.reduce((acc, image, index) => {
		if (image.id === route.params.id) {
			return index;
		}

		return acc;
	}, 0);

	return (
		<SafeScreen>
			<Gallery data={uris} initialIndex={initialIndex} numToRender={3} />
		</SafeScreen>
	);
}
export default observer(ImageSlider);
