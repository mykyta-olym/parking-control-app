import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Colors } from '@/constants/colors';

interface LiveBadgeProps {
  backgroundColor?: string;
  size?: 'small' | 'medium' | 'large';
}

// Use green/teal color for Live badge as per design
const DEFAULT_LIVE_COLOR = '#4ECDC4'; // Teal/green color

export default function LiveBadge({ 
  backgroundColor = DEFAULT_LIVE_COLOR,
  size = 'medium'
}: LiveBadgeProps) {
  const dotOpacity = useSharedValue(1);

  useEffect(() => {
    dotOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      false
    );
  }, [dotOpacity]);

  const dotAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: dotOpacity.value,
    };
  }, []);

  const dotSize = size === 'small' ? 6 : size === 'large' ? 10 : 8;
  const fontSize = size === 'small' ? 11 : size === 'large' ? 14 : 12;
  const paddingH = size === 'small' ? 8 : size === 'large' ? 14 : 10;
  const paddingV = size === 'small' ? 4 : size === 'large' ? 7 : 5;
  const gap = size === 'small' ? 5 : size === 'large' ? 7 : 6;
  const borderRadius = size === 'small' ? 14 : size === 'large' ? 20 : 18;

  return (
    <View style={[styles.liveBadge, { backgroundColor, paddingHorizontal: paddingH, paddingVertical: paddingV, borderRadius, gap }]}>
      <Animated.View 
        style={[
          styles.liveDot, 
          { width: dotSize, height: dotSize, borderRadius: dotSize / 2 },
          dotAnimatedStyle
        ]} 
      />
      <Text style={[styles.liveText, { fontSize }]}>Live</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.live,
    shadowColor: Colors.live,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  liveDot: {
    backgroundColor: Colors.white,
  },
  liveText: {
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
});

