import {
	Text,
	View,
	DrawerLayoutAndroid,
	TouchableOpacity,
} from 'react-native';
import { SafeScreen } from '@/components/template';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import { Filters } from '@/components/molecules';

function Filter({ navigation }) {
	const store = useStore();

	return (
		<SafeScreen>
            <Filters />
            
		</SafeScreen>
	);
}
export default observer(Filter);
