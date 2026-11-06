import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Colors } from '@/constants/colors';

interface LoaderProps {
  size?: number;
  color?: string;
  overlay?: boolean;
}

export default function Loader({ 
  size = 50, 
  color = Colors.gradient.start,
  overlay = false 
}: LoaderProps) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Rotation animation
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 2000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // Scale pulse animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, {
          duration: 600,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: 600,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );

    // Opacity pulse animation
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, {
          duration: 600,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: 600,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );
  }, [rotation, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const dotSize = size / 4;

  return (
    <View style={[styles.container, overlay && styles.overlay]}>
      <Animated.View style={[styles.loaderContainer, { width: size, height: size }, animatedStyle]}>
        {/* Center dot */}
        <View style={[styles.dot, { 
          width: dotSize * 0.8, 
          height: dotSize * 0.8, 
          backgroundColor: color, 
          borderRadius: dotSize * 0.4 
        }]} />
        
        {/* Rotating dots in circle */}
        <View style={[styles.orbitingDot, { 
          top: -dotSize / 2,
          left: size / 2 - dotSize / 2,
          backgroundColor: color, 
          width: dotSize, 
          height: dotSize, 
          borderRadius: dotSize / 2 
        }]} />
        <View style={[styles.orbitingDot, { 
          top: size / 2 - dotSize / 2,
          right: -dotSize / 2,
          backgroundColor: color, 
          width: dotSize, 
          height: dotSize, 
          borderRadius: dotSize / 2 
        }]} />
        <View style={[styles.orbitingDot, { 
          bottom: -dotSize / 2,
          left: size / 2 - dotSize / 2,
          backgroundColor: color, 
          width: dotSize, 
          height: dotSize, 
          borderRadius: dotSize / 2 
        }]} />
        <View style={[styles.orbitingDot, { 
          top: size / 2 - dotSize / 2,
          left: -dotSize / 2,
          backgroundColor: color, 
          width: dotSize, 
          height: dotSize, 
          borderRadius: dotSize / 2 
        }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loaderContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    position: 'absolute',
  },
  orbitingDot: {
    position: 'absolute',
  },
});

