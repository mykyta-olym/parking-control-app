import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

const { width: screenWidth } = Dimensions.get('window');

// Animated Shimmer Skeleton Box
interface SkeletonBoxProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: any;
  shimmerAnim: Animated.Value;
}

const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width: boxWidth = '100%',
  height = 20,
  borderRadius = 8,
  style,
  shimmerAnim,
}) => {
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth, screenWidth],
  });

  return (
    <View
      style={[
        styles.skeletonBox,
        {
          width: boxWidth,
          height,
          borderRadius,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX }] },
        ]}
      >
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

// Main skeleton dashboard component
export default function SkeletonAdminDashboard() {
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

  return (
    <View style={styles.container}>
      {/* Hero Card Skeleton */}
      <View style={styles.heroCard}>
        <SkeletonBox width="60%" height={28} style={{ marginBottom: 8 }} shimmerAnim={shimmerAnim} />
        <SkeletonBox width="40%" height={16} style={{ marginBottom: 24 }} shimmerAnim={shimmerAnim} />
        
        <View style={styles.heroStats}>
          <View style={styles.heroStatItem}>
            <SkeletonBox width={60} height={36} borderRadius={6} shimmerAnim={shimmerAnim} />
            <SkeletonBox width={50} height={12} style={{ marginTop: 8 }} shimmerAnim={shimmerAnim} />
          </View>
          <View style={styles.heroStatItem}>
            <SkeletonBox width={60} height={36} borderRadius={6} shimmerAnim={shimmerAnim} />
            <SkeletonBox width={50} height={12} style={{ marginTop: 8 }} shimmerAnim={shimmerAnim} />
          </View>
          <View style={styles.heroStatItem}>
            <SkeletonBox width={60} height={36} borderRadius={6} shimmerAnim={shimmerAnim} />
            <SkeletonBox width={50} height={12} style={{ marginTop: 8 }} shimmerAnim={shimmerAnim} />
          </View>
        </View>
      </View>

      {/* Quick Stats Grid Skeleton */}
      <View style={styles.statsGrid}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.statCard}>
            <SkeletonBox width={40} height={40} borderRadius={10} shimmerAnim={shimmerAnim} />
            <SkeletonBox width="80%" height={24} style={{ marginTop: 12 }} shimmerAnim={shimmerAnim} />
            <SkeletonBox width="60%" height={14} style={{ marginTop: 6 }} shimmerAnim={shimmerAnim} />
          </View>
        ))}
      </View>

      {/* District Progress Section Skeleton */}
      <View style={styles.section}>
        <SkeletonBox width="50%" height={20} style={{ marginBottom: 16 }} shimmerAnim={shimmerAnim} />
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.districtRow}>
            <View style={styles.districtInfo}>
              <SkeletonBox width={10} height={10} borderRadius={5} shimmerAnim={shimmerAnim} />
              <SkeletonBox width={80} height={14} style={{ marginLeft: 8 }} shimmerAnim={shimmerAnim} />
            </View>
            <SkeletonBox width="100%" height={8} borderRadius={4} style={{ marginTop: 8 }} shimmerAnim={shimmerAnim} />
          </View>
        ))}
      </View>

      {/* Top Zones Section Skeleton */}
      <View style={styles.section}>
        <SkeletonBox width="60%" height={20} style={{ marginBottom: 16 }} shimmerAnim={shimmerAnim} />
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.zoneCard}>
            <View style={styles.zoneInfo}>
              <SkeletonBox width="70%" height={16} shimmerAnim={shimmerAnim} />
              <SkeletonBox width="40%" height={12} style={{ marginTop: 6 }} shimmerAnim={shimmerAnim} />
            </View>
            <SkeletonBox width={50} height={24} borderRadius={6} shimmerAnim={shimmerAnim} />
          </View>
        ))}
      </View>

      {/* Quick Actions Skeleton */}
      <View style={styles.quickActions}>
        <SkeletonBox width="48%" height={56} borderRadius={14} shimmerAnim={shimmerAnim} />
        <SkeletonBox width="48%" height={56} borderRadius={14} shimmerAnim={shimmerAnim} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  skeletonBox: {
    backgroundColor: '#E8E8E8',
    opacity: 0.6,
    overflow: 'hidden',
  },
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  heroStatItem: {
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: (screenWidth - 44) / 2,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  districtRow: {
    marginBottom: 14,
  },
  districtInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoneCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  zoneInfo: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 100,
  },
});
