import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

// Shimmer component with smooth animation
const ShimmerEffect = () => {
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

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-350, 350],
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
          'rgba(255, 255, 255, 0.08)',
          'rgba(255, 255, 255, 0.25)',
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

// Skeleton line component
interface SkeletonLineProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}

const SkeletonLine = ({ width, height, borderRadius = 6, style }: SkeletonLineProps) => (
  <View style={[styles.skeletonLine, { width, height, borderRadius }, style]} />
);

export default function SkeletonCard() {
  return (
    <View style={styles.card}>
      <ShimmerEffect />
      <View style={styles.content}>
        {/* Header skeleton */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <SkeletonLine width="75%" height={20} borderRadius={8} />
            <View style={styles.addressRow}>
              <SkeletonLine width={16} height={16} borderRadius={8} />
              <SkeletonLine width="60%" height={14} />
            </View>
          </View>
          <SkeletonLine width={36} height={36} borderRadius={18} />
        </View>

        {/* Availability skeleton */}
        <View style={styles.availabilityRow}>
          <SkeletonLine width={90} height={18} />
          <SkeletonLine width={55} height={24} borderRadius={12} />
        </View>

        {/* Progress bar skeleton */}
        <View style={styles.progressBarContainer}>
          <SkeletonLine width="55%" height={8} borderRadius={4} />
        </View>

        {/* Footer skeleton */}
        <View style={styles.footer}>
          <SkeletonLine width={80} height={32} borderRadius={16} />
          <View style={styles.featuresRow}>
            <SkeletonLine width={65} height={28} borderRadius={14} />
            <SkeletonLine width={65} height={28} borderRadius={14} />
            <SkeletonLine width={40} height={28} borderRadius={14} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    width: '100%',
    minHeight: 170,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
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
    width: 150,
    height: '100%',
  },
  content: {
    width: '100%',
    zIndex: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    gap: 10,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBarContainer: {
    marginBottom: 16,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.03)',
    overflow: 'hidden',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonLine: {
    backgroundColor: '#E8ECF0',
  },
});

