import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import {
  getDashboardSummary,
  formatOccupancy,
  setAdminApiKey,
  validateApiKey,
  getAdminApiKey,
} from '@/lib/adminApi';
import { DashboardSummary, AdminZone } from '@/lib/adminTypes';
import SkeletonAdminDashboard from '@/components/SkeletonAdminDashboard';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// Auth Modal Component
interface AuthModalProps {
  visible: boolean;
  onAuth: (key: string) => void;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ visible, onAuth, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!apiKey.trim()) {
      setError('Zadajte API kľúč');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('[Auth] Starting validation...');
      const isValid = await validateApiKey(apiKey.trim());
      console.log('[Auth] Validation result:', isValid);
      if (isValid) {
        onAuth(apiKey.trim());
      } else {
        setError('Neplatný API kľúč alebo server nedostupný');
      }
    } catch (err) {
      console.error('[Auth] Error:', err);
      setError('Chyba pripojenia k serveru');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.authModal}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.text.secondary} />
          </TouchableOpacity>
          <View style={styles.authIconContainer}>
            <Ionicons name="shield-checkmark" size={48} color={Colors.gradient.start} />
          </View>
          <Text style={styles.authTitle}>Admin prístup</Text>
          <Text style={styles.authSubtitle}>Zadajte API kľúč pre prístup</Text>
          
          <TextInput
            style={styles.authInput}
            placeholder="API kľúč"
            placeholderTextColor={Colors.text.tertiary}
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          {error ? <Text style={styles.authError}>{error}</Text> : null}
          
          <TouchableOpacity 
            style={[styles.authButton, loading && styles.authButtonDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={[Colors.gradient.start, Colors.gradient.end]}
              style={styles.authButtonGradient}
            >
              <Text style={styles.authButtonText}>
                {loading ? 'Overujem...' : 'Prihlásiť'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

// District Card Component (similar to Zone cards)
interface DistrictBarProps {
  label: string;
  occupancy: number;
  color: string;
  total: number;
  free: number;
  districtId?: string;
}

const DistrictBar: React.FC<DistrictBarProps> = ({ label, occupancy, color, total, free, districtId }) => {
  const occupied = total - free;
  const occupancyColor = occupancy >= 90 ? '#e74c3c' : occupancy >= 70 ? '#f39c12' : '#27ae60';
  
  return (
    <TouchableOpacity
      style={styles.districtCard}
      onPress={() => districtId && router.push(`/admin/districts/${districtId}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.districtCardHeader}>
        <View style={[styles.districtColorBadge, { backgroundColor: color }]}>
          <Ionicons name="location" size={16} color="#fff" />
        </View>
        <View style={styles.districtCardInfo}>
          <Text style={styles.districtCardName}>{label}</Text>
          <Text style={styles.districtCardSubtitle}>{total} miest celkom</Text>
        </View>
        <View style={styles.districtCardStats}>
          <Text style={[styles.districtOccupancyRate, { color: occupancyColor }]}>
            {Math.round(occupancy)}%
          </Text>
        </View>
      </View>
      
      <View style={styles.districtProgressContainer}>
        <View style={styles.progressBackground}>
          <View style={[styles.progressFill, { backgroundColor: occupancyColor, width: `${Math.min(occupancy, 100)}%` }]} />
        </View>
      </View>
      
      <View style={styles.districtCardFooter}>
        <View style={styles.districtStatItem}>
          <Ionicons name="checkmark-circle" size={14} color="#27ae60" />
          <Text style={styles.districtStatText}>{free} voľných</Text>
        </View>
        <View style={styles.districtStatItem}>
          <Ionicons name="car" size={14} color="#e74c3c" />
          <Text style={styles.districtStatText}>{occupied} obsadených</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
      </View>
    </TouchableOpacity>
  );
};

// Zone List Item
interface ZoneItemProps {
  zone: AdminZone;
  type: 'occupied' | 'available';
}

const ZoneItem: React.FC<ZoneItemProps> = ({ zone, type }) => (
  <TouchableOpacity
    style={styles.zoneItem}
    onPress={() => router.push(`/admin/zones/${zone.id}` as any)}
    activeOpacity={0.7}
  >
    <View style={styles.zoneItemLeft}>
      <Text style={styles.zoneItemName} numberOfLines={1}>{zone.name}</Text>
      <Text style={styles.zoneItemAddress} numberOfLines={1}>
        {zone.address || 'Bez adresy'}
      </Text>
    </View>
    <View style={styles.zoneItemRight}>
      <Text style={styles.zoneItemSpots}>{zone.freeSpots} / {zone.totalSpots}</Text>
      <Text style={[
        styles.zoneItemRate,
        { color: type === 'occupied' ? '#e74c3c' : '#27ae60' }
      ]}>
        {formatOccupancy(zone.occupancyRate)}
      </Text>
    </View>
  </TouchableOpacity>
);

// Main Dashboard Screen
export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation values for smooth appearance
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);
  const bannerOpacity = useSharedValue(0);
  const bannerTranslateY = useSharedValue(20);
  const cardsOpacity = useSharedValue(0);
  const cardsTranslateY = useSharedValue(20);

  // Check if already authenticated
  useEffect(() => {
    const existingKey = getAdminApiKey();
    if (existingKey) {
      setIsAuthenticated(true);
    } else {
      setLoading(false);
    }
  }, []);

  // Animate content when data loads
  useEffect(() => {
    if (!loading && data) {
      contentOpacity.value = withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      });
      contentTranslateY.value = withTiming(0, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      });
      bannerOpacity.value = withDelay(50, withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
      bannerTranslateY.value = withDelay(50, withTiming(0, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
      cardsOpacity.value = withDelay(100, withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
      cardsTranslateY.value = withDelay(100, withTiming(0, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      }));
    }
  }, [loading, data]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const bannerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bannerOpacity.value,
    transform: [{ translateY: bannerTranslateY.value }],
  }));

  const cardsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardsOpacity.value,
    transform: [{ translateY: cardsTranslateY.value }],
  }));

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setError(null);
      const summary = await getDashboardSummary();
      setData(summary);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('403')) {
        setIsAuthenticated(false);
        setAdminApiKey('');
      } else {
        setError('Nepodarilo sa načítať dáta');
      }
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchData();
      }
    }, [isAuthenticated, fetchData])
  );

  const handleAuth = (key: string) => {
    setAdminApiKey(key);
    setIsAuthenticated(true);
    setLoading(true);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleLogout = () => {
    Alert.alert(
      'Odhlásiť',
      'Naozaj sa chcete odhlásiť?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        { 
          text: 'Odhlásiť', 
          style: 'destructive',
          onPress: () => {
            setIsAuthenticated(false);
            setAdminApiKey('');
            setData(null);
            setLoading(false);
          }
        },
      ]
    );
  };

  // Auth screen
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AuthModal visible={true} onAuth={handleAuth} onClose={() => router.back()} />
      </SafeAreaView>
    );
  }

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <SkeletonAdminDashboard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.errorScrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline-outline" size={64} color={Colors.text.tertiary} />
            <Text style={styles.errorTitle}>Chyba načítania</Text>
            <Text style={styles.errorText}>{error || 'Skúste to znova'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
              <Text style={styles.retryButtonText}>Skúsiť znova</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { overview } = data;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={Colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero Stats */}
        <Animated.View style={bannerAnimatedStyle}>
          <LinearGradient
            colors={[Colors.gradient.start, Colors.gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <Text style={styles.heroTitle}>Celkový prehľad</Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{overview.totalSpots}</Text>
                <Text style={styles.heroStatLabel}>Celkom</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{overview.freeSpots}</Text>
                <Text style={styles.heroStatLabel}>Voľných</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{formatOccupancy(overview.overallOccupancyRate)}</Text>
                <Text style={styles.heroStatLabel}>Obsadenosť</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Quick Stats Grid */}
        <Animated.View style={cardsAnimatedStyle}>
          <View style={styles.statsGrid}>
            <StatCard title="Parkovísk" value={overview.totalZones} icon="location" color="#3498db" />
            <StatCard title="Okresov" value={overview.districts?.length || 0} icon="map-outline" color="#e74c3c" />
            <StatCard title="Garáže" value={overview.zonesByType?.garage || 0} icon="business" color="#9b59b6" />
            <StatCard title="Ulice" value={overview.zonesByType?.street || 0} icon="map" color="#1abc9c" />
          </View>
        </Animated.View>

        {/* Quick Actions - Districts */}
        <Animated.View style={cardsAnimatedStyle}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Okresy</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/admin/districts' as any)}>
                <Ionicons name="map" size={20} color={Colors.gradient.start} />
                <Text style={styles.actionBtnText}>Zoznam</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/admin/districts/create' as any)}>
                <Ionicons name="add-circle" size={20} color="#27ae60" />
                <Text style={styles.actionBtnText}>Nový okres</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions - Parkings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parkoviská</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/admin/zones' as any)}>
                <Ionicons name="car" size={20} color={Colors.gradient.start} />
                <Text style={styles.actionBtnText}>Zoznam</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/admin/zones/create' as any)}>
                <Ionicons name="add-circle" size={20} color="#27ae60" />
                <Text style={styles.actionBtnText}>Nové parkovisko</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Districts Overview */}
          {overview.districts && overview.districts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Okresy</Text>
                <TouchableOpacity onPress={() => router.push('/admin/districts' as any)}>
                  <Text style={styles.seeAllText}>Všetko</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.districtsContainer}>
                {overview.districts.map((district) => (
                  <DistrictBar
                    key={district.district}
                    districtId={district.district}
                    label={district.districtLabel}
                    occupancy={district.occupancyRate}
                    color={district.color}
                    total={district.totalSpots}
                    free={district.freeSpots}
                  />
              ))}
              </View>
            </View>
          )}

          {/* Top Occupied Zones */}
          {data.topOccupiedZones && data.topOccupiedZones.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Najviac obsadené</Text>
                <TouchableOpacity onPress={() => router.push('/admin/zones?sort=occupancy' as any)}>
                  <Text style={styles.seeAllText}>Všetko</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.sectionCard}>
                {data.topOccupiedZones.slice(0, 3).map((zone) => (
                  <ZoneItem key={zone.id} zone={zone} type="occupied" />
                ))}
              </View>
            </View>
          )}

          {/* Top Available Zones */}
          {data.topAvailableZones && data.topAvailableZones.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Najviac voľných</Text>
                <TouchableOpacity onPress={() => router.push('/admin/zones?sort=free' as any)}>
                  <Text style={styles.seeAllText}>Všetko</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.sectionCard}>
                {data.topAvailableZones.slice(0, 3).map((zone) => (
                  <ZoneItem key={zone.id} zone={zone} type="available" />
                ))}
              </View>
            </View>
          )}
        </Animated.View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.gradient.start,
  },
  logoutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  errorScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.gradient.start,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  heroCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  heroStatItem: {
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  heroStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  statTitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  seeAllText: {
    fontSize: 13,
    color: Colors.gradient.start,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
  },
  districtsContainer: {
    gap: 12,
  },
  districtCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  districtCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  districtColorBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  districtCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  districtCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  districtCardSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  districtCardStats: {
    alignItems: 'flex-end',
  },
  districtOccupancyRate: {
    fontSize: 20,
    fontWeight: '800',
  },
  districtProgressContainer: {
    marginBottom: 12,
  },
  districtCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  districtStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    gap: 4,
  },
  districtStatText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  districtBar: {
    marginBottom: 14,
  },
  districtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  districtLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  districtDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  districtLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  districtStats: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  progressBackground: {
    height: 6,
    backgroundColor: Colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  zoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  zoneItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  zoneItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  zoneItemAddress: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  zoneItemRight: {
    alignItems: 'flex-end',
  },
  zoneItemSpots: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  zoneItemRate: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomSpacing: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authModal: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 1,
  },
  authIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.gradient.start}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  authInput: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  authError: {
    color: '#e74c3c',
    fontSize: 13,
    marginBottom: 12,
  },
  authButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
