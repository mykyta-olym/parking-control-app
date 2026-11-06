import { useEffect } from 'react';
import {
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

interface UseStaggeredAnimationOptions {
  itemCount: number;
  delayBetweenItems?: number;
  initialDelay?: number;
  duration?: number;
  onAnimationComplete?: () => void;
}

export function useStaggeredAnimation({
  itemCount,
  delayBetweenItems = 100,
  initialDelay = 0,
  duration = 600,
  onAnimationComplete,
}: UseStaggeredAnimationOptions) {
  const animations = Array.from({ length: itemCount }, () => ({
    opacity: useSharedValue(0),
    translateY: useSharedValue(30),
    scale: useSharedValue(0.9),
  }));

  useEffect(() => {
    const completionCount = { current: 0 };

    animations.forEach((anim, index) => {
      const delay = initialDelay + index * delayBetweenItems;
      
      anim.opacity.value = withDelay(
        delay,
        withTiming(1, {
          duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        })
      );

      anim.translateY.value = withDelay(
        delay,
        withTiming(0, {
          duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        })
      );

      anim.scale.value = withDelay(
        delay,
        withTiming(1, {
          duration,
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        }, () => {
          completionCount.current += 1;
          if (completionCount.current === itemCount && onAnimationComplete) {
            runOnJS(onAnimationComplete)();
          }
        })
      );
    });
  }, [itemCount, delayBetweenItems, initialDelay, duration]);

  return animations;
}

