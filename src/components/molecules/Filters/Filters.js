import { useStore } from '@/store';
import { observer } from 'mobx-react-lite';
import { Text, View } from 'react-native';

export const Filters = observer(() => {
	const store = useStore();

	return (
		<View>
			<Text>O HAI</Text>
		</View>
	);
});
