export default ({ layout, backgrounds, fonts }) => {
	return {
		buttonCircle: {
			...layout.justifyCenter,
			...layout.itemsCenter,
			...backgrounds.purple100,
			...fonts.gray400,
			height: 70,
			width: 70,
			borderRadius: 35,
		},
		circle250: {
			borderRadius: 140,
			height: 250,
			width: 250,
		},
	};
};
