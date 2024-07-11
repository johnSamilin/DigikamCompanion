import { useMemo } from 'react';
import { Image } from 'react-native';
import { useTheme } from '@/theme';

function ImageVariant({ source: defaultSource, ...props }) {
	const { variant } = useTheme();
	const source = useMemo(() => {
		const sourceVariant = `source${variant
			.charAt(0)
			.toUpperCase()}${variant.slice(1)}`;
		if (variant !== 'default' && props[sourceVariant]) {
			try {
				return props[sourceVariant];
			} catch (e) {
				return defaultSource;
			}
		}
		return defaultSource;
	}, [variant]);
	return <Image testID="variant-image" source={source} {...props} />;
}
export default ImageVariant;
