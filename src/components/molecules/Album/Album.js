import { Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

const styles = {
	album: {
		fontFamily: 'TT Tricks Trial Bold',
		fontSize: 20,
		color: 'black',
	},
	selected: {
		fontFamily: 'SenseFont1.0-Regular',
		fontSize: 15,
		color: 'green',
	},
};

export function Album({
	id,
	albumRoot,
	relativePath,
	isSelected = false,
	onChangeState,
}) {
	const path = relativePath.split('/');
	const level = path.length - 1;
	const name = path[level];
	return (
		<TouchableOpacity onPress={() => onChangeState(!isSelected, id)}>
			<View
				style={{
					padding: 10,
					paddingLeft: level * 15,
				}}
			>
				<Text style={styles.album}>{name}</Text>
				{isSelected && <Text style={styles.selected}>Выбран</Text>}
			</View>
		</TouchableOpacity>
	);
}
