import { Text, ScrollView } from 'react-native';
import { SafeScreen } from '@/components/template';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';

export const SystemMessages = observer(() => {
	const store = useStore();

	return (
		<SafeScreen>
			<ScrollView>
				{store.log.map(line => (
					<Text key={line}>{line}</Text>
				))}
			</ScrollView>
		</SafeScreen>
	);
});
