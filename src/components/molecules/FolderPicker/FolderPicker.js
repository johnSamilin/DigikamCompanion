import { Button, Text, ToastAndroid, View } from 'react-native';
import { pickDirectory } from 'react-native-document-picker';
import { MMKV } from '@/services/useInternalStorage';
import { useMMKVStorage } from 'react-native-mmkv-storage';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';

export const FolderPicker = observer(() => {
	// const [rootFolder, setRootFolder] = useMMKVStorage('root-folder', MMKV, null);
	const store = useStore();

	const pickDir = () => {
		pickDirectory()
			.then(({ uri }) => {
				ToastAndroid.show(uri, ToastAndroid.LONG);
				store.setRootFolder(uri);
			})
			.catch(er => {
				ToastAndroid.show(`ERROR ${JSON.stringify(er)}`, ToastAndroid.LONG);
			});
	};
	return (
		<View testID="brand-img-wrapper">
			<Button onPress={pickDir} title="Выбрать папку" />
		</View>
	);
});
