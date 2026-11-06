import { View, Text, StyleSheet, ScrollView, Pressable, Linking, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useMemo, useLayoutEffect, useCallback } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Pattern, Rect, Circle } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { getParkingDetail } from '@/lib/api';
import { validateParkingId } from '@/lib/security';
import { ParkingDetail } from '@/lib/types';
import { useFavoritesStore } from '@/store/favoritesStore';
import { Colors } from '@/constants/colors';
import LiveBadge from '@/components/LiveBadge';
import SkeletonParkingDetail from '@/components/SkeletonParkingDetail';

const HEADER_HEIGHT = 135;

// Formatovanie relatívneho času
function formatLastUpdate(lastUpdate: string | undefined): string {
  if (!lastUpdate) return 'Neznámy čas';

  const d = new Date(lastUpdate.endsWith('Z')?lastUpdate:lastUpdate+'Z');
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) return 'Práve teraz';

  const MINUTE = 60;
  const HOUR = 60 * MINUTE;

  if (seconds < HOUR) {
    const mins = Math.floor(seconds / MINUTE);
    let suffix = 'ami';
    if (mins === 1) suffix = 'ou';
    return `Pred ${mins} minút${suffix}`;
  }
  
  if (seconds < 24 * HOUR) { // Menej ako 24 hodín
    const hrs = Math.floor(seconds / HOUR);
    // 1 hodinou, 2-4 hodinami, 5+ hodinami
    return `Pred ${hrs} hodinou${hrs === 1 ? '' : 'i'}`;
  }
  
  // Ak je viac ako 24 hodín, vráti presný dátum a čas
  return d.toLocaleString('sk-SK', { 
    year: 'numeric', 
    month: 'numeric', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit' 
  });
}


