import 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MMKV } from 'react-native-mmkv';
import ApplicationNavigator from './navigators/Application';
import './translations';
import { StoreProvider } from './store';
import { rootStore } from './store/RootStore';

export const queryClient = new QueryClient();
export const storage = new MMKV();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider value={rootStore}>
        <ApplicationNavigator />
      </StoreProvider>
    </QueryClientProvider>
  );
}

export default App;