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
import { CommonActions, useNavigation } from '@react-navigation/native';
import { Album } from '@/components/molecules';
import { useMemo } from 'react';
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
			<Gallery data={uris} initialIndex={initialIndex} />
		</SafeScreen>
	);
}
export default observer(ImageSlider);
