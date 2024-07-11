import { Text, View } from 'react-native';

export function Album({ id, albumRoot, relativePath }) {
	const path = relativePath.split('/');
	const level = path.length - 1;
	const name = path[level];
	return (
		<View
			style={{
				padding: 10,
				paddingLeft: level * 15,
			}}
		>
			<Text style={{ fontFamily: 'TT Tricks Trial Bold', fontSize: 30, color: 'black' }}>
				{name}
			</Text>
			<Text style={{ fontFamily: 'SenseFont1.0-Regular', fontSize: 20, color: 'gray' }}>
				10 photos
			</Text>
		</View>
	);
}
