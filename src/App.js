import 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MMKV } from 'react-native-mmkv';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import ApplicationNavigator from './navigators/Application';
import './translations';
import { StoreProvider } from './store';
import { rootStore } from './store/RootStore';

export const queryClient = new QueryClient();
export const storage = new MMKV();

function App() {
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Sync database when app goes to background
        rootStore.syncDatabaseToOriginal();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup function
    return () => {
      subscription?.remove();
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