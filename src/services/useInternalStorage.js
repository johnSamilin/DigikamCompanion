import { useEffect, useState } from 'react';
import { MMKVLoader } from 'react-native-mmkv-storage';

export const MMKV = new MMKVLoader().initialize();

export const useInternalStorage = () => {
	const [instance, setInstance] = useState();

	useEffect(() => {
		if (MMKV) {
			setInstance(MMKV);
		}
	}, []);

	return instance;
};
