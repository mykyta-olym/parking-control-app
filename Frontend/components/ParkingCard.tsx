import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolate,
  useAnimatedReaction,
  Easing,
} from 'react-native-reanimated';
import { useEffect, useCallback, memo } from 'react';
import { useFavoritesStore } from '@/store/favoritesStore';
import { Parking } from '@/lib/types';
import { Colors } from '@/constants/colors';
import LiveBadge from './LiveBadge';

interface ParkingCardProps {
  parking: Parking;
  onPress?: () => void;
  index?: number;
  delay?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const getStatusColor = (freeSpots: number, totalSpots: number) => {
  const percentage = (freeSpots / totalSpots) * 100;
  if (percentage > 50) return Colors.status.green;
  if (percentage >= 20) return Colors.status.orange;
  return Colors.status.red;
};

function ParkingCard({ 
  parking, 
  onPress,
  index = 0,
  delay = 0,
}: ParkingCardProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore();
  const favorite = isFavorite(parking.id);

  const statusColor = getStatusColor(parking.freeSpots, parking.totalSpots);
  const occupiedSpots = parking.totalSpots - parking.freeSpots;
  const fillPercentage = (occupiedSpots / parking.totalSpots) * 100;

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.95);
  const pressed = useSharedValue(0);
  const progressWidth = useSharedValue(0);
  const iconScale = useSharedValue(1);

  useEffect(() => {
    // Instant appearance - no delays
    opacity.value = 1;
    translateY.value = 0;
    scale.value = 1;
    
    // Progress bar animation
    progressWidth.value = withTiming(fillPercentage, { duration: 200 });
  }, [fillPercentage, opacity, translateY, scale, progressWidth]);

  useAnimatedReaction(
    () => favorite,
    (isFavorite) => {
      'worklet';
      iconScale.value = withTiming(isFavorite ? 1.2 : 1, { duration: 150 });
    },
    [favorite]
  );

  const handleFavoritePress = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (favorite) {
      // Play local exit animation before removing from store
      opacity.value = withTiming(0, { 
        duration: 250, 
        easing: Easing.out(Easing.ease) 
      });
      translateY.value = withTiming(-20, { 
        duration: 250, 
        easing: Easing.out(Easing.ease) 
      });
      scale.value = withTiming(0.9, { 
        duration: 250, 
        easing: Easing.out(Easing.ease) 
      });
      setTimeout(() => {
        removeFavorite(parking.id);
      }, 260);
    } else {
      // Smooth animation when adding to favorites
      iconScale.value = withTiming(1.3, { 
        duration: 200, 
        easing: Easing.out(Easing.back(1.5)) 
      }, () => {
        iconScale.value = withTiming(1, { 
          duration: 150, 
          easing: Easing.out(Easing.ease) 
        });
      });
      addFavorite(parking.id);
    }
  };

  const cardStyle = useAnimatedStyle(() => {
    'worklet';
    const scaleValue = interpolate(
      pressed.value,
      [0, 1],
      [1, 0.97],
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

  const progressBarStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      width: `${progressWidth.value}%`,
    };
  }, []);

  const iconStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: iconScale.value }],
    };
  }, []);

  const handlePressIn = useCallback(() => {
    pressed.value = withTiming(1, { duration: 80 });
  }, [pressed]);

  const handlePressOut = useCallback(() => {
    pressed.value = withTiming(0, { duration: 80 });
  }, [pressed]);

  return (
    <AnimatedPressable
      style={[styles.card, cardStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.name}>{parking.name}</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={14} color={Colors.text.secondary} />
            <Text style={styles.address}>{parking.address}</Text>
          </View>
        </View>
        <Pressable 
          onPress={handleFavoritePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.favoriteButton}>
          <Animated.View style={iconStyle}>
            <Ionicons
              name={favorite ? 'heart' : 'heart-outline'}
              size={24}
              color={favorite ? '#E74C3C' : Colors.text.secondary}
            />
          </Animated.View>
        </Pressable>
      </View>

      <View style={styles.availabilityRow}>
        <Text style={styles.availability}>
          {parking.freeSpots} / {parking.totalSpots}
        </Text>
        <LiveBadge backgroundColor={Colors.status.green} size="small" />
      </View>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { backgroundColor: statusColor },
              progressBarStyle,
            ]}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <View
          style={[
            styles.priceBadge,
            parking.price === 'Zdarma' || parking.price === '0' ? styles.priceBadgeFree : styles.priceBadgePaid,
          ]}>
          <Text style={styles.priceText}>
            {parking.price === 'Zdarma' || parking.price === '0' 
              ? 'Zdarma' 
              : parking.pricePerHour !== undefined 
                ? `${parking.pricePerHour.toFixed(2).replace('.', ',')} €/h`
                : `${parking.price} €/h`}
          </Text>
        </View>
        <View style={styles.features}>
          {parking.features.slice(0, 2).map((feature, index) => (
            <View key={index} style={styles.featureBadge}>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
          {parking.features.length > 2 && (
            <View style={styles.featureBadgeMore}>
              <Text style={styles.featureTextMore}>+{parking.features.length - 2}</Text>
            </View>
          )}
        </View>
      </View>
      <LinearGradient
        colors={['transparent', Colors.overlay]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientOverlay}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 0,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    width: '100%',
    minHeight: 160,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    fontSize: 14,
    color: Colors.text.secondary,
    flexShrink: 1,
  },
  favoriteButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
    minHeight: 32,
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  availability: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    marginRight: 'auto',
  },
  priceBadgeFree: {
    backgroundColor: Colors.text.primary,
  },
  priceBadgePaid: {
    backgroundColor: Colors.gradient.start,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },
  features: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    flexShrink: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  featureBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: Colors.gradient.light,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gradient.start,
  },
  featureBadgeMore: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: Colors.backgroundSecondary,
  },
  featureTextMore: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    pointerEvents: 'none',
  },
});

export default memo(ParkingCard);

