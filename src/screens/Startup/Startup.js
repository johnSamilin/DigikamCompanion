import {
	Text,
	View,
	DrawerLayoutAndroid,
	TouchableOpacity,
	Button,
} from 'react-native';
import { FolderPicker, Gallery } from '@/components/molecules';
import { SafeScreen } from '@/components/template';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/store';
import { CommonActions } from '@react-navigation/native';
import {
	checkManagePermission,
	requestManagePermission,
} from 'manage-external-storage';
import { useEffect, useState } from 'react';

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
	const [isAllowedToManage, setIsAllowed] = useState(0); // 0 - проверка, 1 - ок, 2 - запрещено
	useEffect(() => {
		checkManagePermission().then(isManagePermitted => {
			setIsAllowed(isManagePermitted ? 1 : 2);
		});
	}, []);

	// request rights to manage
	const givePermission = () => {
		requestManagePermission().then(isManagePermitted => {
			setIsAllowed(isManagePermitted ? 1 : 2);
		});
	};

	return (
		<SafeScreen>
			<DrawerLayoutAndroid renderNavigationView={renderDrawerContent}>
				<View>
					{isAllowedToManage === 0 && <Text>Проверка разрешений</Text>}
					{isAllowedToManage === 1 &&
						(!store.rootFolder ? (
							<FolderPicker />
						) : (
							<Gallery navigation={navigation} />
						))}
					{isAllowedToManage === 2 && (
						<Button onPress={givePermission} title="Дать разрешение" />
					)}
				</View>
			</DrawerLayoutAndroid>
		</SafeScreen>
	);
}
export default observer(Startup);
