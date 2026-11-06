import { ParkingArea, Parking, ParkingDetail } from './types';
import { validateSearchQuery, validatePrice, validateAreaName, validateParkingId } from './security';
import { cacheParkings, getCachedParkings, cacheAreas } from './cache'; 
import { checkNetworkStatus } from './network';
import { Platform } from 'react-native';

// *** 1. KONFIGURÁCIA BACKENDU ***
// Allows override via EXPO_PUBLIC_API_URL (useful in Docker/prod), falls back to dev/prod defaults.
const getApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  if (__DEV__) {
    // Development - use local backend
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000/api/v1';
    }
    return 'http://localhost:8000/api/v1';
  }
  // Production
  return 'http://147.232.205.122:8000/api/v1';
};
const API_BASE_URL = getApiBaseUrl();
// **********************************

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// ---------------------------------------------
// HELPER FUNKCIE
// ---------------------------------------------

// NOVÁ FUNKCIA: Odstráni diakritiku a prevedie na malé písmená
export const normalizeString = (str: string): string => {
  if (!str) return '';
  // Normalizácia na NFD (Canonical Decomposition) a odstránenie diakritických značiek
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<T> => {
// ... (logika retry zostáva nezmenená)
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) {
      throw error;
    }
    
    await new Promise((resolve) => setTimeout(resolve, delay));
    
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
};

const isNetworkAvailable = async (): Promise<boolean> => {
  const networkState = await checkNetworkStatus();
  return networkState.isConnected && networkState.isInternetReachable;
};


// ---------------------------------------------
// DÁTOVÁ TRANSFORMÁCIA (Schema Mapping)
// ---------------------------------------------

/**
 * Preklad kódu okresu na užívateľsky prívetivý názov.
 */
const getDistrictLabel = (districtCode: string): string => {
  switch (districtCode.toUpperCase()) {
    case 'ZAPAD': return 'Západ';
    case 'SEVER': return 'Sever';
    case 'STARE MESTO': return 'Staré Mesto';
    case 'JUH': return 'Juh';
    default: return districtCode;
  }
}

/**
 * Používa sa pre GET /api/v1/parking (Index Screen).
 */
const getAreaColor = (districtCode: string): string => {
  const normalizedCode = districtCode.toUpperCase(); 

  switch (normalizedCode) {
    case 'ZAPAD': return '#3498db'; 
    case 'SEVER': return '#e74c3c'; 
    case 'STARE MESTO': return '#2ecc71'; 
    case 'JUH': return '#f1c40f'; 
    default: return '#95a5a6'; 
  }
}

/**
 * Mapuje ZoneOut (z ParkingListOut) na ParkingArea
 */
const mapApiAreaToParkingArea = (apiZone: any): ParkingArea => {
  return {
    id: apiZone.id,
    name: getDistrictLabel(apiZone.district), 
    parkingCount: apiZone.counters?.total || 0,
    freeSpots: apiZone.counters?.free || 0,
    color: getAreaColor(apiZone.district),
  } as ParkingArea;
};

// Merge areas that point to the same district (same name) so we don't render duplicates
const mergeAreasByName = (areas: ParkingArea[]): ParkingArea[] => {
  const merged = new Map<string, ParkingArea>();

  areas.forEach((area) => {
    const key = normalizeString(area.name.trim());
    const existing = merged.get(key);

    if (existing) {
      merged.set(key, {
        ...existing,
        parkingCount: existing.parkingCount + area.parkingCount,
        freeSpots: existing.freeSpots + area.freeSpots,
      });
    } else {
      merged.set(key, { ...area });
    }
  });

  return Array.from(merged.values());
};

/**
 * Mapuje ParkingFacilityOut na Parking (používa sa pre zoznamy a mapu)
 */
const mapApiFacilityToParking = (apiFacility: any): Parking => {
  return {
    id: apiFacility.id,
    name: apiFacility.name,
    address: apiFacility.address || 'Neznáma adresa', 
    totalSpots: apiFacility.totalSpots || 0,
    freeSpots: apiFacility.freeSpots || 0,
    price: apiFacility.price || 'N/A',
    pricePerHour: apiFacility.pricePerHour,
    features: apiFacility.features || [],
    
    // area pre zobrazenie (Label: "Staré Mesto")
    area: apiFacility.district?.label || apiFacility.district?.code || apiFacility.district, 
    
    // Ak by sme mali pole areaCode v types.ts, pridali by sme ho sem:
    // areaCode: apiFacility.district?.code || apiFacility.district, 

    coordinates: {
      latitude: apiFacility.coordinates?.latitude || 0,
      longitude: apiFacility.coordinates?.longitude || 0,
    },
    lastUpdate: apiFacility.lastUpdate, 
    isOpen: apiFacility.isOpen || false,
    openingHours: apiFacility.openingHours,
  } as Parking;
};

/**
 * Mapuje ParkingFacilityOut na ParkingDetail (pri detaile)
 */
const mapApiFacilityToParkingDetail = (apiFacility: any): ParkingDetail => {
  const parkingBase = mapApiFacilityToParking(apiFacility);
  return {
    ...parkingBase,
    description: apiFacility.description,
  } as ParkingDetail;
};

