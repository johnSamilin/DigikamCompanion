export const isImageSourcePropType = value => {
	return !!(
		typeof value === 'number' ||
		(typeof value === 'object' &&
			value &&
			(('testUri' in value && typeof value.testUri === 'string') ||
				('uri' in value && typeof value.uri === 'string')))
	);
};
