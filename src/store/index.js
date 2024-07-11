import { createContext, useContext } from 'react';
import { rootStore } from './RootStore';

export const StoreContext = createContext(rootStore);
export const StoreProvider = StoreContext.Provider;
export const useStore = () => useContext(StoreContext);
