import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

// Shimmer effect component
const ShimmerEffect = ({ style }: { style?: object }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-400, 400],
  });

  return (
    <Animated.View
      style={[
        styles.shimmerContainer,
        { transform: [{ translateX }] },
        style,
      ]}
    >
      <LinearGradient
        colors={[
          'transparent',
          'rgba(255, 255, 255, 0.1)',
          'rgba(255, 255, 255, 0.25)',
          'rgba(255, 255, 255, 0.1)',
          'transparent',
        ]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.shimmerGradient}
      />
    </Animated.View>
  );
};

// Animated marker component
const AnimatedMarker = ({ style }: { style: object }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.markerSkeleton,
        style,
        { transform: [{ scale: pulseAnim }] },
      ]}
    />
  );
};

export default function SkeletonMap() {
  return (
    <View style={styles.container}>
      {/* Map skeleton */}
      <View style={styles.mapContainer}>
        <View style={styles.mapSkeleton} />
        <ShimmerEffect />
        
        {/* Map markers skeleton with pulse animation */}
        <View style={styles.markersContainer}>
          <AnimatedMarker style={styles.marker1} />
          <AnimatedMarker style={styles.marker2} />
          <AnimatedMarker style={styles.marker3} />
          <AnimatedMarker style={styles.marker4} />
          <AnimatedMarker style={styles.marker5} />
        </View>

        {/* Interactive button skeleton */}
        <View style={styles.buttonContainer}>
          <View style={styles.buttonSkeleton} />
        </View>

        {/* FAB buttons skeleton */}
        <View style={styles.fabContainer}>
          <View style={styles.fabSkeleton} />
          <View style={[styles.fabSkeleton, styles.fabSecond]} />
        </View>
      </View>

      {/* Legend skeleton */}
      <View style={styles.legendContainer}>
        <ShimmerEffect />
        <View style={styles.legendTitleSkeleton} />
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={styles.legendDotSkeleton} />
            <View style={styles.legendTextSkeleton} />
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendDotSkeleton} />
            <View style={styles.legendTextSkeleton} />
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendDotSkeleton} />
            <View style={styles.legendTextSkeleton} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
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
    width: 200,
    height: '100%',
  },
  mapContainer: {
    height: 400,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E8ECF0',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    position: 'relative',
  },
  mapSkeleton: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E4E8',
  },
  markersContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  markerSkeleton: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#CBD0D6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  marker1: {
    top: '25%',
    left: '30%',
  },
  marker2: {
    top: '40%',
    left: '55%',
  },
  marker3: {
    top: '60%',
    left: '25%',
  },
  marker4: {
    top: '35%',
    left: '70%',
  },
  marker5: {
    top: '65%',
    left: '60%',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 3,
  },
  buttonSkeleton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#D4D9DF',
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    gap: 10,
    zIndex: 3,
  },
  fabSkeleton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#CBD0D6',
  },
  fabSecond: {},
  legendContainer: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    position: 'relative',
  },
  legendTitleSkeleton: {
    width: 110,
    height: 24,
    borderRadius: 8,
    marginBottom: 18,
    backgroundColor: '#E8ECF0',
  },
  legendItems: {
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  legendDotSkeleton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DDE1E6',
  },
  legendTextSkeleton: {
    width: '65%',
    height: 16,
    borderRadius: 6,
    backgroundColor: '#E8ECF0',
  },
});
