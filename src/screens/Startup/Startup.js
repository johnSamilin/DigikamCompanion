import {
	Text,
	View,
	DrawerLayoutAndroid,
	TouchableOpacity,
} from 'react-native';
import { FolderPicker, Gallery } from '@/components/molecules';
import { SafeScreen } from '@/components/template';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import { CommonActions } from '@react-navigation/native';

function Startup({ navigation }) {
	const renderDrawerContent = () => {
		return (
			<TouchableOpacity
				onPress={() => {
					navigation.dispatch(
						CommonActions.navigate({
							name: 'SystemMessages',
						}),
					);
				}}
			>
				<View
					style={{
						padding: 20,
					}}
				>
					<Text
						style={{
							fontFamily: 'TT Tricks Trial Bold',
							fontSize: 20,
							color: 'black',
						}}
					>
						Системные сообщения
					</Text>
				</View>
			</TouchableOpacity>
		);
	};
	const store = useStore();

	return (
		<SafeScreen>
			<DrawerLayoutAndroid renderNavigationView={renderDrawerContent}>
				<View>
					{!store.rootFolder ? (
						<FolderPicker />
					) : (
						<Gallery navigation={navigation} />
					)}
				</View>
			</DrawerLayoutAndroid>
		</SafeScreen>
	);
}
export default observer(Startup);
