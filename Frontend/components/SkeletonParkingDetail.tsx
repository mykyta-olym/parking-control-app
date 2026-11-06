import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

// Global shimmer animation hook
const useShimmer = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  return shimmerAnim;
};

// Shimmer overlay component
const ShimmerOverlay = ({ shimmerAnim }: { shimmerAnim: Animated.Value }) => {
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-400, 400],
  });

  return (
    <Animated.View
      style={[
        styles.shimmerOverlay,
        { transform: [{ translateX }] },
      ]}
    >
      <LinearGradient
        colors={[
          'transparent',
          'rgba(255, 255, 255, 0.08)',
          'rgba(255, 255, 255, 0.2)',
          'rgba(255, 255, 255, 0.08)',
          'transparent',
        ]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.shimmerGradient}
      />
    </Animated.View>
  );
};

export default function SkeletonParkingDetail() {
  const shimmerAnim = useShimmer();

  interface SkeletonBoxProps {
    width: number | string;
    height: number;
    borderRadius?: number;
    style?: object;
  }

  const SkeletonBox = ({ width, height, borderRadius = 8, style }: SkeletonBoxProps) => (
    <View style={[styles.skeleton, { width, height, borderRadius }, style]} />
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']} />
      <View style={styles.header}>
        <View style={styles.headerGradient}>
          <ShimmerOverlay shimmerAnim={shimmerAnim} />
          <View style={styles.headerRow}>
            <SkeletonBox width={44} height={44} borderRadius={22} />
            <SkeletonBox width={44} height={44} borderRadius={22} />
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Location card skeleton */}
        <View style={styles.card}>
          <ShimmerOverlay shimmerAnim={shimmerAnim} />
          <View style={styles.locationTop}>
            <SkeletonBox width="70%" height={20} />
            <SkeletonBox width={55} height={24} borderRadius={12} />
          </View>
          <View style={styles.locationRow}>
            <SkeletonBox width={16} height={16} borderRadius={8} />
            <SkeletonBox width="80%" height={14} style={{ marginLeft: 8 }} />
          </View>
        </View>

        {/* Availability card skeleton */}
        <View style={styles.card}>
          <ShimmerOverlay shimmerAnim={shimmerAnim} />
          <View style={styles.availabilityHeader}>
            <SkeletonBox width={110} height={17} />
            <SkeletonBox width={85} height={26} borderRadius={13} />
          </View>
          <View style={styles.freeRow}>
            <SkeletonBox width={65} height={48} borderRadius={6} />
            <SkeletonBox width={95} height={20} borderRadius={6} style={{ marginLeft: 6, marginBottom: 6 }} />
          </View>
          <View style={styles.progressBarBg}>
            <SkeletonBox width="60%" height={10} borderRadius={5} />
          </View>
          <SkeletonBox width={130} height={14} style={{ marginTop: 10 }} />
        </View>

        {/* Small cards row skeleton */}
        <View style={styles.smallCardsRow}>
          <View style={styles.smallCard}>
            <ShimmerOverlay shimmerAnim={shimmerAnim} />
            <SkeletonBox width={36} height={36} borderRadius={18} />
            <SkeletonBox width={55} height={14} style={{ marginTop: 12 }} />
            <SkeletonBox width={70} height={18} style={{ marginTop: 4 }} />
          </View>
          <View style={styles.smallCard}>
            <ShimmerOverlay shimmerAnim={shimmerAnim} />
            <SkeletonBox width={36} height={36} borderRadius={18} />
            <SkeletonBox width={55} height={14} style={{ marginTop: 12 }} />
            <SkeletonBox width={100} height={18} style={{ marginTop: 4 }} />
          </View>
        </View>

        {/* Features card skeleton */}
        <View style={styles.card}>
          <ShimmerOverlay shimmerAnim={shimmerAnim} />
          <SkeletonBox width={90} height={17} />
          <View style={styles.badgesRow}>
            <View style={styles.badgeContainer}>
              <SkeletonBox width={28} height={28} borderRadius={14} />
              <SkeletonBox width={75} height={17} borderRadius={6} />
            </View>
            <View style={styles.badgeContainer}>
              <SkeletonBox width={28} height={28} borderRadius={14} />
              <SkeletonBox width={85} height={17} borderRadius={6} />
            </View>
            <View style={styles.badgeContainer}>
              <SkeletonBox width={28} height={28} borderRadius={14} />
              <SkeletonBox width={80} height={17} borderRadius={6} />
            </View>
          </View>
        </View>

        {/* Map card skeleton */}
        <View style={styles.card}>
          <ShimmerOverlay shimmerAnim={shimmerAnim} />
          <SkeletonBox width={110} height={17} />
          <View style={styles.mapWrap}>
            <SkeletonBox width="100%" height={200} borderRadius={16} />
          </View>
          <SkeletonBox width="100%" height={52} borderRadius={16} style={{ marginTop: 14 }} />
        </View>

        {/* Info card skeleton */}
        <View style={styles.card}>
          <ShimmerOverlay shimmerAnim={shimmerAnim} />
          <SkeletonBox width={130} height={17} />
          <View style={styles.infoRow}>
            <SkeletonBox width={20} height={20} borderRadius={10} />
            <View style={styles.infoCol}>
              <SkeletonBox width={65} height={14} borderRadius={6} />
              <SkeletonBox width={85} height={16} borderRadius={6} style={{ marginTop: 6 }} />
            </View>
          </View>
          <View style={styles.infoRow}>
            <SkeletonBox width={20} height={20} borderRadius={10} />
            <View style={styles.infoCol}>
              <SkeletonBox width={150} height={14} borderRadius={6} />
              <SkeletonBox width={110} height={16} borderRadius={6} style={{ marginTop: 6 }} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    zIndex: 200,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  shimmerGradient: {
    width: 180,
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    zIndex: 150,
  },
  headerGradient: {
    flex: 1,
    paddingTop: 52,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: '#E8ECF0',
    overflow: 'hidden',
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 155,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  locationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#F0F2F5',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 14,
  },
  mapWrap: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 0,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    height: 38,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  freeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 0,
  },
  smallCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  smallCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 14,
  },
  infoCol: {
    flex: 1,
  },
  skeleton: {
    backgroundColor: '#E8ECF0',
  },
});

