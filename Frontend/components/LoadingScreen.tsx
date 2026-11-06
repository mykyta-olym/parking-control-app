import { View, StyleSheet, Modal, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import LottieView from 'lottie-react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';

interface LoadingScreenProps {
  onFinish?: () => void;
  visible: boolean;
}

// JSON animation: 151 frames at 29.97 fps = 5038.5ms (rounded to 5040ms)
const JSON_ANIMATION_DURATION = 5040;
const FADE_OUT_DURATION = 800;
const FADE_OUT_START = JSON_ANIMATION_DURATION - FADE_OUT_DURATION; // 4240ms

export default function LoadingScreen({ onFinish, visible }: LoadingScreenProps) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const navBarOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Force hide navigation bar on loading screen
      if (Platform.OS === 'android') {
        // Try to hide navigation bar - this is the main goal
        NavigationBar.setVisibilityAsync('hidden').catch(() => {
          // If hiding fails completely, there's nothing more we can do
          // Don't set background color as it causes warnings with edge-to-edge
        });
      }
      
      opacity.value = 1;
      translateY.value = 0;
      navBarOpacity.value = 0;
      
      // Start fade out of container at 4240ms
      const fadeOutTimer = setTimeout(() => {
        opacity.value = withTiming(0, {
          duration: FADE_OUT_DURATION,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        translateY.value = withTiming(-30, {
          duration: FADE_OUT_DURATION,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }, FADE_OUT_START);

      // Complete finish at 5040ms (matches JSON duration)
      const finishTimer = setTimeout(() => {
        // Show navigation bar with animation after loading completes
        if (Platform.OS === 'android') {
          // Restore navigation bar to default state (visible, dark buttons)
          // Don't set background color to avoid warnings with edge-to-edge
          NavigationBar.setVisibilityAsync('visible').catch(() => {});
          NavigationBar.setButtonStyleAsync('dark').catch(() => {});
          navBarOpacity.value = withDelay(200, withTiming(1, {
            duration: 400,
            easing: Easing.out(Easing.cubic),
          }));
        }
        
        if (onFinish && typeof onFinish === 'function') {
          onFinish();
        }
      }, JSON_ANIMATION_DURATION);

      return () => {
        clearTimeout(fadeOutTimer);
        clearTimeout(finishTimer);
      };
    } else {
      // When visible becomes false, ensure navigation bar is shown and restored to default
      if (Platform.OS === 'android') {
        // Don't set background color to avoid warnings with edge-to-edge
        NavigationBar.setVisibilityAsync('visible').catch(() => {});
        NavigationBar.setButtonStyleAsync('dark').catch(() => {});
      }
      opacity.value = 1;
      translateY.value = 0;
      navBarOpacity.value = 1;
    }
  }, [visible, onFinish, opacity, translateY, navBarOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent>
      <StatusBar hidden={visible} />
      <Animated.View style={[styles.container, animatedStyle]}>
        <LinearGradient
          colors={[Colors.gradient.start, Colors.gradient.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}>
          <View style={styles.overlay} />
          <View style={styles.content}>
            <LottieView
              source={require('@/assets/images/animations/car-animation.json')}
              autoPlay
              loop={false}
              style={styles.lottie}
              speed={1}
              colorFilters={[
                {
                  keypath: 'car',
                  color: Colors.white,
                },
              ]}
            />
          </View>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  content: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  lottie: {
    width: 500,
    height: 500,
  },
});