// ---------------------------------------------
// API FUNKCIE (Zostávajú nezmenené)
// ---------------------------------------------

export const getParkingAreas = async (): Promise<ParkingArea[]> => {
  try {
    const data = await retryWithBackoff(async () => {
      const response = await fetch(`${API_BASE_URL}/parkings`);

      if (!response.ok) {
        throw new Error(`Failed to fetch areas: ${response.status} ${response.statusText}`);
      }
      
      const apiResponse: any = await response.json(); 
      
      const zones = apiResponse.zones || []; 
      
      // ***************************************************************
      // LOGIKA AGREGÁCIE
      // ***************************************************************
      const areasMap = new Map<string, { count: number; freeSpots: number; color: string; label: string }>();

      zones.forEach((zone: any) => {
        const districtCode = zone.district; // Napr. "STARE MESTO"
        const zoneFreeSpots = zone.counters?.free || 0;
        
        // Zistíme label a farbu
        const label = getDistrictLabel(districtCode);
        const color = getAreaColor(districtCode);

        if (areasMap.has(districtCode)) {
          const existing = areasMap.get(districtCode)!;
          existing.count += 1; // Počet parkovacích zón/zariadení
          existing.freeSpots += zoneFreeSpots;
        } else {
          areasMap.set(districtCode, {
            count: 1, 
            freeSpots: zoneFreeSpots,
            color: color,
            label: label,
          });
        }
      });
      
      // Prevedieme Mapu na pole ParkingArea
      const finalAreas: ParkingArea[] = Array.from(areasMap, ([code, data]) => ({
        id: code.toLowerCase().replace(/\s/g, '-'), // ID z kódu districtu
        name: data.label, // Label districtu (napr. "Staré Mesto")
        parkingCount: data.count, // Správny počet parkovísk (zón)
        freeSpots: data.freeSpots,
        color: data.color,
      }));

      return finalAreas;
      // ***************************************************************
    });
    
    await cacheAreas(data); 
    return data;
  } catch (error) {
    console.error('Fatal Error loading areas from API:', error);
    throw error;
  }
};

/**
 * Získa detaily parkovacích zariadení pre danú oblasť (alebo všetky).
 * Volá: GET /api/v1/parkings (s voliteľným ?district=...)
 * @throws {Error} Ak volanie API zlyhá.
 */
export const getParkingsByArea = async (area?: string): Promise<Parking[]> => {
  try {
    const data = await retryWithBackoff(async () => {
      const params = new URLSearchParams();
      if (area && validateAreaName(area)) {
        // Posiela sa label (napr. "Staré Mesto"), predpokladáme, že backend vie filtrovať podľa labelu.
        params.append('district', area); 
      }
      
      let url = `${API_BASE_URL}/parkings`;
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch parkings by area: ${response.status} ${response.statusText}`);
      }
      
      const apiResponse: any = await response.json(); 
      
      const facilities = apiResponse.items || []; 
      
      return facilities.map(mapApiFacilityToParking);
    });
    
    await cacheParkings(data);
    return data;
  } catch (error) {
    console.error('Fatal Error loading parkings from API:', error);
    throw error;
  }
};

/**
 * Získa detail jedného parkovacieho zariadenia.
 * Volá: GET /api/v1/parkings/{parking_id}
 * @throws {Error} Ak volanie API zlyhá inak ako 404.
 */
export const getParkingDetail = async (id: string): Promise<ParkingDetail | null> => {
  if (!validateParkingId(id)) return null;

  try {
    const data = await retryWithBackoff(async () => {
      const url = `${API_BASE_URL}/parkings/${encodeURIComponent(id)}`;
      const response = await fetch(url);
      
      if (response.status === 404) {
        return null; 
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch parking detail: ${response.status} ${response.statusText}`);
      }
      
      const apiResponse: any = await response.json(); 
      
      return mapApiFacilityToParkingDetail(apiResponse); 
    });
    return data;
  } catch (error) {
    console.error(`Fatal Error loading parking detail for ${id}:`, error);
    throw error;
  }
};

/**
 * Vyhľadáva parkoviská.
 * Volá: GET /api/v1/parkings (s ?q=... a ?max_price=...)
 * @throws {Error} Ak volanie API zlyhá.
 */
export const searchParkings = async (query: string, maxPrice?: number): Promise<Parking[]> => {
  const sanitizedQuery = validateSearchQuery(query);
  const validatedPrice = maxPrice !== undefined ? validatePrice(maxPrice) : null;

  try {
    const results = await retryWithBackoff(async () => {
      const params = new URLSearchParams();
      if (sanitizedQuery) params.append('q', sanitizedQuery); 
      if (validatedPrice !== null) params.append('max_price', validatedPrice.toString()); 
      
      let url = `${API_BASE_URL}/parkings`;
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to search parkings: ${response.status} ${response.statusText}`);
      }
      
      const apiResponse: any = await response.json();
      const facilities = apiResponse.items || []; 
      
      return facilities.map(mapApiFacilityToParking);
    });
    
    await cacheParkings(results);
    return results;
  } catch (error) {
    console.error('Fatal Error searching parkings:', error);
    throw error;
  }
};
