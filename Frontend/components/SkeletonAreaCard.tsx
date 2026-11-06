import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

// Shimmer effect component
const ShimmerEffect = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <Animated.View
      style={[
        styles.shimmerContainer,
        { transform: [{ translateX }] },
      ]}
    >
      <LinearGradient
        colors={[
          'transparent',
          'rgba(255, 255, 255, 0.15)',
          'rgba(255, 255, 255, 0.35)',
          'rgba(255, 255, 255, 0.15)',
          'transparent',
        ]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.shimmerGradient}
      />
    </Animated.View>
  );
};

// Skeleton line component
interface SkeletonLineProps {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
}

const SkeletonLine = ({ width, height, borderRadius = 6 }: SkeletonLineProps) => (
  <View style={[styles.skeletonLine, { width, height, borderRadius }]} />
);

export default function SkeletonAreaCard() {
  return (
    <View style={styles.card}>
      <ShimmerEffect />
      <View style={styles.content}>
        {/* Header skeleton */}
        <View style={styles.header}>
          <SkeletonLine width="65%" height={22} borderRadius={8} />
          <SkeletonLine width={28} height={28} borderRadius={14} />
        </View>

        {/* Details skeleton */}
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <SkeletonLine width={18} height={18} borderRadius={9} />
            <SkeletonLine width="55%" height={16} />
          </View>
          <View style={styles.detailRow}>
            <SkeletonLine width={12} height={12} borderRadius={6} />
            <SkeletonLine width="45%" height={16} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    flex: 1,
    minHeight: 160,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
    backgroundColor: '#F0F2F5',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  shimmerGradient: {
    width: 120,
    height: '100%',
  },
  content: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    zIndex: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  details: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skeletonLine: {
    backgroundColor: '#DDE1E6',
  },
});