export default function ParkingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [parking, setParking] = useState<ParkingDetail | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore();
  const favorites = useFavoritesStore((state) => state.favorites); // Track favorites array changes
  const iconScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  
  // NOVÝ STAV pre dynamickú aktualizáciu času
  const [relativeUpdateTime, setRelativeUpdateTime] = useState('Načítavam...'); 

  // Animation values for smooth appearance
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-20);
  const locationCardOpacity = useSharedValue(0);
  const locationCardTranslateY = useSharedValue(20);
  const availabilityCardOpacity = useSharedValue(0);
  const availabilityCardTranslateY = useSharedValue(20);
  const smallCardsOpacity = useSharedValue(0);
  const smallCardsTranslateY = useSharedValue(20);
  const featuresCardOpacity = useSharedValue(0);
  const featuresCardTranslateY = useSharedValue(20);
  const mapCardOpacity = useSharedValue(0);
  const mapCardTranslateY = useSharedValue(20);
  const infoCardOpacity = useSharedValue(0);
  const infoCardTranslateY = useSharedValue(20);

  const loadParking = useCallback(async () => {
    if (!id) return;
    if (!validateParkingId(id)) return;
    try {
      const data = await getParkingDetail(id);
      setParking(data);
    } catch (e) {
      console.error(e);
    }
  }, [id]);

  useLayoutEffect(() => {
    loadParking();
  }, [loadParking]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadParking();
    } finally {
      setRefreshing(false);
    }
  }, [loadParking]);
  
  // Automatická aktualizácia relatívneho času každých 30 sekúnd
  useEffect(() => {
    if (!parking || !parking.lastUpdate) return;
    
    // Funkcia na aktualizáciu stavu
    const updateTime = () => {
        setRelativeUpdateTime(formatLastUpdate(parking.lastUpdate));
    };
    
    // Okamžité nastavenie
    updateTime();
    
    // Nastavenie intervalu
    const intervalId = setInterval(updateTime, 30000); // 30 sekúnd
    
    return () => clearInterval(intervalId); // Vyčistenie intervalu
  }, [parking?.lastUpdate]); // Spustiť len, keď sa zmení dátum aktualizácie parkoviska

  // Animate all elements smoothly when parking data loads
  useEffect(() => {
    if (parking) {
      // Start all animations immediately with staggered delays for smooth appearance
      headerOpacity.value = withDelay(0, withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
      headerTranslateY.value = withDelay(0, withTiming(0, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
      
      locationCardOpacity.value = withDelay(50, withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
      locationCardTranslateY.value = withDelay(50, withTiming(0, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
      
      availabilityCardOpacity.value = withDelay(100, withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
      availabilityCardTranslateY.value = withDelay(100, withTiming(0, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
      
      smallCardsOpacity.value = withDelay(150, withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
      smallCardsTranslateY.value = withDelay(150, withTiming(0, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
      
      featuresCardOpacity.value = withDelay(200, withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
      featuresCardTranslateY.value = withDelay(200, withTiming(0, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
      
      mapCardOpacity.value = withDelay(250, withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
      mapCardTranslateY.value = withDelay(250, withTiming(0, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
      
      infoCardOpacity.value = withDelay(300, withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
      infoCardTranslateY.value = withDelay(300, withTiming(0, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
    }
  }, [parking, headerOpacity, headerTranslateY, locationCardOpacity, locationCardTranslateY, availabilityCardOpacity, availabilityCardTranslateY, smallCardsOpacity, smallCardsTranslateY, featuresCardOpacity, featuresCardTranslateY, mapCardOpacity, mapCardTranslateY, infoCardOpacity, infoCardTranslateY]);

  useEffect(() => {
    if (parking) {
      const pct = (parking.freeSpots / parking.totalSpots) * 100;
      progressWidth.value = withTiming(pct, { duration: 350 });
    }
  }, [parking, progressWidth]);

  // Compute favorite status - this will update when favorites array changes
  const favorite = useMemo(() => {
    return parking ? isFavorite(parking.id) : false;
  }, [parking, favorites, isFavorite]);

  // Update icon scale when favorite status changes
  useEffect(() => {
    if (parking) {
      iconScale.value = withTiming(favorite ? 1.2 : 1, { duration: 150 });
    }
  }, [favorite, parking, iconScale]);

  const iconStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: iconScale.value }],
    };
  }, []);

  const progressBarAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value}%`,
    };
  }, []);
  
  // Animated styles for all sections
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));
  
  const locationCardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: locationCardOpacity.value,
    transform: [{ translateY: locationCardTranslateY.value }],
  }));
  
  const availabilityCardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: availabilityCardOpacity.value,
    transform: [{ translateY: availabilityCardTranslateY.value }],
  }));
  
  const smallCardsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: smallCardsOpacity.value,
    transform: [{ translateY: smallCardsTranslateY.value }],
  }));
  
  const featuresCardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: featuresCardOpacity.value,
    transform: [{ translateY: featuresCardTranslateY.value }],
  }));
  
  const mapCardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: mapCardOpacity.value,
    transform: [{ translateY: mapCardTranslateY.value }],
  }));
  
  const infoCardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: infoCardOpacity.value,
    transform: [{ translateY: infoCardTranslateY.value }],
  }));

  // All hooks must be called before any conditional returns
  const handleFavoritePress = useCallback(() => {
    if (!parking) return;
    
    // Get current favorite status directly from store to avoid stale closure
    const currentFavorite = isFavorite(parking.id);
    if (currentFavorite) {
      removeFavorite(parking.id);
    } else {
      addFavorite(parking.id);
    }
  }, [parking, isFavorite, addFavorite, removeFavorite]);

  const handleOpenMaps = useCallback(() => {
    if (!parking) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${parking.coordinates.latitude},${parking.coordinates.longitude}`;
    Linking.openURL(url);
  }, [parking]);

  // Now safe to do conditional return
  if (!parking) {
    return <SkeletonParkingDetail />;
  }

  const statusColor = getStatusColor(parking.freeSpots, parking.totalSpots);
  const freePctText = ((parking.freeSpots / parking.totalSpots) * 100).toFixed(0);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']} />
      <Animated.View style={[styles.stickyHeader, headerAnimatedStyle]}>
        <LinearGradient
          colors={[Colors.gradient.start, Colors.gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}>
          <View style={styles.headerPattern}>
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
              <Pattern id="dots" patternUnits="userSpaceOnUse" width="12" height="12">
                <Circle cx="1.5" cy="1.5" r="1.5" fill="rgba(255,255,255,0.12)" />
              </Pattern>
              <Rect width="100%" height="100%" fill="url(#dots)" />
            </Svg>
          </View>
          <View style={styles.headerRow}>
            <Pressable style={styles.headerBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={Colors.white} />
            </Pressable>
            <Pressable 
              style={styles.headerBtn} 
              onPress={handleFavoritePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Animated.View style={iconStyle}>
                <Ionicons
                  name={favorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={favorite ? '#E74C3C' : Colors.white}
                />
              </Animated.View>
            </Pressable>
          </View>
          <View style={styles.brandTextContainer}>
            <Text style={styles.brandText}>ParkMe</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.gradient.start}
            colors={[Colors.gradient.start]}
          />
        }>
        <Animated.View style={[styles.locationCard, locationCardAnimatedStyle]}>
          <View style={styles.locationTop}>
            <Text style={styles.locationTitle} numberOfLines={1}>{parking.name}</Text>
            <LiveBadge size="small" />
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={Colors.text.secondary} />
            <Text style={styles.locationAddress} numberOfLines={1}>{parking.address}</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.availabilityCard, availabilityCardAnimatedStyle]}>
          <View style={styles.availabilityHeader}>
            <Text style={styles.sectionTitle}>Dostupnosť</Text>
            <View style={[styles.statusPill, { backgroundColor: getStatusPillColor(parking.freeSpots, parking.totalSpots) }]}>
              <Text style={[styles.statusPillText, { color: getStatusPillTextColor(parking.freeSpots, parking.totalSpots) }]}>
                {getStatusText(parking.freeSpots, parking.totalSpots)}
              </Text>
            </View>
          </View>
          <View style={styles.freeRow}>
            <Text style={[styles.freeNumber, { color: statusColor }]}>{parking.freeSpots}</Text>
            <Text style={styles.freeTotal}> / {parking.totalSpots} miest</Text>
          </View>
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, { backgroundColor: statusColor }, progressBarAnimatedStyle]} />
          </View>
          <Text style={styles.freePct}>{freePctText}% voľných miest</Text>
        </Animated.View>

        <Animated.View style={[styles.smallCardsRow, smallCardsAnimatedStyle]}>
            <View style={styles.smallCard}>
            <View style={styles.smallIcon}>
              <Ionicons name="logo-euro" size={16} color={Colors.gradient.start} />
            </View>
            <Text style={styles.smallLabel}>Cena</Text>
            <Text style={styles.smallValue}>{parking.price}</Text>
          </View>
          <View style={styles.smallCard}>
            <View style={styles.smallIcon}>
              <Ionicons name="time-outline" size={16} color={Colors.gradient.start} />
            </View>
            <Text style={styles.smallLabel}>Otvorené</Text>
            <Text style={styles.smallValue}>{parking.openingHours || 'Po-Ne: 00:00 - 24:00'}</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.sectionCard, featuresCardAnimatedStyle]}>
          <Text style={styles.sectionTitle}>Vybavenie</Text>
          <View style={styles.badgesRow}>
            {parking.features.map((f, i) => (
              <View key={i} style={styles.badge}>
                <View style={styles.badgeIcon}>
                  <Ionicons name={getFeatureIcon(f)} size={16} color={Colors.gradient.end} />
                </View>
                <Text style={styles.badgeText}>{f}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[styles.sectionCard, mapCardAnimatedStyle]}>
          <Text style={styles.sectionTitle}>Umiestnenie</Text>
          <View style={styles.mapWrap}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: parking.coordinates.latitude,
                longitude: parking.coordinates.longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              loadingEnabled={true}
              mapType="standard"
              cacheEnabled={true}
            >
              <Marker
                coordinate={parking.coordinates}
                pinColor={statusColor}
                title={parking.name}
                description={parking.address}
                tracksViewChanges={false}
              />
            </MapView>
          </View>
          <Pressable style={styles.mapsBtn} onPress={handleOpenMaps}>
            <Text style={styles.mapsBtnText}>Otvoriť v Google Maps</Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.sectionCard, infoCardAnimatedStyle]}>
          <Text style={styles.sectionTitle}>Ďalšie informácie</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={Colors.text.secondary} />
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Oblasť</Text>
              <Text style={styles.infoValue}>{parking.area}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.text.secondary} />
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Posledná aktualizácia</Text>
              <Text style={styles.infoValue}>{formatLastUpdate(parking.lastUpdate)}</Text>
            </View>
          </View>
        </Animated.View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function getStatusColor(free: number, total: number) {
  const pct = (free / total) * 100;
  if (pct >= 70) return Colors.status.green;
  if (pct >= 40) return Colors.status.orange;
  return Colors.status.red;
}

function getStatusPillColor(free: number, total: number) {
  const pct = (free / total) * 100;
  if (pct >= 70) return Colors.status.light.green;
  if (pct >= 40) return Colors.status.light.orange;
  return Colors.status.light.red;
}

function getStatusPillTextColor(free: number, total: number) {
  const pct = (free / total) * 100;
  if (pct >= 70) return Colors.status.green;
  if (pct >= 40) return Colors.status.orange;
  return Colors.status.red;
}

function getStatusText(free: number, total: number) {
  const pct = (free / total) * 100;
  if (pct >= 70) return 'Voľné';
  if (pct >= 40) return 'Obmedzené';
  return 'Takmer plné';
}

function getFeatureIcon(f: string) {
  const lf = f.toLowerCase();
  if (lf.includes('kamera')) return 'videocam-outline';
  if (lf.includes('osvet')) return 'sunny-outline';
  if (lf.includes('24') || lf.includes('non-stop')) return 'link-outline';
  return 'link-outline';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    zIndex: 200,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    zIndex: 150,
  },
  headerGradient: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: HEADER_HEIGHT + 12,
    paddingBottom: 12,
  },
  locationCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
    marginBottom: 6,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  locationAddress: {
    fontSize: 13,
    color: Colors.text.secondary,
    flex: 1,
  },
  availabilityCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statusPill: {
    backgroundColor: Colors.status.light.green,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.status.green,
  },
  freeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  freeNumber: {
    fontSize: 44,
    fontWeight: '800',
  },
  freeTotal: {
    fontSize: 18,
    color: Colors.text.secondary,
    marginLeft: 4,
    marginBottom: 5,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  freePct: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 6,
  },
  smallCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  smallCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  smallIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: Colors.gradient.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  smallLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 3,
  },
  smallValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gradient.light,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.gradient.subtle,
  },
  badgeIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.gradient.light,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  mapWrap: {
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 14,
    marginBottom: 14,
  },
  map: {
    flex: 1,
  },
  mapsBtn: {
    backgroundColor: Colors.gradient.start,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: Colors.gradient.start,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  mapsBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14.5,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  brandTextContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 44,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.15)',
    letterSpacing: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    textTransform: 'uppercase',
  },
});

