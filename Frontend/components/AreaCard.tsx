import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useEffect, useCallback, memo } from 'react';
import { Colors } from '@/constants/colors';

interface AreaCardProps {
  name: string;
  parkingCount: number;
  freeSpots: number;
  color: string;
  onPress?: () => void;
  index?: number;
  delay?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function AreaCard({ 
  name, 
  parkingCount, 
  freeSpots, 
  color, 
  onPress,
  index = 0,
  delay = 0,
}: AreaCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.95);
  const pressed = useSharedValue(0);

  useEffect(() => {
    // Instant appearance - no delays
    opacity.value = 1;
    translateY.value = 0;
    scale.value = 1;
  }, [opacity, translateY, scale]);

  const cardStyle = useAnimatedStyle(() => {
    'worklet';
    const scaleValue = interpolate(
      pressed.value,
      [0, 1],
      [1, 0.95],
      Extrapolate.CLAMP
    );
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value * scaleValue },
      ],
    };
  }, []);

  const animatedDotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handlePressIn = useCallback(() => {
    pressed.value = withTiming(1, { duration: 80 });
  }, [pressed]);

  const handlePressOut = useCallback(() => {
    pressed.value = withTiming(0, { duration: 80 });
  }, [pressed]);

  return (
    <AnimatedPressable
      style={[styles.card, { backgroundColor: color }, cardStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}>
      <View style={styles.header}>
            <Text style={styles.name}>{name}</Text>
            <Ionicons name="location-outline" size={20} color="#FFFFFF" />
      </View>
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="business-outline" size={16} color="#FFFFFF" />
          <Text style={styles.detailText}>{parkingCount} parkovísk</Text>
        </View>
        <View style={styles.detailRow}>
          <Animated.View style={[styles.dot, animatedDotStyle]} />
          <Text style={styles.detailText}>{freeSpots} voľných</Text>
        </View>
      </View>
      <View style={styles.gradientOverlay} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    flex: 1,
    minHeight: 160,
    justifyContent: 'space-between',
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    zIndex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  details: {
    gap: 10,
    zIndex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 20,
  },
});

export default memo(AreaCard);

