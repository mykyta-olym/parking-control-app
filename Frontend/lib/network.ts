import NetInfo from '@react-native-community/netinfo';
import { useState, useEffect } from 'react';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string | null;
}

let networkListeners: Array<(state: NetworkState) => void> = [];
let currentNetworkState: NetworkState = {
  isConnected: false,
  isInternetReachable: false,
  type: null,
};

// Initialize network state
NetInfo.fetch().then((state) => {
  currentNetworkState = {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable ?? false,
    type: state.type,
  };
  networkListeners.forEach((listener) => listener(currentNetworkState));
});

// Subscribe to network changes
NetInfo.addEventListener((state) => {
  currentNetworkState = {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable ?? false,
    type: state.type,
  };
  networkListeners.forEach((listener) => listener(currentNetworkState));
});

export const useNetworkStatus = () => {
  const [networkState, setNetworkState] = useState<NetworkState>(currentNetworkState);

  useEffect(() => {
    const listener = (state: NetworkState) => {
      setNetworkState(state);
    };
    
    networkListeners.push(listener);
    setNetworkState(currentNetworkState);

    return () => {
      networkListeners = networkListeners.filter((l) => l !== listener);
    };
  }, []);

  return networkState;
};

export const checkNetworkStatus = async (): Promise<NetworkState> => {
  const state = await NetInfo.fetch();
  return {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable ?? false,
    type: state.type,
  };
};

