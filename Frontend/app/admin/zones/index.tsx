import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  DimensionValue,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Colors } from '@/constants/colors';
import {
  getZones,
  deleteZone,
  getDistrictLabel,
  getOccupancyColor,
  formatOccupancy,
  getZoneTypeLabel,
  getDistricts,
  District,
  ZoneListParams,
} from '@/lib/adminApi';
import { AdminZone } from '@/lib/adminTypes';
import { showSuccess, showError } from '@/lib/toast';

const { width: screenWidth, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Shimmer Box for skeleton
interface ShimmerBoxProps {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: any;
  shimmerAnim: Animated.Value;
}

const ShimmerBox: React.FC<ShimmerBoxProps> = ({
  width,
  height,
  borderRadius = 8,
  style,
  shimmerAnim,
}) => {
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth, screenWidth],
  });

  return (
    <View style={[styles.skeletonBox, { width, height, borderRadius, overflow: 'hidden' }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={['#E8E8E8', '#F5F5F5', '#FAFAFA', '#F5F5F5', '#E8E8E8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const ZONE_TYPES = [
  { value: '', label: 'Všetky typy' },
  { value: 'street', label: 'Ulica' },
  { value: 'garage', label: 'Garáž' },
  { value: 'lot', label: 'Parkovisko' },
  { value: 'private', label: 'Súkromné' },
];

const SORT_OPTIONS = [
  { value: 'name', label: 'Názov' },
  { value: 'occupancy_rate', label: 'Obsadenosť' },
  { value: 'free_spots', label: 'Voľných miest' },
  { value: 'total_spots', label: 'Počet miest' },
  { value: 'district', label: 'Okres' },
];

// Zone List Item Component
interface ZoneItemProps {
  zone: AdminZone;
  onEdit: (zone: AdminZone) => void;
  onDelete: (zone: AdminZone) => void;
  onViewAnalytics: (zone: AdminZone) => void;
}

const ZoneItem: React.FC<ZoneItemProps> = ({
  zone,
  onEdit,
  onDelete,
  onViewAnalytics,
}) => {
  return (
    <View style={styles.zoneItem}>
      <TouchableOpacity
        style={styles.zoneContent}
        activeOpacity={0.8}
        onPress={() => onEdit(zone)}
      >
        <View style={styles.zoneHeader}>
          <View style={styles.zoneInfo}>
            <Text style={styles.zoneName} numberOfLines={1}>
              {zone.name}
            </Text>
            <View style={styles.zoneTags}>
              <View
                style={[
                  styles.zoneTag,
                  { backgroundColor: zone.isOpen ? '#d4edda' : '#f8d7da' },
                ]}
              >
                <Text
                  style={[
                    styles.zoneTagText,
                    { color: zone.isOpen ? '#155724' : '#721c24' },
                  ]}
                >
                  {zone.isOpen ? 'Otvorené' : 'Zatvorené'}
                </Text>
              </View>
              <View style={[styles.zoneTag, { backgroundColor: '#e9ecef' }]}>
                <Text style={styles.zoneTagText}>{getZoneTypeLabel(zone.type)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.occupancyBadge}>
            <Text
              style={[
                styles.occupancyText,
                { color: getOccupancyColor(zone.occupancyRate) },
              ]}
            >
              {formatOccupancy(zone.occupancyRate)}
            </Text>
          </View>
        </View>

        <View style={styles.zoneDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color={Colors.text.secondary} />
            <Text style={styles.detailText}>{zone.address || 'Bez adresy'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="map-outline" size={14} color={Colors.text.secondary} />
            <Text style={styles.detailText}>{getDistrictLabel(zone.district)}</Text>
          </View>
        </View>

        <View style={styles.zoneStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Celkom</Text>
            <Text style={styles.statValue}>{zone.totalSpots}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Obsadené</Text>
            <Text style={[styles.statValue, { color: '#e74c3c' }]}>
              {zone.occupiedSpots}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Voľné</Text>
            <Text style={[styles.statValue, { color: '#2ecc71' }]}>
              {zone.freeSpots}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Cena/h</Text>
            <Text style={styles.statValue}>
              {zone.pricePerHour ? `${zone.pricePerHour}€` : '-'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onViewAnalytics(zone)}
          >
            <Ionicons name="analytics-outline" size={18} color={Colors.gradient.start} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(zone)}>
            <Ionicons name="create-outline" size={18} color="#3498db" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(zone)}>
            <Ionicons name="trash-outline" size={18} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// Filter Modal Component
interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: ZoneListParams;
  onApply: (filters: ZoneListParams) => void;
  districts: District[];
  loadingDistricts: boolean;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  districts,
  loadingDistricts,
}) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['70%'], []);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  // Build district options from API data
  const districtOptions = [
    { value: '', label: 'Všetky okresy' },
    ...districts.map(d => ({ value: d.id, label: d.label })),
  ];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView style={styles.sheetContent}>
        <Text style={styles.modalTitle}>Filtre</Text>

        {/* District Filter */}
        <Text style={styles.filterLabel}>Okres</Text>
        {loadingDistricts ? (
          <ActivityIndicator size="small" color={Colors.gradient.start} style={{ marginVertical: 10 }} />
        ) : (
          <View style={styles.filterOptions}>
            {districtOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterChip,
                  localFilters.district === option.value && styles.filterChipActive,
                ]}
                onPress={() =>
                  setLocalFilters({ ...localFilters, district: option.value })
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    localFilters.district === option.value &&
                      styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Zone Type Filter */}
        <Text style={styles.filterLabel}>Typ parkoviska</Text>
        <View style={styles.filterOptions}>
          {ZONE_TYPES.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterChip,
                localFilters.zoneType === option.value && styles.filterChipActive,
              ]}
              onPress={() =>
                setLocalFilters({ ...localFilters, zoneType: option.value })
              }
            >
              <Text
                style={[
                  styles.filterChipText,
                  localFilters.zoneType === option.value &&
                    styles.filterChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sort By */}
        <Text style={styles.filterLabel}>Zoradiť podľa</Text>
        <View style={styles.filterOptions}>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterChip,
                localFilters.sortBy === option.value && styles.filterChipActive,
              ]}
              onPress={() =>
                setLocalFilters({ ...localFilters, sortBy: option.value })
              }
            >
              <Text
                style={[
                  styles.filterChipText,
                  localFilters.sortBy === option.value &&
                    styles.filterChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sort Order */}
        <View style={styles.sortOrderRow}>
          <TouchableOpacity
            style={[
              styles.sortOrderBtn,
              localFilters.sortOrder === 'asc' && styles.sortOrderBtnActive,
            ]}
            onPress={() => setLocalFilters({ ...localFilters, sortOrder: 'asc' })}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={
                localFilters.sortOrder === 'asc' ? '#fff' : Colors.text.secondary
              }
            />
            <Text
              style={[
                styles.sortOrderText,
                localFilters.sortOrder === 'asc' && styles.sortOrderTextActive,
              ]}
            >
              Vzostupne
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortOrderBtn,
              localFilters.sortOrder === 'desc' && styles.sortOrderBtnActive,
            ]}
            onPress={() => setLocalFilters({ ...localFilters, sortOrder: 'desc' })}
          >
            <Ionicons
              name="arrow-down"
              size={18}
              color={
                localFilters.sortOrder === 'desc' ? '#fff' : Colors.text.secondary
              }
            />
            <Text
              style={[
                styles.sortOrderText,
                localFilters.sortOrder === 'desc' && styles.sortOrderTextActive,
              ]}
            >
              Zostupne
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() =>
              setLocalFilters({
                district: '',
                zoneType: '',
                sortBy: 'name',
                sortOrder: 'asc',
              })
            }
          >
            <Text style={styles.clearBtnText}>Vyčistiť</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => {
              onApply(localFilters);
              bottomSheetRef.current?.close();
            }}
          >
            <LinearGradient
              colors={[Colors.gradient.start, Colors.gradient.end]}
              style={styles.applyGradient}
            >
              <Text style={styles.applyBtnText}>Použiť</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

