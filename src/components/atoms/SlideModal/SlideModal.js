import { useRef } from 'react';
import { Animated, Dimensions, PanResponder } from 'react-native';
import { animateMove, DrawerState, getNextState } from './utils';

export function SlideModal({ children, onDrawerStateChange }) {
	const { height } = Dimensions.get('window');
	const y = useRef(new Animated.Value(DrawerState.Closed)).current;
	const state = useRef(new Animated.Value(DrawerState.Closed)).current;
	const margin = 0.05 * height;
	const movementValue = moveY => height - moveY;

	const onPanResponderMove = (_, { moveY }) => {
		const val = movementValue(moveY);
		animateMove(y, val);
	};

	const onPanResponderRelease = (_, { moveY }) => {
		const valueToMove = movementValue(moveY);
		const nextState = getNextState(state._value, valueToMove, margin);
		state.setValue(nextState);
		animateMove(y, nextState, onDrawerStateChange(nextState));
	};
	const onMoveShouldSetPanResponder = (_, { dy }) => Math.abs(dy) >= 10;

	const closeModal = () => {
		
	};

	const panResponder = useRef(
		PanResponder.create({
			onMoveShouldSetPanResponder,
			onStartShouldSetPanResponderCapture: onMoveShouldSetPanResponder,
			onPanResponderMove,
			onPanResponderRelease,
		}),
	).current;

	return (
		<Animated.View
			style={[
				{
					width: '100%',
					height,
					backgroundColor: '#fff',
					borderRadius: 25,
					position: 'absolute',
					bottom: -height + 30,
					transform: [{ translateY: y }],
				},
			]}
			{...panResponder.panHandlers}
		>
			{children}
		</Animated.View>
	);
}
