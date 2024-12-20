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

const styles = {
	centerWrapper: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 10,
		height: '100%',
	},
	text: {
		color: 'black',
		textAlign: 'center',
		marginBottom: 10,
	},
	drawerText: {
		fontFamily: 'TT Tricks Trial Bold',
		fontSize: 20,
		color: 'black',
		padding: 10,
	},
	drawer: {
		padding: 20,
	},
};

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
				<View style={styles.drawer}>
					<Text style={styles.drawerText}>Системные сообщения</Text>
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
							<View style={styles.centerWrapper}>
								<Text style={styles.text}>
									Теперь нужно указать корневую папку, где находятся фотографии
									(и база данных Digikam).
								</Text>
								<FolderPicker />
							</View>
						) : (
							<Gallery navigation={navigation} />
						))}
					{isAllowedToManage === 2 && (
						<View style={styles.centerWrapper}>
							<Text style={styles.text}>
								У приложения нет разрешения на управление файлами. Без него не
								получится.
							</Text>
							<Button onPress={givePermission} title="Дать разрешение" />
						</View>
					)}
				</View>
			</DrawerLayoutAndroid>
		</SafeScreen>
	);
}
export default observer(Startup);
