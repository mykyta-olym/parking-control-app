import { View, Text, StyleSheet, FlatList, TextInput, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useFavoritesStore } from '@/store/favoritesStore';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
  FadeOutUp,
  Layout,
} from 'react-native-reanimated';
import { searchParkings, getParkingsByArea } from '@/lib/api';
import { validateSearchQuery, validatePrice, validateAreaName } from '@/lib/security';
import { Parking } from '@/lib/types';
import ParkingCard from '@/components/ParkingCard';
import PriceFilterSheet from '@/components/PriceFilterSheet';
import Header from '@/components/Header';
import SkeletonCard from '@/components/SkeletonCard';
import { Colors } from '@/constants/colors';
import { useModalStore } from '@/store/modalStore';

export default function SearchScreen() {
  const favorites = useFavoritesStore((state) => state.favorites);
  const { getFavoriteParkings } = useFavoritesStore();
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  // Local cache of all parkings - loaded once
  const [allParkings, setAllParkings] = useState<Parking[]>([]);
  // Filtered parkings based on current filters (computed instantly)
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | undefined>(
    params.area as string | undefined
  );
  const [maxPrice, setMaxPrice] = useState<number | undefined>(
    params.maxPrice ? parseFloat(params.maxPrice as string) : undefined
  );
  const [showOnlyFree, setShowOnlyFree] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Track if user manually removed filters (to prevent useFocusEffect from restoring them)
  // Store the last removed value to detect if params are trying to restore the same filter
  const lastRemovedAreaRef = useRef<string | null>(null);
  const lastRemovedPriceRef = useRef<number | null>(null);
  
  const searchBarOpacity = useSharedValue(0);
  const searchBarTranslateY = useSharedValue(20);
  const resultsOpacity = useSharedValue(0);

  // Load all parkings once on mount
  const loadAllParkings = useCallback(async () => {
    try {
      const data = await getParkingsByArea();
      setAllParkings(data);
      return data;
    } catch (error) {
      console.error('Error loading parkings:', error);
      setAllParkings([]);
      return [];
    }
  }, []);

  const normalizeString = (str: string): string => {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  // Client-side filtering function - runs instantly, no API calls
  const filterParkings = useCallback((
      data: Parking[],
      query: string,
      area?: string,
      price?: number,
      onlyFree?: boolean
  ): Parking[] => {
      let filtered = [...data];

      // --- 1. Textové vyhľadávanie (query) - MUSÍ BYŤ ROBUSTNÉ ---
      if (query.trim()) {
        // Normalizácia hľadaného výrazu (bez diakritiky, malé písmená)
        const normalizedQuery = normalizeString(query); // Predpokladáme, že normalizeString je dostupné
        
        if (normalizedQuery) {
          filtered = filtered.filter((p) => {
            // Normalizácia všetkých polí, v ktorých sa hľadá
            const normalizedName = normalizeString(p.name);
            const normalizedAddress = normalizeString(p.address || '');
            const normalizedArea = normalizeString(p.area || ''); // p.area je Label ("staré mesto")
            const normalizedAreaCode = normalizeString(p.areaCode || ''); // p.areaCode je Code ("stare mesto")

            return (
              normalizedName.includes(normalizedQuery) ||
              normalizedAddress.includes(normalizedQuery) ||
              normalizedArea.includes(normalizedQuery) ||
              normalizedAreaCode.includes(normalizedQuery.replace(/\s/g, '')) // Hľadanie kódu bez medzier
            );
          });
        }
      }

      // --- 2. Filtrovanie podľa oblasti (Area filter) - MUSÍ BYŤ ROBUSTNÉ ---
      if (area && validateAreaName(area)) { // area je Label ("Staré Mesto")
        const normalizedAreaFilter = normalizeString(area);
        
        filtered = filtered.filter((p) => {
          // Porovnávame normalizované labely
          const normalizedParkingArea = normalizeString(p.area);
          return normalizedParkingArea === normalizedAreaFilter;
        });
      }

      // Filter by price
      if (price !== undefined) {
        const validatedPrice = validatePrice(price);
        if (validatedPrice !== null) {
          filtered = filtered.filter((p) => {

            let actualPrice = p.pricePerHour || 0;
            if (p.price === 'Zdarma') {
                actualPrice = 0;
            }
            
            const pricePerHour = p.pricePerHour || 0; // Ponechané pre prípad, že actualPrice nie je potrebné
            
            return actualPrice <= validatedPrice; // Použijeme actualPrice
          });
        }
      }

      return filtered;
  }, []);

  // Apply client-side filtering instantly for short queries
  useEffect(() => {
    const query = searchQuery.trim();
    // For short queries (< 3 chars), use instant client-side filtering
    if (allParkings.length > 0 && query.length < 3) {
      const filtered = filterParkings(
        allParkings,
        searchQuery,
        selectedArea,
        maxPrice,
        showOnlyFree
      );
      setParkings(filtered);
    }
  }, [allParkings, searchQuery, selectedArea, maxPrice, showOnlyFree, filterParkings]);

  // Apply filters instantly when filters change (area, price, showOnlyFree)
  // Also reapply when search completes (isSearching changes from true to false)
  useEffect(() => {
    // Skip if no data loaded yet
    if (allParkings.length === 0) return;
    
    // Skip if actively searching (filters will be applied after search completes)
    if (isSearching) return;
    
    // Always use allParkings as source when filters change
    // This ensures correct behavior when filters are removed (e.g., area becomes undefined)
    const filtered = filterParkings(
      allParkings,
      searchQuery, // Apply current search query
      selectedArea, // Can be undefined when area filter is removed - this works correctly
      maxPrice,
      showOnlyFree
    );
    
    setParkings(filtered);
  }, [selectedArea, maxPrice, showOnlyFree, allParkings, searchQuery, filterParkings, isSearching]);

  // API search - only for text search (3+ chars), debounced
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 3) {
      // Empty or short query - use client-side filtering
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const sanitizedQuery = validateSearchQuery(query);
      const validatedPrice = maxPrice !== undefined && maxPrice !== null ? validatePrice(maxPrice) ?? undefined : undefined;
      
      let results: Parking[] = [];
      
      // Use API search for text queries (may have better matching)
      if (sanitizedQuery) {
        results = await searchParkings(sanitizedQuery, validatedPrice);
      } else {
        // Fallback to client-side filtering if query is invalid
        results = filterParkings(
          allParkings,
          query,
          selectedArea,
          maxPrice ?? undefined,
          showOnlyFree
        );
        setParkings(results);
        setIsSearching(false);
        return;
      }

      // Apply additional filters to search results (instant, no lag)
      let filtered = results;
      
      if (selectedArea && validateAreaName(selectedArea)) {
        filtered = filtered.filter((p) => p.area === selectedArea);
      }
      
      if (showOnlyFree) {
        filtered = filtered.filter((p) => {
          const freeSpotsNum = typeof p.freeSpots === 'number' ? p.freeSpots : Number(p.freeSpots);
          return !isNaN(freeSpotsNum) && isFinite(freeSpotsNum) && freeSpotsNum > 0;
        });
      }

      setParkings(filtered);
    } catch (error) {
      console.error('Error searching parkings:', error);
      // Fallback to client-side filtering on error
      const filtered = filterParkings(
        allParkings,
        query,
        selectedArea,
        maxPrice,
        showOnlyFree
      );
      setParkings(filtered);
    } finally {
      setIsSearching(false);
      // Filters will be reapplied by the filter effect when isSearching becomes false
    }
  }, [maxPrice, selectedArea, showOnlyFree, allParkings, filterParkings]);

  // Initial load - fetch all parkings once
  useEffect(() => {
    let mounted = true;
    
    loadAllParkings().then((data) => {
      if (mounted) {
        setIsInitialLoading(false);
        // Apply initial filters if any (instant client-side filtering)
        if (data.length > 0) {
          const filtered = filterParkings(
            data,
            '',
            selectedArea,
            maxPrice,
            showOnlyFree
          );
          setParkings(filtered);
        }
      }
    });
    
    return () => {
      mounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search effect - only for text search (3+ chars)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const query = searchQuery.trim();
    
    // If query is short or empty, use instant client-side filtering (no debounce needed)
    if (query.length === 0 || query.length < 3) {
      setIsSearching(false);
      // Client-side filtering will be applied instantly by the other useEffect
      return;
    }

    // For longer queries (3+ chars), use debounced API search for better results
    setIsSearching(true); // Show loading immediately
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 250); // Debounce only for API searches (250ms for better UX)
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await loadAllParkings();
      // Reapply current filters
      if (data.length > 0) {
        if (searchQuery.trim().length >= 3) {
          await performSearch(searchQuery);
        } else {
          const filtered = filterParkings(
            data,
            searchQuery,
            selectedArea,
            maxPrice,
            showOnlyFree
          );
          setParkings(filtered);
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [loadAllParkings, performSearch, searchQuery, selectedArea, maxPrice, showOnlyFree, filterParkings]);

  // Update area filter from params (allow new params, but prevent restoring manually removed ones)
  useFocusEffect(
    useCallback(() => {
      // Allow area update if:
      // 1. No area was manually removed, OR
      // 2. The new params.area is different from the last removed area (new filter)
      const areaParam = params.area as string | undefined;
      if (areaParam && areaParam !== selectedArea) {
        const isRestoringRemoved = lastRemovedAreaRef.current === areaParam;
        if (!isRestoringRemoved) {
          setSelectedArea(areaParam);
          lastRemovedAreaRef.current = null; // Clear since we're applying new filter
        }
      }
      
      // Allow price update if:
      // 1. No price was manually removed, OR
      // 2. The new params.maxPrice is different from the last removed price (new filter)
      if (params.maxPrice) {
        const price = parseFloat(params.maxPrice as string);
        if (!isNaN(price) && price !== maxPrice) {
          const isRestoringRemoved = lastRemovedPriceRef.current !== null && 
            Math.abs(lastRemovedPriceRef.current - price) < 0.01; // Compare with small tolerance
          if (!isRestoringRemoved) {
            setMaxPrice(price);
            lastRemovedPriceRef.current = null; // Clear since we're applying new filter
          }
        }
      }
    }, [params.area, params.maxPrice, selectedArea, maxPrice])
  );

  useEffect(() => {
    // Smooth appearance animations
    searchBarOpacity.value = withDelay(0, withTiming(1, { 
      duration: 400, 
      easing: Easing.out(Easing.cubic) 
    }));
    searchBarTranslateY.value = withDelay(0, withTiming(0, { 
      duration: 400, 
      easing: Easing.out(Easing.cubic) 
    }));
    resultsOpacity.value = withDelay(100, withTiming(1, { 
      duration: 400, 
      easing: Easing.out(Easing.cubic) 
    }));
  }, [searchBarOpacity, searchBarTranslateY, resultsOpacity]);

  const searchBarAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: searchBarOpacity.value,
      transform: [{ translateY: searchBarTranslateY.value }],
    };
  }, []);

  const resultsAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: resultsOpacity.value,
    };
  }, []);

  const handleRemoveAreaFilter = useCallback(() => {
    // Store the removed area to prevent it from being restored by params
    lastRemovedAreaRef.current = selectedArea || null;
    setSelectedArea(undefined);
    // Explicitly apply filters after removing area filter
    // This ensures instant update even if useEffect doesn't trigger
    if (allParkings.length > 0) {
      const filtered = filterParkings(
        allParkings,
        searchQuery,
        undefined, // Area filter removed
        maxPrice,
        showOnlyFree
      );
      setParkings(filtered);
    }
  }, [allParkings, searchQuery, maxPrice, showOnlyFree, filterParkings, selectedArea]);

  const handleRemovePriceFilter = useCallback(() => {
    // Store the removed price to prevent it from being restored by params
    lastRemovedPriceRef.current = maxPrice !== undefined ? maxPrice : null;
    setMaxPrice(undefined);
    // Explicitly apply filters after removing price filter
    if (allParkings.length > 0) {
      const filtered = filterParkings(
        allParkings,
        searchQuery,
        selectedArea,
        undefined, // Price filter removed
        showOnlyFree
      );
      setParkings(filtered);
    }
  }, [allParkings, searchQuery, selectedArea, showOnlyFree, filterParkings, maxPrice]);

  const handleRemoveOnlyFreeFilter = useCallback(() => {
    setShowOnlyFree(false);
    // Explicitly apply filters after removing only free filter
    if (allParkings.length > 0) {
      const filtered = filterParkings(
        allParkings,
        searchQuery,
        selectedArea,
        maxPrice,
        false // Only free filter removed
      );
      setParkings(filtered);
    }
  }, [allParkings, searchQuery, selectedArea, maxPrice, filterParkings]);

  const handleClearFilters = useCallback(() => {
    // Store the removed filters to prevent them from being restored by params
    lastRemovedAreaRef.current = selectedArea || null;
    lastRemovedPriceRef.current = maxPrice !== undefined ? maxPrice : null;
    setSelectedArea(undefined);
    setMaxPrice(undefined);
    setShowOnlyFree(false);
    // Explicitly apply filters after clearing all filters
    // This ensures instant update
    if (allParkings.length > 0) {
      const filtered = filterParkings(
        allParkings,
        searchQuery,
        undefined, // All filters cleared
        undefined,
        false
      );
      setParkings(filtered);
    }
  }, [allParkings, searchQuery, filterParkings, selectedArea, maxPrice]);

  const handleParkingPress = useCallback((parking: Parking) => {
    router.push({
      pathname: '/parking/[id]',
      params: { id: parking.id },
    });
  }, []);

  const handleApplyFilter = useCallback(() => {
    setIsFilterOpen(false);
    // Filters will be applied instantly via useEffect
  }, []);

  const handlePriceFilterChange = useCallback((price: number) => {
    setMaxPrice(price);
    setIsFilterOpen(false);
  }, []);

  const renderItem = useCallback(({ item, index }: { item: Parking; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 30).duration(400).springify().damping(15)}
      exiting={FadeOutUp.duration(300).easing(Easing.out(Easing.ease))}
      layout={Layout.springify().damping(15).stiffness(100)}>
      <ParkingCard
        key={item.id}
        parking={item}
        onPress={() => handleParkingPress(item)}
      />
    </Animated.View>
  ), [handleParkingPress]);

  const keyExtractor = useCallback((item: Parking) => item.id, []);

  // Favorites section - memoized for performance
  const favoritesMatchingFilters = useMemo(() => {
    return getFavoriteParkings(parkings);
  }, [parkings, favorites, getFavoriteParkings]);

  const nonFavoriteResults = useMemo(() => {
    if (favoritesMatchingFilters.length === 0) return parkings;
    const favoriteIds = new Set(favoritesMatchingFilters.map((p) => p.id));
    return parkings.filter((p) => !favoriteIds.has(p.id));
  }, [parkings, favoritesMatchingFilters]);

  const ListFooterComponent = useMemo(() => (
    <View style={{ height: 20 }} />
  ), []);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Žiadne výsledky</Text>
    </View>
  ), []);

  const ListHeaderComponent = useMemo(() => {
    if (favoritesMatchingFilters.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Obľúbené</Text>
        <View style={styles.sectionList}>
          {favoritesMatchingFilters.map((item, index) => (
            <Animated.View
              key={item.id}
              entering={FadeInDown.delay(index * 50).duration(400).springify().damping(15)}
              exiting={FadeOutUp.duration(300).easing(Easing.out(Easing.ease))}
              layout={Layout.springify().damping(15).stiffness(100)}>
              <ParkingCard
                parking={item}
                onPress={() => handleParkingPress(item)}
              />
            </Animated.View>
          ))}
        </View>
      </View>
    );
  }, [favoritesMatchingFilters, handleParkingPress]);

  const isLoading = isInitialLoading || isSearching;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header 
        title="ParkMe" 
        subtitle="Inteligentné parkovanie" 
      />

      <Animated.View style={[styles.searchContainer, searchBarAnimatedStyle]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Hľadať parkovisko..."
            placeholderTextColor={Colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Pressable onPress={() => {
            const { canOpenModal } = useModalStore.getState();
            // Check if we can open filter sheet
            if (canOpenModal('filterSheet')) {
              setIsFilterOpen(true);
            }
          }}>
            <Ionicons name="options-outline" size={20} color={Colors.text.secondary} />
          </Pressable>
        </View>

        {(selectedArea || maxPrice !== undefined || showOnlyFree) && (
          <View style={styles.filtersRow}>
            {selectedArea && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>{selectedArea}</Text>
                <Pressable onPress={handleRemoveAreaFilter} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={18} color={Colors.text.secondary} />
                </Pressable>
              </View>
            )}
            {maxPrice !== undefined && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>Do {maxPrice.toFixed(2)}€/hod</Text>
                <Pressable onPress={handleRemovePriceFilter} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={18} color={Colors.text.secondary} />
                </Pressable>
              </View>
            )}
            {showOnlyFree && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>Len voľné</Text>
                <Pressable onPress={handleRemoveOnlyFreeFilter} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={18} color={Colors.text.secondary} />
                </Pressable>
              </View>
            )}
            {(selectedArea || maxPrice !== undefined || showOnlyFree) && (
              <Pressable onPress={handleClearFilters} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.clearAllText}>Vymazať všetko</Text>
              </Pressable>
            )}
          </View>
        )}

        <Text style={styles.resultsCount}>
          Nájdených: {parkings.length} parkovísk
        </Text>
      </Animated.View>

      {isLoading && parkings.length === 0 ? (
        <View style={styles.listContainer}>
          <View style={styles.list}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        </View>
      ) : (
        <Animated.View style={[styles.listContainer, resultsAnimatedStyle]}>
          <FlatList
            data={nonFavoriteResults}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={8}
            windowSize={10}
            ListHeaderComponent={ListHeaderComponent}
            ListFooterComponent={ListFooterComponent}
            ListEmptyComponent={ListEmptyComponent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.gradient.start}
                colors={[Colors.gradient.start]}
              />
            }
          />
        </Animated.View>
      )}

      <PriceFilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        maxPrice={maxPrice}
        onPriceChange={(price) => {
          setMaxPrice(price !== undefined && price < 10 ? price : undefined);
        }}
        showOnlyFree={showOnlyFree}
        onShowOnlyFreeChange={setShowOnlyFree}
        onApply={handleApplyFilter}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  listContainer: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gradient.start,
  },
  resultsCount: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 12,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  sectionList: {
    gap: 12,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
});

