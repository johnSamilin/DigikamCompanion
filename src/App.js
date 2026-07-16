import 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MMKV } from 'react-native-mmkv';
import { useEffect } from 'react';
import ApplicationNavigator from './navigators/Application';
import './translations';
import { StoreProvider } from './store';
import { rootStore } from './store/RootStore';

export const queryClient = new QueryClient();
export const storage = new MMKV();

function App() {
	useEffect(() => {
		// The store owns the AppState subscription and handles syncing +
		// clearing the database cache when the app moves to the background.
		// On unmount, ensure everything is flushed and the cache is cleared.
		return () => {
			rootStore.cleanup();
		};
	}, []);

	return (
		<QueryClientProvider client={queryClient}>
			<StoreProvider value={rootStore}>
				<ApplicationNavigator />
			</StoreProvider>
		</QueryClientProvider>
	);
}

export default App;
