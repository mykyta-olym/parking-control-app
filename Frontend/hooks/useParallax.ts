import { useEffect } from 'react';
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface UseParallaxOptions {
  scrollY: number;
  parallaxSpeed?: number;
}

export function useParallax({ scrollY, parallaxSpeed = 0.5 }: UseParallaxOptions) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = scrollY * parallaxSpeed;
  }, [scrollY, parallaxSpeed]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return { animatedStyle, translateY };
}

