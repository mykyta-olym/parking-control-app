import AsyncStorage from '@react-native-async-storage/async-storage';
import { Parking, ParkingArea } from './types';

const CACHE_KEYS = {
  PARKINGS: '@parkme:parkings',
  AREAS: '@parkme:areas',
  LAST_UPDATE: '@parkme:last_update',
  CACHE_VERSION: '@parkme:cache_version',
} as const;

const CACHE_VERSION = 1;
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export interface CachedData<T> {
  data: T;
  timestamp: number;
  version: number;
}

export const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_EXPIRY_MS;
};

// Cache parkings
export const cacheParkings = async (parkings: Parking[]): Promise<void> => {
  try {
    const cached: CachedData<Parking[]> = {
      data: parkings,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    await AsyncStorage.setItem(CACHE_KEYS.PARKINGS, JSON.stringify(cached));
    await AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
  } catch (error) {
    console.error('Error caching parkings:', error);
  }
};

export const getCachedParkings = async (): Promise<Parking[] | null> => {
  try {
    const cachedStr = await AsyncStorage.getItem(CACHE_KEYS.PARKINGS);
    if (!cachedStr) return null;

    const cached: CachedData<Parking[]> = JSON.parse(cachedStr);
    
    // Check version
    if (cached.version !== CACHE_VERSION) {
      await AsyncStorage.removeItem(CACHE_KEYS.PARKINGS);
      return null;
    }

    // Check if cache is still valid
    if (isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    // Return stale data if available (for offline mode)
    return cached.data;
  } catch (error) {
    console.error('Error reading cached parkings:', error);
    return null;
  }
};

// Cache areas
export const cacheAreas = async (areas: ParkingArea[]): Promise<void> => {
  try {
    const cached: CachedData<ParkingArea[]> = {
      data: areas,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    await AsyncStorage.setItem(CACHE_KEYS.AREAS, JSON.stringify(cached));
  } catch (error) {
    console.error('Error caching areas:', error);
  }
};

export const getCachedAreas = async (): Promise<ParkingArea[] | null> => {
  try {
    const cachedStr = await AsyncStorage.getItem(CACHE_KEYS.AREAS);
    if (!cachedStr) return null;

    const cached: CachedData<ParkingArea[]> = JSON.parse(cachedStr);
    
    // Check version
    if (cached.version !== CACHE_VERSION) {
      await AsyncStorage.removeItem(CACHE_KEYS.AREAS);
      return null;
    }

    return cached.data;
  } catch (error) {
    console.error('Error reading cached areas:', error);
    return null;
  }
};

export const getLastUpdateTime = async (): Promise<number | null> => {
  try {
    const timestampStr = await AsyncStorage.getItem(CACHE_KEYS.LAST_UPDATE);
    return timestampStr ? parseInt(timestampStr, 10) : null;
  } catch (error) {
    console.error('Error reading last update time:', error);
    return null;
  }
};

export const isCacheStale = async (): Promise<boolean> => {
  const timestamp = await getLastUpdateTime();
  if (!timestamp) return true;
  return !isCacheValid(timestamp);
};

export const clearCache = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      CACHE_KEYS.PARKINGS,
      CACHE_KEYS.AREAS,
      CACHE_KEYS.LAST_UPDATE,
    ]);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

