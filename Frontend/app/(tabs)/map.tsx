import { View, Text, StyleSheet, Pressable, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useState, useEffect, useCallback, useMemo, useLayoutEffect, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { getParkingsByArea } from '@/lib/api';
import { Parking } from '@/lib/types';
import Header from '@/components/Header';
import { Colors } from '@/constants/colors';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import ParkingPeekSheet from '@/components/ParkingPeekSheet';
import PriceFilterSheet from '@/components/PriceFilterSheet';
import OfflineBanner from '@/components/OfflineBanner';

import { useNetworkStatus } from '@/lib/network';
import { wsService } from '@/lib/websocket';
import { getLastUpdateTime, isCacheStale } from '@/lib/cache';
import { useModalStore } from '@/store/modalStore';
import { showInfo, showInfoWithAction } from '@/lib/toast';
import SkeletonMap from '@/components/SkeletonMap';

const INITIAL_REGION = {
  latitude: 48.7222,
  longitude: 21.2578,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const getMarkerColor = (parking: Parking) => {
  const percentage = (parking.freeSpots / parking.totalSpots) * 100;
  if (percentage > 50) return Colors.status.green;
  if (percentage >= 20) return Colors.status.orange;
  return Colors.status.red;
};

export default function MapScreen() {
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [trafficOn, setTrafficOn] = useState(false);
  const [userRegion, setUserRegion] = useState<Region | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [mapReadyTime, setMapReadyTime] = useState<number | null>(null);
  const [showStaleWarning, setShowStaleWarning] = useState(false);
  const [showOnlyFree, setShowOnlyFree] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  
  const mapRef = useRef<MapView | null>(null);
  const [selectedParking, setSelectedParking] = useState<Parking | null>(null);
  const peekRef = useRef<BottomSheetModal>(null);
  const mapOpacity = useSharedValue(0);
  const mapScale = useSharedValue(0.95);
  const legendOpacity = useSharedValue(0);
  const legendTranslateY = useSharedValue(20);

  const networkStatus = useNetworkStatus();

  const loadParkings = useCallback(async () => {
    try {
      const startTime = Date.now();
      const data = await getParkingsByArea();
      setParkings(data);
      
      // Update last update time
      const updateTime = await getLastUpdateTime();
      setLastUpdateTime(updateTime);
      
      // Log load time for SMK-007 (cold start ≤3s)
      const loadTime = Date.now() - startTime;
      if (loadTime > 3000) {
        console.warn(`Parkings load took ${loadTime}ms (>3s threshold)`);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading parkings:', error);
      // Try to get from cache
      const { getCachedParkings } = await import('@/lib/cache');
      const cached = await getCachedParkings();
      if (cached) {
        setParkings(cached);
      }
      setIsLoading(false);
    }
  }, []);

  const ensureLocation = useCallback(async (autoRequest: boolean = false): Promise<'granted' | 'denied' | 'undetermined'> => {
    try {
      // Check current permission status
      const { status } = await Location.getForegroundPermissionsAsync();
      
      // Handle all possible permission states
      if (status === 'granted') {
        // Permission already granted, get location
        try {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const nextRegion: Region = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          };
          setUserRegion(nextRegion);
        } catch (error) {
          // Location request failed, but permission is granted
          // This can happen if location services are disabled or GPS is unavailable
          console.log('Location unavailable:', error);
        }
        return 'granted';
      }
      
      if (status === 'undetermined') {
        // First time - request permission (will show native dialog)
        // Only auto-request on first mount or if explicitly requested
        if (autoRequest || !hasRequestedPermission) {
          try {
            setHasRequestedPermission(true);
            const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
            if (newStatus === 'granted') {
              // User granted permission, get location
              const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
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
          } catch (error) {
            console.log('Permission request failed:', error);
            return 'undetermined';
          }
        }
        return 'undetermined';
      }
      
      if (status === 'denied') {
        // Permission was denied - user needs to enable it in settings
        return 'denied';
      }
      
      // Handle any other status (shouldn't happen, but handle gracefully)
      console.log('Unknown permission status:', status);
      return 'undetermined';
    } catch (error) {
      // Handle any errors in permission checking
      console.log('Error checking location permission:', error);
      return 'undetermined';
    }
  }, [hasRequestedPermission]);

  // Preload data immediately for faster first render (SMK-007: cold start optimization)
  useLayoutEffect(() => {
    const startTime = Date.now();
    loadParkings().then(() => {
      const loadTime = Date.now() - startTime;
      console.log(`Initial data load: ${loadTime}ms`);
    });
  }, [loadParkings]);

  // Check cache staleness
  useEffect(() => {
    const checkStale = async () => {
      const stale = await isCacheStale();
      setShowStaleWarning(stale);
    };
    checkStale();
  }, [lastUpdateTime]);

  // WebSocket for real-time updates (SMK-006)
  useEffect(() => {
    // Only connect if network is available and WebSocket URL is configured
    if (!networkStatus.isConnected || !process.env.EXPO_PUBLIC_WS_URL) {
      return;
    }

    // Connect WebSocket (will handle connection errors gracefully)
    if (wsService) {
      wsService.connect();

      // Subscribe to parking updates
      const unsubscribe = wsService.onMessage((message) => {
      if (message.type === 'parking_update' && message.data) {
        const updatedParking = message.data as Parking;
        setParkings((prev) => {
          const index = prev.findIndex((p) => p.id === updatedParking.id);
          if (index >= 0) {
            // Update existing parking
            const updated = [...prev];
            updated[index] = updatedParking;
            return updated;
          }
          // Add new parking if not exists
          return [...prev, updatedParking];
        });
      } else if (message.type === 'parking_batch_update' && message.data) {
        // Batch update
        const updatedParkings = message.data as Parking[];
        setParkings((prev) => {
          const updated = [...prev];
          updatedParkings.forEach((updatedParking) => {
            const index = updated.findIndex((p) => p.id === updatedParking.id);
            if (index >= 0) {
              updated[index] = updatedParking;
            }
          });
          return updated;
        });
      }
      });

      return () => {
        unsubscribe();
        // Don't disconnect WebSocket here - keep it alive for other screens
      };
    }

    return () => {
      // No cleanup needed if wsService is not available
    };
  }, [networkStatus.isConnected]);

  // Automatically request location permission on first mount (like top companies do)
  useEffect(() => {
    // Request permission automatically when map screen first loads
    // Small delay to ensure screen is fully loaded and user sees the map
    const timer = setTimeout(() => {
      ensureLocation(true); // Auto-request permission if needed
    }, 800);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - ensureLocation dependency is stable

  useFocusEffect(
    useCallback(() => {
      // Reload when screen is focused
      loadParkings();
      // Try to update location quietly (only if already granted)
      ensureLocation(false);
    }, [loadParkings, ensureLocation])
  );

  useEffect(() => {
    // Smooth appearance animations
    mapOpacity.value = withDelay(0, withTiming(1, { 
      duration: 500, 
      easing: Easing.out(Easing.cubic) 
    }));
    mapScale.value = withDelay(0, withTiming(1, { 
      duration: 500, 
      easing: Easing.out(Easing.back(1.1)) 
    }));
    legendOpacity.value = withDelay(200, withTiming(1, { 
      duration: 400, 
      easing: Easing.out(Easing.cubic) 
    }));
    legendTranslateY.value = withDelay(200, withTiming(0, { 
      duration: 400, 
      easing: Easing.out(Easing.cubic) 
    }));
  }, [mapOpacity, mapScale, legendOpacity, legendTranslateY]);

  const mapAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: mapOpacity.value,
      transform: [{ scale: mapScale.value }],
    };
  }, []);

  const legendAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: legendOpacity.value,
      transform: [{ translateY: legendTranslateY.value }],
    };
  }, []);

  const { isModalOpen } = useModalStore();
  const buttonScale = useSharedValue(1);
  const buttonShake = useSharedValue(0);

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: buttonShake.value },
        { scale: buttonScale.value },
      ],
    };
  }, []);

  const handleMapPress = useCallback(() => {
    // Check if peekSheet is open - block navigation if it is
    if (isModalOpen('peekSheet')) {
      // Show visual feedback that user needs to close peekSheet first
      // Shake animation
      buttonShake.value = withTiming(10, { duration: 50 }, () => {
        buttonShake.value = withTiming(-10, { duration: 50 }, () => {
          buttonShake.value = withTiming(5, { duration: 50 }, () => {
            buttonShake.value = withTiming(-5, { duration: 50 }, () => {
              buttonShake.value = withTiming(0, { duration: 50 });
            });
          });
        });
      });
      // Scale down animation
      buttonScale.value = withTiming(0.95, { duration: 100 }, () => {
        buttonScale.value = withTiming(1, { duration: 100 });
      });
      // Show toast message
      showInfo('Najprv zatvorte okno s detaľmi parkoviska');
      return;
    }
    router.push('/map-fullscreen');
  }, [isModalOpen, buttonShake, buttonScale]);

  const handleMarkerPress = useCallback((parking: Parking) => {
    const { canOpenModal } = useModalStore.getState();
    // Check if we can open peek sheet (filterSheet should block it)
    if (!canOpenModal('peekSheet')) {
      // Filter sheet is open, don't open peek sheet
      return;
    }
    setSelectedParking(parking);
    // Present the bottom sheet on next tick to ensure state is set
    setTimeout(() => {
      peekRef.current?.present?.();
    }, 0);
  }, []);

  const handleViewDetails = useCallback((parking: Parking) => {
    peekRef.current?.dismiss?.();
    router.push({ pathname: '/parking/[id]', params: { id: parking.id } });
  }, []);

  const validParkings = useMemo(() => {
    let filtered = parkings.filter((p) => 
      p.coordinates && 
      p.coordinates.latitude && 
      p.coordinates.longitude
    );
    
    // Filter "Len voľné" (only free spaces) - hide fully occupied parkings (freeSpots === 0)
    if (showOnlyFree) {
      filtered = filtered.filter((p) => {
        // Ensure freeSpots is a number and is greater than 0
        const freeSpotsNum = typeof p.freeSpots === 'number' ? p.freeSpots : Number(p.freeSpots);
        // Strict check: must be a valid number and > 0
        return !isNaN(freeSpotsNum) && isFinite(freeSpotsNum) && freeSpotsNum > 0;
      });
    }
    
    return filtered;
  }, [parkings, showOnlyFree]);
  
  const handleRetryLoad = useCallback(() => {
    loadParkings();
  }, [loadParkings]);

  const handleApplyFilter = useCallback(() => {
    setIsFilterOpen(false);
  }, []);
  
  
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header 
          title="Mapa" 
          subtitle="Parkoviská v Košiciach" 
        />
        <SkeletonMap />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <OfflineBanner
        onRetry={handleRetryLoad}
        showStaleDataWarning={showStaleWarning}
        lastUpdateTime={lastUpdateTime}
      />

      <Header 
        title="Mapa" 
        subtitle="Parkoviská v Košiciach" 
      />

      <Animated.View style={[styles.mapContainer, mapAnimatedStyle]}>
        <MapView
          style={styles.map}
          initialRegion={INITIAL_REGION}
          provider={PROVIDER_GOOGLE}
          {...(Platform.OS === 'android' && { mapId: 'a301e8cc351ed5975df66e16' })}
          {...(Platform.OS === 'ios' && { mapId: 'a301e8cc351ed5979f3d311d' })}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          showsTraffic={trafficOn}
          mapType="standard"
          cacheEnabled={false}
          loadingEnabled={true}
          loadingIndicatorColor={Colors.gradient.start}
          scrollEnabled={!isFilterOpen}
          zoomEnabled={!isFilterOpen}
          pitchEnabled={!isFilterOpen}
          rotateEnabled={!isFilterOpen}
          onMapReady={() => {
            const readyTime = Date.now();
            if (mapReadyTime === null) {
              setMapReadyTime(readyTime);
              console.log('Map ready');
            } else {
              const mapLoadTime = readyTime - mapReadyTime;
              console.log(`Map load time: ${mapLoadTime}ms`);
            }
          }}
          ref={mapRef}>
          {validParkings.map((parking) => (
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
        
        <Animated.View style={buttonAnimatedStyle}>
          <Pressable style={styles.interactiveButton} onPress={handleMapPress}>
            <Text style={styles.interactiveButtonText}>Klikni pre interaktívnu mapu</Text>
          </Pressable>
        </Animated.View>
        
      </Animated.View>

      <ParkingPeekSheet
        ref={peekRef}
        parking={selectedParking}
        onViewDetails={(parking) => {
          peekRef.current?.dismiss?.();
          handleViewDetails(parking);
        }}
      />

      <Animated.View style={[styles.legend, legendAnimatedStyle]}>
        <Text style={styles.legendTitle}>Legenda</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.status.green }]} />
          <Text style={styles.legendText}>Viac ako 50% voľných miest</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.status.orange }]} />
          <Text style={styles.legendText}>20-50% voľných miest</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.status.red }]} />
          <Text style={styles.legendText}>Menej ako 20% voľných miest</Text>
        </View>
      </Animated.View>

      <PriceFilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        maxPrice={undefined}
        onPriceChange={() => {}}
        showOnlyFree={showOnlyFree}
        onShowOnlyFreeChange={setShowOnlyFree}
        onApply={handleApplyFilter}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapContainer: {
    height: 400,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  map: {
    flex: 1,
  },
  filterButton: {
    position: 'absolute',
    top: 80,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  interactiveButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  interactiveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  legend: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 18,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fabStack: {
    position: 'absolute',
    right: 24,
    bottom: 24 + 72, // keep above floating tab bar
    gap: 12,
    alignItems: 'flex-end',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fabLabel: {
    fontSize: 12,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  legendTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
});