// Helper to get initial filters from URL params
const getInitialFilters = (sort?: string): ZoneListParams => {
  if (sort === 'occupancy') {
    return { district: '', zoneType: '', sortBy: 'occupancy_rate', sortOrder: 'desc' };
  }
  if (sort === 'free') {
    return { district: '', zoneType: '', sortBy: 'free_spots', sortOrder: 'desc' };
  }
  return { district: '', zoneType: '', sortBy: 'name', sortOrder: 'asc' };
};

// Main Zones Screen
export default function ZonesScreen() {
  const params = useLocalSearchParams<{ sort?: string }>();
  const [zones, setZones] = useState<AdminZone[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [filters, setFilters] = useState<ZoneListParams>(getInitialFilters(params.sort));

  // Update filters when URL params change
  useEffect(() => {
    if (params.sort) {
      setFilters(getInitialFilters(params.sort));
    }
  }, [params.sort]);

  // Shimmer animation
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  // Load districts from API
  useEffect(() => {
    const loadDistricts = async () => {
      try {
        const data = await getDistricts();
        setDistricts(data);
      } catch (err) {
        console.error('Failed to load districts:', err);
      } finally {
        setLoadingDistricts(false);
      }
    };
    loadDistricts();
  }, []);

  const fetchZones = useCallback(async () => {
    try {
      setError(null);
      const response = await getZones({
        ...filters,
        search: searchQuery || undefined,
        limit: 100,
      });
      setZones(response.items);
      setTotal(response.total);
    } catch (err: any) {
      console.error('Failed to fetch zones:', err);
      setError(err.message || 'Nepodarilo sa načítať parkoviská');
      setZones([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, searchQuery]);

  // Refresh list when screen comes into focus (after create/edit)
  useFocusEffect(
    useCallback(() => {
      fetchZones();
    }, [fetchZones])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchZones();
  }, [fetchZones]);

  const handleEdit = (zone: AdminZone) => {
    router.push(`/admin/zones/${zone.id}` as any);
  };

  const handleDelete = (zone: AdminZone) => {
    Alert.alert(
      'Vymazať parkovisko',
      `Naozaj chcete vymazať parkovisko "${zone.name}"?`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Vymazať',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteZone(zone.id);
              setZones((prev) => prev.filter((z) => z.id !== zone.id));
              setTotal((prev) => prev - 1);
              showSuccess('Parkovisko bolo úspešne vymazané', 'Vymazané');
            } catch (error) {
              showError('Nepodarilo sa vymazať parkovisko', 'Chyba');
            }
          },
        },
      ]
    );
  };

  const handleViewAnalytics = (zone: AdminZone) => {
    router.push(`/admin/zones/${zone.id}/analytics` as any);
  };

  const activeFiltersCount = [
    filters.district,
    filters.zoneType,
    filters.sortBy !== 'name' ? filters.sortBy : '',
  ].filter(Boolean).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Správa parkovísk</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search and Filter Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInput}>
          <Ionicons name="search" size={20} color={Colors.text.secondary} />
          <TextInput
            style={styles.searchTextInput}
            placeholder="Hľadať parkovisko..."
            placeholderTextColor={Colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={fetchZones}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFiltersCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons
            name="options"
            size={20}
            color={activeFiltersCount > 0 ? '#fff' : Colors.text.secondary}
          />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsSummary}>
        <Text style={styles.statsText}>
          {total} parkovísk • {zones.reduce((sum, z) => sum + z.totalSpots, 0)} miest
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/admin/zones/create' as any)}
        >
          <LinearGradient
            colors={[Colors.gradient.start, Colors.gradient.end]}
            style={styles.addGradient}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Nové parkovisko</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Zones List */}
      {loading ? (
        <View style={styles.skeletonList}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.zoneItem}>
              <View style={styles.zoneContent}>
                <View style={styles.zoneHeader}>
                  <View style={styles.zoneInfo}>
                    <ShimmerBox width="70%" height={17} shimmerAnim={shimmerAnim} />
                    <View style={[styles.zoneTags, { marginTop: 8 }]}>
                      <ShimmerBox width={60} height={20} borderRadius={6} shimmerAnim={shimmerAnim} />
                      <ShimmerBox width={50} height={20} borderRadius={6} shimmerAnim={shimmerAnim} />
                    </View>
                  </View>
                  <ShimmerBox width={50} height={28} borderRadius={8} shimmerAnim={shimmerAnim} />
                </View>
                <View style={styles.zoneDetails}>
                  <ShimmerBox width="80%" height={13} style={{ marginBottom: 4 }} shimmerAnim={shimmerAnim} />
                  <ShimmerBox width="50%" height={13} shimmerAnim={shimmerAnim} />
                </View>
                <View style={styles.zoneStats}>
                  <ShimmerBox width={40} height={30} shimmerAnim={shimmerAnim} />
                  <ShimmerBox width={40} height={30} shimmerAnim={shimmerAnim} />
                  <ShimmerBox width={40} height={30} shimmerAnim={shimmerAnim} />
                  <ShimmerBox width={40} height={30} shimmerAnim={shimmerAnim} />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={zones}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ZoneItem
              zone={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewAnalytics={handleViewAnalytics}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons 
                name={error ? "cloud-offline-outline" : "car-outline"} 
                size={64} 
                color={Colors.text.tertiary} 
              />
              <Text style={styles.emptyText}>
                {error ? 'Chyba načítania' : 'Žiadne parkoviská'}
              </Text>
              <Text style={styles.emptySubtext}>
                {error || 'Pridajte nové parkovisko'}
              </Text>
              {error && (
                <TouchableOpacity style={styles.retryButton} onPress={fetchZones}>
                  <Text style={styles.retryButtonText}>Skúsiť znova</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={setFilters}
        districts={districts}
        loadingDistricts={loadingDistricts}
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  searchBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchTextInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: Colors.text.primary,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterBtnActive: {
    backgroundColor: Colors.gradient.start,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#e74c3c',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  statsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  statsText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonList: {
    padding: 16,
  },
  skeletonBox: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    opacity: 0.6,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  zoneItem: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  zoneContent: {
    padding: 16,
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  zoneInfo: {
    flex: 1,
    marginRight: 12,
  },
  zoneName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  zoneTags: {
    flexDirection: 'row',
    gap: 8,
  },
  zoneTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  zoneTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  occupancyBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  occupancyText: {
    fontSize: 16,
    fontWeight: '800',
  },
  zoneDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginLeft: 6,
  },
  zoneStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.tertiary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: Colors.gradient.start,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // BottomSheet Styles
  sheetBackground: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: Colors.text.tertiary,
    width: 40,
    height: 4,
  },
  sheetContent: {
    flex: 1,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 10,
    marginTop: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  filterChipActive: {
    backgroundColor: Colors.gradient.start,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  sortOrderRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  sortOrderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.background,
    gap: 8,
  },
  sortOrderBtnActive: {
    backgroundColor: Colors.gradient.start,
  },
  sortOrderText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  sortOrderTextActive: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.text.tertiary,
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 15,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
});
