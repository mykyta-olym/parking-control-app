import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useNetworkStatus } from '@/lib/network';

interface OfflineBannerProps {
  onRetry?: () => void;
  showStaleDataWarning?: boolean;
  lastUpdateTime?: number | null;
}

export default function OfflineBanner({
  onRetry,
  showStaleDataWarning = false,
  lastUpdateTime,
}: OfflineBannerProps) {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const translateY = useSharedValue(-100);
  const pulseOpacity = useSharedValue(1);

  const isOffline = !isConnected || !isInternetReachable;

  useEffect(() => {
    if (isOffline) {
      translateY.value = withTiming(0, { duration: 300 });
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      translateY.value = withTiming(-100, { duration: 300 });
      pulseOpacity.value = 1; // Reset opacity when online
    }
  }, [isOffline]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const formatLastUpdate = (timestamp: number | null): string => {
    if (!timestamp) return 'Neznámy';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Práve teraz';
    if (minutes === 1) return 'Pred 1 minútou';
    if (minutes < 60) return `Pred ${minutes} minútami`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return 'Pred 1 hodinou';
    return `Pred ${hours} hodinami`;
  };

  if (!isOffline && !showStaleDataWarning) {
    return null;
  }

  const bannerColor = isOffline ? Colors.status.red : Colors.status.orange;

  return (
    <Animated.View style={[styles.container, { backgroundColor: bannerColor }, animatedStyle]}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, pulseStyle]}>
          <Ionicons 
            name={isOffline ? 'cloud-offline' : 'information-circle'} 
            size={20} 
            color={Colors.white} 
          />
        </Animated.View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {isOffline ? 'Offline' : 'Údaje môžu byť zastarané'}
          </Text>
          {isOffline ? (
            <Text style={styles.subtitle}>
              Skontrolujte pripojenie k internetu
            </Text>
          ) : (
            lastUpdateTime && (
              <Text style={styles.subtitle}>
                Posledná aktualizácia: {formatLastUpdate(lastUpdateTime)}
              </Text>
            )
          )}
        </View>

        {onRetry && isOffline && (
          <Pressable style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryText}>Skúsiť znova</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.status.red,
    zIndex: 1000,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.9,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
});

