import { Button, Text, ToastAndroid, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import Share from 'react-native-share';

const styles = {
	wrapper: {
		display: 'flex',
		flexDirection: 'column',
		height: '100%',
		paddingTop: 10,
		paddingBottom: 10,
		paddingLeft: 10,
		paddingRight: 10,
		alignItems: 'center',
	},
	name: {
		textAlign: 'center',
		color: 'black',
	},
	button: {
		minWidth: '25%',
		maxWidth: '50%',
		marginTop: 10,
	},
};

export const ImageInfo = observer(({ currentImage }) => {
	const { fileUriPrefix, addLog } = useStore();

	const handleShare = async () => {
		try {
			await Share.open({
				url: currentImage.uri,
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
		<View style={styles.wrapper}>
			<Text style={styles.name}>
				{currentImage?.uri.replace(fileUriPrefix, '')}
			</Text>
			<View style={styles.button}>
				<Button title="Share" onPress={handleShare} />
			</View>
		</View>
	);
});
