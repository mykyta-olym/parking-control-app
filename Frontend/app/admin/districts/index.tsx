import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  Easing,
  Dimensions,
  DimensionValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/colors';
import { getDistricts, deleteDistrict, District } from '@/lib/adminApi';
import { showSuccess, showError } from '@/lib/toast';

const { width: screenWidth } = Dimensions.get('window');

// Shimmer Skeleton Box
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

// Skeleton District Item with shimmer
const SkeletonDistrictItem = ({ shimmerAnim }: { shimmerAnim: Animated.Value }) => (
  <View style={styles.districtItem}>
    <View style={styles.districtContent}>
      <View style={styles.districtHeader}>
        <ShimmerBox width={40} height={40} borderRadius={12} shimmerAnim={shimmerAnim} />
        <View style={styles.districtInfo}>
          <ShimmerBox width="60%" height={17} shimmerAnim={shimmerAnim} />
          <ShimmerBox width="40%" height={12} style={{ marginTop: 4 }} shimmerAnim={shimmerAnim} />
        </View>
      </View>
      <View style={styles.districtStats}>
        <ShimmerBox width={80} height={14} shimmerAnim={shimmerAnim} />
        <ShimmerBox width={70} height={14} shimmerAnim={shimmerAnim} />
        <ShimmerBox width={60} height={14} shimmerAnim={shimmerAnim} />
      </View>
    </View>
  </View>
);

// District Item Component
interface DistrictItemProps {
  district: District;
  onPress: () => void;
  onDelete: (district: District) => void;
}

const DistrictItem: React.FC<DistrictItemProps> = ({ district, onPress, onDelete }) => {
  return (
    <TouchableOpacity 
      style={styles.districtItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.districtContent}>
        <View style={styles.districtHeader}>
          <View style={[styles.colorDot, { backgroundColor: district.color }]} />
          <View style={styles.districtInfo}>
            <Text style={styles.districtName}>{district.label || district.name}</Text>
            <Text style={styles.districtId}>ID: {district.id}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
        </View>
        
        {district.description && (
          <Text style={styles.districtDescription} numberOfLines={2}>
            {district.description}
          </Text>
        )}

        <View style={styles.districtStats}>
          <View style={styles.statItem}>
            <Ionicons name="car-outline" size={16} color={Colors.text.secondary} />
            <Text style={styles.statText}>{district.zoneCount || 0} parkovísk</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="location-outline" size={16} color={Colors.text.secondary} />
            <Text style={styles.statText}>{district.totalSpots || 0} miest</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#2ecc71" />
            <Text style={styles.statText}>{district.freeSpots || 0} voľných</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={(e) => {
              e.stopPropagation();
              onDelete(district);
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Main Districts Screen
export default function DistrictsScreen() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  const fetchDistricts = useCallback(async () => {
    try {
      setError(null);
      const data = await getDistricts();
      setDistricts(data);
    } catch (err) {
      console.error('Failed to fetch districts:', err);
      setError('Nepodarilo sa načítať okresy');
      setDistricts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDistricts();
    }, [fetchDistricts])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDistricts();
  }, [fetchDistricts]);

  const handleDelete = (district: District) => {
    Alert.alert(
      'Vymazať okres',
      `Naozaj chcete vymazať okres "${district.label || district.name}"?`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Vymazať',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDistrict(district.id);
              setDistricts((prev) => prev.filter((d) => d.id !== district.id));
              showSuccess('Okres bol úspešne vymazaný', 'Vymazané');
            } catch (error) {
              showError('Nepodarilo sa vymazať okres', 'Chyba');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Správa okresov</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats Summary */}
      <View style={styles.statsSummary}>
        <Text style={styles.statsText}>
          {districts.length} okresov
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/admin/districts/create' as any)}
        >
          <LinearGradient
            colors={[Colors.gradient.start, Colors.gradient.end]}
            style={styles.addGradient}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Nový okres</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Districts List */}
      {loading ? (
        <View style={styles.skeletonList}>
          <SkeletonDistrictItem shimmerAnim={shimmerAnim} />
          <SkeletonDistrictItem shimmerAnim={shimmerAnim} />
          <SkeletonDistrictItem shimmerAnim={shimmerAnim} />
          <SkeletonDistrictItem shimmerAnim={shimmerAnim} />
        </View>
      ) : (
        <FlatList
          data={districts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DistrictItem
              district={item}
              onPress={() => router.push(`/admin/districts/${item.id}` as any)}
              onDelete={handleDelete}
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
                name={error ? "cloud-offline-outline" : "map-outline"} 
                size={64} 
                color={Colors.text.tertiary} 
              />
              <Text style={styles.emptyText}>
                {error ? 'Chyba načítania' : 'Žiadne okresy'}
              </Text>
              <Text style={styles.emptySubtext}>
                {error || 'Pridajte nový okres'}
              </Text>
              {error && (
                <TouchableOpacity style={styles.retryButton} onPress={fetchDistricts}>
                  <Text style={styles.retryButtonText}>Skúsiť znova</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
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
  districtItem: {
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
  districtContent: {
    padding: 16,
  },
  districtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorDot: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: 12,
  },
  districtInfo: {
    flex: 1,
  },
  districtName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  districtId: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  districtDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  districtStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {},
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
});
