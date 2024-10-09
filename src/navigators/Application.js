import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SystemMessages, Startup } from '@/screens';
import { useTheme } from '@/theme';
import Filter from '@/screens/Filter/Filter';
import ImageSlider from '@/screens/ImageSlider/ImageSlider';

const Stack = createStackNavigator();
function ApplicationNavigator() {
	const { variant, navigationTheme } = useTheme();
	return (
		<SafeAreaProvider>
			<NavigationContainer theme={navigationTheme}>
				<Stack.Navigator key={variant} screenOptions={{ headerShown: false }}>
					<Stack.Screen name="Startup" component={Startup} />
					<Stack.Screen name="Filter" component={Filter} />
					<Stack.Screen name="SystemMessages" component={SystemMessages} />
					<Stack.Screen name="ImageSlider" component={ImageSlider} />
				</Stack.Navigator>
			</NavigationContainer>
		</SafeAreaProvider>
	);
}
export default ApplicationNavigator;
