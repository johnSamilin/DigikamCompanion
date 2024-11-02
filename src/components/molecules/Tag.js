import { Pressable, Text, View } from 'react-native';

const styles = {
	wrapper: {
		paddingTop: 5,
		paddingBottom: 5,
		paddingLeft: 5,
		paddingRight: 5,
		alignItems: 'center',
		borderBottomColor: 'black',
		borderBottomWidth: 2,
	},
	name: {
		textAlign: 'center',
		color: 'black',
	},
};

export function Tag({ onClick, name }) {
	return (
		<View style={styles.wrapper}>
			<Pressable onPress={onClick}>
				<Text style={styles.name}>{name}</Text>
			</Pressable>
		</View>
	);
}
