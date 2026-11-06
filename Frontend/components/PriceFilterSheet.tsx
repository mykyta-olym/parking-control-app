import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Colors } from '@/constants/colors';
import { showSuccess } from '@/lib/toast';
import { useModalStore } from '@/store/modalStore';

const AnimatedView = Animated.createAnimatedComponent(View);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PriceFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  maxPrice: number | undefined; // undefined means filter not applied
  onPriceChange: (price: number | undefined) => void;
  showOnlyFree: boolean;
  onShowOnlyFreeChange: (value: boolean) => void;
  onApply: () => void;
}

const MAX_PRICE = 10;
const PRICE_STEPS = [0, 2.5, 5, 7.5, 10]; // Price marker positions
const PRICE_STEP_SIZE = 0.5; // Rounding step for price slider

export default function PriceFilterSheet({
  isOpen,
  onClose,
  maxPrice,
  onPriceChange,
  showOnlyFree,
  onShowOnlyFreeChange,
  onApply,
}: PriceFilterSheetProps) {
  const { canOpenModal } = useModalStore();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [sliderWidth, setSliderWidth] = useState(SCREEN_WIDTH - 96);
  // Use MAX_PRICE if maxPrice is undefined (filter not applied yet)
  const effectiveMaxPrice = maxPrice !== undefined ? maxPrice : MAX_PRICE;
  const [localPrice, setLocalPrice] = useState(effectiveMaxPrice);
  const [localShowOnlyFree, setLocalShowOnlyFree] = useState(showOnlyFree);
  const sliderPosition = useSharedValue((effectiveMaxPrice / MAX_PRICE) * 100);
  const startPosition = useSharedValue(0);
  // Toggle position: 2px when off (padding), 22px when on (50 width - 26 thumb - 2 padding = 22)
  const togglePosition = useSharedValue(showOnlyFree ? 22 : 2);
  
  // Track when sheet was just opened to sync state only once
  const wasOpenRef = useRef(isOpen);
  
  // Sync local state ONLY when sheet opens - use current props
  // This ensures we always show the current filter state, including when filters are cleared
  useEffect(() => {
    const justOpened = !wasOpenRef.current && isOpen;
    
    if (justOpened) {
      // When opening, sync with current props (which reflect actual applied state)
      // This ensures cleared filters show correctly
      setLocalPrice(effectiveMaxPrice);
      setLocalShowOnlyFree(showOnlyFree);
      const initialPercentage = (effectiveMaxPrice / MAX_PRICE) * 100;
      sliderPosition.value = initialPercentage;
      togglePosition.value = showOnlyFree ? 22 : 2;
    }
    
    wasOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, showOnlyFree, effectiveMaxPrice]);

  const snapPoints = useMemo(() => ['40%'], []);

  const handleSheetChanges = useCallback((index: number) => {
    const { closeModal: closeModalStore, openModal: openModalStore, isModalOpen: isModalOpenStore } = useModalStore.getState();
    if (index === -1) {
      // When sheet closes via gesture or programmatically
      // Close modal in store first, then call onClose
      closeModalStore('filterSheet');
      onClose();
    } else if (index >= 0) {
      // Sheet opened - ensure modal is registered
      if (!isModalOpenStore('filterSheet')) {
        openModalStore('filterSheet');
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      // Check if we can open this modal (peekSheet should block it)
      if (!canOpenModal('filterSheet')) {
        // PeekSheet is open, prevent opening filterSheet
        // Close the filter sheet immediately
        onClose();
        return;
      }
      // If peekSheet is open, close it first before opening filterSheet
      const { isModalOpen: checkModalOpen, closeModal: closeModalStore, openModal: openModalStore } = useModalStore.getState();
      if (checkModalOpen('peekSheet')) {
        closeModalStore('peekSheet');
        // Small delay to ensure peekSheet closes before opening filterSheet
        setTimeout(() => {
          openModalStore('filterSheet');
      bottomSheetRef.current?.expand();
        }, 100);
    } else {
        // Only open if not already open to avoid unnecessary state updates
        if (!checkModalOpen('filterSheet')) {
          openModalStore('filterSheet');
        }
        bottomSheetRef.current?.expand();
    }
    }
    // Don't close modal here - it's handled by handleSheetChanges when sheet actually closes
    // This prevents infinite loops from state updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, canOpenModal, onClose]);

  const handleSliderLayout = (event: { nativeEvent: { layout: { width: number } } }) => {
    const { width } = event.nativeEvent.layout;
    setSliderWidth(width);
  };

  const handleSliderPress = (event: { nativeEvent: { locationX: number } }) => {
    const { locationX } = event.nativeEvent;
    const x = Math.max(0, Math.min(sliderWidth, locationX));
    const percentage = Math.max(0, Math.min(100, (x / sliderWidth) * 100));
    // Round to nearest step for better UX
    const rawPrice = (percentage / 100) * MAX_PRICE;
    const roundedPrice = Math.round(rawPrice / PRICE_STEP_SIZE) * PRICE_STEP_SIZE;
    const clampedPrice = Math.max(0, Math.min(MAX_PRICE, roundedPrice));
    const finalPercentage = (clampedPrice / MAX_PRICE) * 100;
    
    sliderPosition.value = withTiming(finalPercentage, { 
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
    setLocalPrice(clampedPrice);
    // Don't call onPriceChange here - only on apply
  };

  const updateLocalPrice = useCallback((price: number) => {
    setLocalPrice(price);
  }, []);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          startPosition.value = sliderPosition.value;
        })
        .onUpdate((event) => {
          const deltaX = event.translationX;
          const deltaPercentage = (deltaX / sliderWidth) * 100;
          const newPercentage = Math.max(0, Math.min(100, startPosition.value + deltaPercentage));
          // Round to nearest step during drag
          const rawPrice = (newPercentage / 100) * MAX_PRICE;
          const roundedPrice = Math.round(rawPrice / PRICE_STEP_SIZE) * PRICE_STEP_SIZE;
          const clampedPrice = Math.max(0, Math.min(MAX_PRICE, roundedPrice));
          const finalPercentage = (clampedPrice / MAX_PRICE) * 100;
          
          sliderPosition.value = finalPercentage;
          runOnJS(updateLocalPrice)(clampedPrice);
        }),
    [sliderWidth, updateLocalPrice, sliderPosition, startPosition]
  );

  const sliderStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      width: `${sliderPosition.value}%`,
    };
  }, []);

  const thumbStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      left: `${sliderPosition.value}%`,
    };
  }, []);

  const toggleThumbStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      left: togglePosition.value,
    };
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={isOpen ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      enableContentPanningGesture={true}
      enableHandlePanningGesture={true}
      activeOffsetY={[-5, 5]}
      failOffsetX={[-100, 100]}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      android_keyboardInputMode="adjustResize"
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      detached={false}>
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>Filtre</Text>

        {/* Len voľné toggle */}
        <View style={styles.filterSection}>
          <View style={styles.toggleRow}>
            <Text style={styles.label}>Len voľné miesta</Text>
            <Pressable
              style={[styles.toggle, localShowOnlyFree && styles.toggleActive]}
              onPress={() => {
                const newValue = !localShowOnlyFree;
                setLocalShowOnlyFree(newValue);
                // Animate toggle thumb position: 2px when off, 22px when on (50 width - 26 thumb - 2 padding = 22)
                togglePosition.value = withTiming(newValue ? 22 : 2, { 
                  duration: 200,
                  easing: Easing.out(Easing.cubic),
                });
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <View style={styles.toggleContainer}>
                <AnimatedView 
                  style={[styles.toggleThumb, toggleThumbStyle]}
                  pointerEvents="none"
                />
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Price filter */}
        <Text style={styles.sectionTitle}>Cenový filter</Text>
        <View style={styles.priceRow}>
          <Text style={styles.label}>Maximálna cena</Text>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>€{localPrice.toFixed(2)}/hod</Text>
          </View>
        </View>

        <View style={styles.sliderContainer} onLayout={handleSliderLayout}>
          <Pressable 
            onPress={handleSliderPress} 
            style={styles.sliderPressable}
            android_ripple={{ color: 'rgba(0,0,0,0.1)' }}>
            <View style={styles.sliderTrack}>
              <Animated.View style={[styles.sliderFill, sliderStyle]} />
              {/* Price step markers */}
              {PRICE_STEPS.map((price, index) => {
                const percentage = (price / MAX_PRICE) * 100;
                const isActive = localPrice >= price;
                return (
                  <AnimatedView
                    key={price}
                    style={[
                      styles.priceMarker,
                      { left: `${percentage}%` },
                    ]}>
                    <AnimatedView 
                      style={[
                        styles.priceMarkerDot,
                        isActive && styles.priceMarkerDotActive,
                      ]}
                    />
                  </AnimatedView>
                );
              })}
            </View>
          </Pressable>
          {sliderWidth > 0 && (
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[styles.sliderThumb, thumbStyle]}>
                <View style={styles.sliderThumbInner} />
              </Animated.View>
            </GestureDetector>
          )}
        </View>

        <View style={styles.priceRangeRow}>
          <View style={styles.priceRangeItem}>
            <Text style={styles.priceRangeLabel}>Min</Text>
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>€0.00</Text>
            </View>
          </View>
          <View style={styles.priceRangeItem}>
            <Text style={styles.priceRangeLabel}>Max</Text>
          <View style={styles.priceBadge}>
              <Text style={styles.priceText}>€{MAX_PRICE.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <Pressable 
          style={styles.applyButton} 
          onPress={() => {
            // Security: Validate price before applying
            const validatedPrice = Math.max(0, Math.min(MAX_PRICE, localPrice));
            
            // Apply filters - this updates parent state
            // Only apply price filter if it's less than MAX_PRICE (otherwise pass undefined)
            onPriceChange(validatedPrice < MAX_PRICE ? validatedPrice : undefined);
            onShowOnlyFreeChange(localShowOnlyFree);
            
            // Show success message
            const filterParts = [];
            if (localShowOnlyFree) filterParts.push('Len voľné');
            if (validatedPrice < MAX_PRICE) filterParts.push(`€${validatedPrice.toFixed(2)}/hod`);
            showSuccess(filterParts.length > 0 ? `Filter aplikovaný: ${filterParts.join(', ')}` : 'Filter aplikovaný');
            
            // Close sheet after applying
            bottomSheetRef.current?.close();
            if (onApply) {
              onApply();
            } else {
              onClose();
            }
          }}>
          <Text style={styles.applyButtonText}>Použiť filter</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  handleIndicator: {
    backgroundColor: Colors.border,
    width: 40,
    height: 4,
    marginTop: 8,
  },
  sheetBackground: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 24,
  },
  filterSection: {
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.border,
    padding: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  toggleActive: {
    backgroundColor: Colors.status.green,
  },
  toggleContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  toggleThumb: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  priceBadge: {
    backgroundColor: Colors.gradient.light,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gradient.start,
  },
  sliderContainer: {
    position: 'relative',
    height: 40,
    marginBottom: 20,
    justifyContent: 'center',
  },
  sliderPressable: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
  },
  sliderTrack: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: Colors.gradient.start,
    borderRadius: 3,
  },
  priceMarker: {
    position: 'absolute',
    top: -6,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -9 }],
  },
  priceMarkerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  priceMarkerDotActive: {
    backgroundColor: Colors.gradient.start,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.gradient.start,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -12 }],
  },
  sliderThumbInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gradient.start,
  },
  priceRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  priceRangeItem: {
    alignItems: 'center',
  },
  priceRangeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  applyButton: {
    backgroundColor: Colors.gradient.start,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.gradient.start,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});
