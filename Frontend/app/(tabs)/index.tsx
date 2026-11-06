import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Linking } from 'react-native';
import * as Location from 'expo-location';
import { showInfoWithAction } from '@/lib/toast';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
  FadeOutUp,
  Layout,
} from 'react-native-reanimated';
import { getParkingAreas, getParkingsByArea } from '@/lib/api';
import { ParkingArea, Parking } from '@/lib/types';
import { useFavoritesStore } from '@/store/favoritesStore';
import AreaCard from '@/components/AreaCard';
import ParkingCard from '@/components/ParkingCard';
import LoadingScreen from '@/components/LoadingScreen';
import Header from '@/components/Header';
import SkeletonCard from '@/components/SkeletonCard';
import SkeletonAreaCard from '@/components/SkeletonAreaCard';
import { Colors } from '@/constants/colors';


export default function HomeScreen() {
  const { getFavoriteParkings } = useFavoritesStore();
  const [areas, setAreas] = useState<ParkingArea[]>([]);
  const [favoriteParkings, setFavoriteParkings] = useState<Parking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasRequestedPermissionRef = useRef(false);
  
  // Calculate total free spots and areas count from loaded areas
  const totalFreeSpots = useMemo(() => {
    return areas.reduce((sum, area) => sum + area.freeSpots, 0);
  }, [areas]);
  
  const totalAreas = useMemo(() => {
    return areas.length;
  }, [areas]);
  
  const loadAreas = useCallback(async () => {
    try {
      const data = await getParkingAreas();
      setAreas(data);
      return data;
    } catch (error) {
      console.error('Error loading areas:', error);
      return [];
    }
  }, []);

  const loadFavoriteParkings = useCallback(async () => {
    try {
      const allParkings = await getParkingsByArea();
      const favoriteList = getFavoriteParkings(allParkings);
      setFavoriteParkings(favoriteList);
      return favoriteList;
    } catch (error) {
      console.error('Error loading favorite parkings:', error);
      setFavoriteParkings([]);
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // getFavoriteParkings is stable from zustand store
  
  // Preload all data immediately while LoadingScreen is showing (5040ms)
  // This ensures data is ready when loading screen finishes
  useEffect(() => {
    const preloadData = async () => {
      try {
        // Load all data in parallel while loading screen is showing
        // This happens during the 5040ms animation, so data is ready when it finishes
        await Promise.all([
          loadAreas(),
          loadFavoriteParkings(),
        ]);
      } catch (error) {
        console.error('Error preloading data:', error);
      }
    };
    
    preloadData();
  }, [loadAreas, loadFavoriteParkings]); // Include dependencies to avoid stale closures
  
  // Sync with LoadingScreen duration: 5040ms (JSON animation)
  // Wait for both loading screen AND data to be ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 5040);
    
    return () => clearTimeout(timer);
  }, []);

  // Automatically request location permission on first app launch (after loading screen)
  useEffect(() => {
    // Request permission automatically after loading screen finishes
    // Small delay to ensure screen is fully loaded
    if (!isLoading && !hasRequestedPermissionRef.current) {
      const timer = setTimeout(async () => {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          
          if (status === 'granted') {
            return;
          }
          
          if (status === 'undetermined' || status === 'denied') {
            hasRequestedPermissionRef.current = true;
            const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
            
            if (newStatus === 'granted') {
              return;
            } else if (newStatus === 'denied' && status === 'denied') {
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
          }
        } catch (error) {
          // Silently fail - permission request is optional
        }
      }, 1000); // 1 second after loading screen finishes
      
      return () => clearTimeout(timer);
    }
  }, [isLoading]);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);
  const bannerOpacity = useSharedValue(0);
  const bannerScale = useSharedValue(1);
  const bannerTranslateY = useSharedValue(20);
  const sectionOpacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      // Reload data when screen is focused (refresh on navigation back)
      // Only if not in initial loading state
      if (!isLoading) {
        loadAreas();
        loadFavoriteParkings();
      }
    }, [loadAreas, loadFavoriteParkings, isLoading])
  );

  // Reload favorites when favorites list changes
  const favorites = useFavoritesStore((state) => state.favorites);
  useEffect(() => {
    loadFavoriteParkings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites]);

  useEffect(() => {
    if (!isLoading) {
      // Smooth appearance animations with proper easing
      contentOpacity.value = withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      });
      contentTranslateY.value = withTiming(0, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      });
      bannerOpacity.value = withTiming(1, { 
        duration: 450, 
        easing: Easing.out(Easing.cubic) 
      });
      bannerScale.value = withTiming(1, { 
        duration: 450, 
        easing: Easing.out(Easing.back(1.2)) 
      });
      bannerTranslateY.value = withTiming(0, { 
        duration: 450, 
        easing: Easing.out(Easing.cubic) 
      });
      sectionOpacity.value = withDelay(100, withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
    }
  }, [isLoading, contentOpacity, contentTranslateY, bannerOpacity, bannerScale, bannerTranslateY, sectionOpacity]);

  const contentAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: contentOpacity.value,
      transform: [{ translateY: contentTranslateY.value }],
    };
  }, []);

  const bannerAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: bannerOpacity.value,
      transform: [
        { translateY: bannerTranslateY.value },
        { scale: bannerScale.value },
      ],
    };
  }, []);

  const sectionAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: sectionOpacity.value,
    };
  }, []);

  const handleAreaPress = useCallback((area: ParkingArea) => {
    router.push({
      pathname: '/(tabs)/search',
      params: { area: area.name },
    });
  }, []);

  const handleParkingPress = useCallback((parking: Parking) => {
    router.push({
      pathname: '/parking/[id]',
      params: { id: parking.id },
    });
  }, []);

  const favoriteParkingsSlice = useMemo(() => favoriteParkings.slice(0, 3), [favoriteParkings]);
  const areasSlice = useMemo(() => areas.slice(0, 4), [areas]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadAreas(), loadFavoriteParkings()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadAreas, loadFavoriteParkings]);

  return (
    <>
      <LoadingScreen visible={isLoading} onFinish={() => setIsLoading(false)} />
      <Animated.View 
        style={[styles.container, contentAnimatedStyle]}
        pointerEvents={isLoading ? 'none' : 'auto'}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.gradient.start}
                colors={[Colors.gradient.start]}
              />
            }>
        <Header 
          title="ParkMe" 
          subtitle="Inteligentné parkovanie" 
        />

        <Animated.View style={bannerAnimatedStyle}>
          <LinearGradient
            colors={[Colors.gradient.start, Colors.gradient.end]}
            style={styles.welcomeBanner}>
            <View style={styles.bannerHeader}>
              <Text style={styles.welcomeText}>Vitajte späť! 👋</Text>
              <Ionicons name="star-outline" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.welcomeSubtext}>Nájdite si ideálne parkovacie miesto</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{totalFreeSpots}</Text>
                <Text style={styles.statLabel}>Voľných miest</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{totalAreas}</Text>
                <Text style={styles.statLabel}>Oblastí</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {!isLoading && favoriteParkings.length > 0 && (
          <Animated.View style={[styles.section, sectionAnimatedStyle]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart" size={20} color={Colors.gradient.start} style={styles.heartIcon} />
              <Text style={styles.sectionTitleInline}>Vaše obľúbené</Text>
            </View>
            {favoriteParkingsSlice.map((parking, index) => (
              <Animated.View
                key={parking.id}
                entering={FadeInDown.delay(index * 50).duration(400).springify().damping(15)}
                exiting={FadeOutUp.duration(300).easing(Easing.out(Easing.ease))}
                layout={Layout.springify().damping(15).stiffness(100)}>
                <ParkingCard
                  parking={parking}
                  onPress={() => handleParkingPress(parking)}
                />
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {isLoading && (
          <Animated.View style={[styles.section, sectionAnimatedStyle]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart" size={20} color={Colors.gradient.start} style={styles.heartIcon} />
              <Text style={styles.sectionTitleInline}>Vaše obľúbené</Text>
            </View>
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </Animated.View>
        )}

        <Animated.View style={[styles.sectionFirst, sectionAnimatedStyle]}>
          <Text style={styles.sectionTitle}>Vyberte oblasť</Text>
          <View style={styles.areasGrid}>
            {isLoading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={styles.areaCardWrapper}>
                    <SkeletonAreaCard />
                  </View>
                ))}
              </>
            ) : (
              areasSlice.map((area) => (
                <View key={area.id} style={styles.areaCardWrapper}>
                  <AreaCard
                    name={area.name}
                    parkingCount={area.parkingCount}
                    freeSpots={area.freeSpots}
                    color={area.color}
                    onPress={() => handleAreaPress(area)}
                  />
                </View>
              ))
            )}
          </View>
        </Animated.View>
        </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  welcomeBanner: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    borderRadius: 22,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.9,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionFirst: {
    paddingHorizontal: 20,
    marginBottom: 24,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  heartIcon: {
    lineHeight: 24,
  },
  heartIconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  sectionTitleInline: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    lineHeight: 24,
    includeFontPadding: false, // Для кращого вирівнювання на Android
  },
  areasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  areaCardWrapper: {
    width: '48%',
  },
});
