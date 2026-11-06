import { View, Text, StyleSheet, Pressable, Platform, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { getParkingsByArea } from '@/lib/api';
import { Parking } from '@/lib/types';
import { Colors } from '@/constants/colors';
import PriceFilterSheet from '@/components/PriceFilterSheet';
import ParkingPeekSheet from '@/components/ParkingPeekSheet';
import OfflineBanner from '@/components/OfflineBanner';
import { validatePrice } from '@/lib/security';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNetworkStatus } from '@/lib/network';
import { wsService } from '@/lib/websocket';
import { getLastUpdateTime, isCacheStale } from '@/lib/cache';
import { useModalStore } from '@/store/modalStore';
import { showInfoWithAction } from '@/lib/toast';
import * as Location from 'expo-location';
import * as NavigationBar from 'expo-navigation-bar';

const INITIAL_REGION = {
  latitude: 48.7222,
  longitude: 21.2578,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const MAX_PRICE = 5.0;

const getMarkerColor = (parking: Parking) => {
  const percentage = (parking.freeSpots / parking.totalSpots) * 100;
  if (percentage > 50) return Colors.status.green;
  if (percentage >= 20) return Colors.status.orange;
  return Colors.status.red;
};

export default function MapFullscreenScreen() {
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [filteredParkings, setFilteredParkings] = useState<Parking[]>([]);
  const [region, setRegion] = useState(INITIAL_REGION);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [showOnlyFree, setShowOnlyFree] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [showStaleWarning, setShowStaleWarning] = useState(false);
  const [userRegion, setUserRegion] = useState<Region | null>(null);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const mapRef = useRef<MapView>(null);
  const peekRef = useRef<BottomSheetModal>(null);
  const [selectedParking, setSelectedParking] = useState<Parking | null>(null);
  const networkStatus = useNetworkStatus();
  const insets = useSafeAreaInsets();

  // Set white background for system UI navigation bar on this screen
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
        NavigationBar.setBackgroundColorAsync(Colors.white).catch(() => {});
        NavigationBar.setButtonStyleAsync('dark').catch(() => {});
        NavigationBar.setVisibilityAsync('visible').catch(() => {});
      }
    }, [])
  );

  const ensureLocation = useCallback(async (autoRequest: boolean = false): Promise<'granted' | 'denied' | 'undetermined'> => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const nextRegion: Region = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          };
          setUserRegion(nextRegion);
        } catch {}
        return 'granted';
      }
      if (status === 'undetermined') {
        if (autoRequest || !hasRequestedPermission) {
          try {
            setHasRequestedPermission(true);
            const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
            if (newStatus === 'granted') {
              const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              const nextRegion: Region = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              };
              setUserRegion(nextRegion);
              return 'granted';
            }
            return newStatus === 'denied' ? 'denied' : 'undetermined';
          } catch {
            return 'undetermined';
          }
        }
        return 'undetermined';
      }
      if (status === 'denied') {
        return 'denied';
      }
      return 'undetermined';
    } catch {
      return 'undetermined';
    }
  }, [hasRequestedPermission]);

  const loadParkings = useCallback(async () => {
    try {
      const data = await getParkingsByArea();
      setParkings(data);
      const updateTime = await getLastUpdateTime();
      setLastUpdateTime(updateTime);
    } catch {
      const { getCachedParkings } = await import('@/lib/cache');
      const cached = await getCachedParkings();
      if (cached) setParkings(cached);
    }
  }, []);

  useEffect(() => {
    loadParkings();
  }, [loadParkings]);

  useEffect(() => {
    const checkStale = async () => {
      const stale = await isCacheStale();
      setShowStaleWarning(stale);
    };
    checkStale();
  }, [lastUpdateTime]);

  useEffect(() => {
    if (!networkStatus.isConnected || !process.env.EXPO_PUBLIC_WS_URL) return;
    if (wsService) {
      wsService.connect();
      const unsubscribe = wsService.onMessage((message) => {
        if (message.type === 'parking_update' && message.data) {
          const updatedParking = message.data as Parking;
          setParkings((prev) => {
            const index = prev.findIndex((p) => p.id === updatedParking.id);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = updatedParking;
              return updated;
            }
            return [...prev, updatedParking];
          });
        } else if (message.type === 'parking_batch_update' && message.data) {
          const updatedParkings = message.data as Parking[];
          setParkings((prev) => {
            const updated = [...prev];
            updatedParkings.forEach((u) => {
              const index = updated.findIndex((p) => p.id === u.id);
              if (index >= 0) updated[index] = u;
            });
            return updated;
          });
        }
      });
      return () => unsubscribe();
    }
  }, [networkStatus.isConnected]);

  const filteredParkingsMemo = useMemo(() => {
    let filtered = parkings;
    if (showOnlyFree) {
      filtered = filtered.filter((p) => {
        const freeSpotsNum = typeof p.freeSpots === 'number' ? p.freeSpots : Number(p.freeSpots);
        return !isNaN(freeSpotsNum) && isFinite(freeSpotsNum) && freeSpotsNum > 0;
      });
    }
    if (maxPrice !== undefined) {
      const validatedPrice = validatePrice(maxPrice);
      if (validatedPrice !== null) {
        filtered = filtered.filter((p) => {
          if (p.price === 'Zdarma') return true;
          const pricePerHour = p.pricePerHour || 0;
          return pricePerHour <= validatedPrice;
        });
      }
    }
    return filtered;
  }, [parkings, maxPrice, showOnlyFree]);

  useEffect(() => {
    setFilteredParkings(filteredParkingsMemo);
  }, [filteredParkingsMemo]);

  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...region,
        latitudeDelta: region.latitudeDelta * 0.5,
        longitudeDelta: region.longitudeDelta * 0.5,
      }, 300);
    }
  }, [region]);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...region,
        latitudeDelta: region.latitudeDelta * 2,
        longitudeDelta: region.longitudeDelta * 2,
      }, 300);
    }
  }, [region]);

  const handleMarkerPress = useCallback((parking: Parking) => {
    const { canOpenModal } = useModalStore.getState();
    if (!canOpenModal('peekSheet')) return;
    setSelectedParking(parking);
    setTimeout(() => peekRef.current?.present?.(), 0);
  }, []);

  const handleViewDetails = useCallback((parking: Parking) => {
    peekRef.current?.dismiss?.();
    router.push({ pathname: '/parking/[id]', params: { id: parking.id } });
  }, []);

  const handleApplyFilter = useCallback(() => {
    setIsFilterOpen(false);
  }, []);

  const handleRetryLoad = useCallback(() => {
    loadParkings();
  }, [loadParkings]);

  return (
    <View style={styles.container}>
      <OfflineBanner
        onRetry={handleRetryLoad}
        showStaleDataWarning={showStaleWarning}
        lastUpdateTime={lastUpdateTime}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']} />

      <Pressable 
        style={styles.backButton} 
        onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
      </Pressable>

      <Pressable 
        style={styles.filterButton}
        onPress={() => {
          const { canOpenModal, isModalOpen, closeModal } = useModalStore.getState();
          if (isModalOpen('peekSheet')) {
            peekRef.current?.dismiss?.();
            closeModal('peekSheet');
            setTimeout(() => {
              setIsFilterOpen(true);
            }, 200);
          } else if (canOpenModal('filterSheet')) {
            setIsFilterOpen(true);
          }
        }}>
        <Ionicons name="filter" size={24} color={Colors.text.primary} />
      </Pressable>

      <View style={styles.zoomControls}>
        <Pressable style={styles.zoomButton} onPress={handleZoomIn}>
          <Ionicons name="add" size={20} color={Colors.text.primary} />
        </Pressable>
        <Pressable style={styles.zoomButton} onPress={handleZoomOut}>
          <Ionicons name="remove" size={20} color={Colors.text.primary} />
        </Pressable>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={setRegion}
        {...(Platform.OS === 'android' && { mapId: 'a301e8cc351ed5975df66e16' })}
        {...(Platform.OS === 'ios' && { mapId: 'a301e8cc351ed5979f3d311d' })}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsBuildings={true}
        provider={PROVIDER_GOOGLE}
        mapType="standard"
        cacheEnabled={false}
        loadingEnabled={true}
        loadingIndicatorColor={Colors.gradient.start}
        onMapReady={() => {}}>
        {filteredParkings.filter((p) => 
          p.coordinates && 
          p.coordinates.latitude && 
          p.coordinates.longitude
        ).map((parking) => (
          <Marker
            key={parking.id}
            coordinate={parking.coordinates}
            pinColor={getMarkerColor(parking)}
            title={parking.name}
            description={`${parking.freeSpots}/${parking.totalSpots} voľných • ${parking.price}`}
            tracksViewChanges={false}
            onPress={() => handleMarkerPress(parking)}
          />
        ))}
      </MapView>

      <Pressable
        style={styles.locationButton}
        onPress={async () => {
          // Fast path: if we already have userRegion, animate immediately
          if (userRegion && mapRef.current) {
            mapRef.current.animateToRegion(userRegion, 600);
            return;
          }

          // Check permission status
          const { status } = await Location.getForegroundPermissionsAsync();
          
          if (status === 'denied') {
            showInfoWithAction(
              'Pre zobrazenie vašej polohy povolte prístup k poloze v nastaveniach aplikácie.',
              'Povoliť prístup k poloze',
              'Otvoriť nastavenia',
              () => {
                Linking.openSettings().catch(() => {});
              }
            );
            return;
          }
          
          // Get location with low accuracy for faster response
          try {
            const pos = await Location.getCurrentPositionAsync({ 
              accuracy: Location.Accuracy.Low 
            });
            const newRegion: Region = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            };
            setUserRegion(newRegion);
            mapRef.current?.animateToRegion(newRegion, 600);
          } catch (error) {
            // If permission not granted, request it
            if (status === 'undetermined') {
              const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
              if (newStatus === 'granted') {
                const pos = await Location.getCurrentPositionAsync({ 
                  accuracy: Location.Accuracy.Low 
                });
                const newRegion: Region = {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                };
                setUserRegion(newRegion);
                mapRef.current?.animateToRegion(newRegion, 600);
              }
            }
          }
        }}>
        <Ionicons name="locate" size={24} color={Colors.text.primary} />
      </Pressable>

      <PriceFilterSheet
        isOpen={isFilterOpen}
        maxPrice={maxPrice || MAX_PRICE}
        onPriceChange={setMaxPrice}
        showOnlyFree={showOnlyFree}
        onShowOnlyFreeChange={setShowOnlyFree}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilter}
      />

      <ParkingPeekSheet
        ref={peekRef}
        parking={selectedParking}
        onViewDetails={(parking) => {
          peekRef.current?.dismiss?.();
          handleViewDetails(parking);
        }}
      />

      {/* White overlay to cover transparent system UI area */}
      {Platform.OS === 'android' && insets.bottom > 0 && (
        <View
          style={[
            styles.systemUIOverlay,
            { height: insets.bottom },
          ]}
          pointerEvents="none"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 11,
  },
  filterButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 11,
  },
  zoomControls: {
    position: 'absolute',
    left: 16,
    top: 120,
    gap: 8,
    zIndex: 11,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  locationButton: {
    position: 'absolute',
    right: 16,
    top: 116,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 11,
  },
  map: {
    flex: 1,
  },
  systemUIOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    zIndex: 1,
  },
});