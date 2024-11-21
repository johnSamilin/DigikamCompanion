import { Button, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import Share from 'react-native-share';
import { Tag } from './Tag';

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

export const ImageInfo = observer(({ currentImage, onTagClick }) => {
	const store = useStore();

	const handleShare = async () => {
		try {
			await Share.open({
				url: currentImage.uri,
			});
		} catch (error) {
			store.addLog(error.message);
		}
	};

	const toggleSelection = () => {
		if (store.userSelectedImages.has(currentImage.id)) {
			store.removeFromUserSelection(currentImage.id);
		} else {
			store.addToUserSelection(currentImage.id);
		}
	};

	return (
		<View style={styles.wrapper}>
			<Text style={styles.name}>
				{currentImage?.uri.replace(store.fileUriPrefix, '')}
			</Text>
			<Text style={styles.name}>
				{store.imagetags.get(currentImage.id)?.map(t => (
					<Tag
						key={t.tagid}
						name={t.tagname}
						onClick={() => onTagClick(t.tagid)}
					/>
				))}
			</Text>
			<View style={styles.button}>
				<Button title="Поделиться" onPress={handleShare} />
			</View>
			{store.userSelectedImages.size > 0 && (
				<View style={styles.button}>
					<Button
						onPress={toggleSelection}
						title={
							store.userSelectedImages.has(currentImage.id)
								? 'Развыбрать'
								: 'Выбрать'
						}
					/>
				</View>
			)}
		</View>
	);
});
