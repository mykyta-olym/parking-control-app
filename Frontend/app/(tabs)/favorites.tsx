import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
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
import { useFavoritesStore } from '@/store/favoritesStore';
import { getParkingsByArea } from '@/lib/api';
import { Parking } from '@/lib/types';
import ParkingCard from '@/components/ParkingCard';
import Header from '@/components/Header';
import SkeletonCard from '@/components/SkeletonCard';
import { Colors } from '@/constants/colors';

const AnimatedParkingCard = Animated.createAnimatedComponent(ParkingCard);

export default function FavoritesScreen() {
  const { favorites, getFavoriteParkings } = useFavoritesStore();
  const [favoriteParkings, setFavoriteParkings] = useState<Parking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prevFavoritesLength, setPrevFavoritesLength] = useState(0);
  const emptyOpacity = useSharedValue(0);
  const emptyScale = useSharedValue(0.8);
  const listOpacity = useSharedValue(0);

  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      const allParkings = await getParkingsByArea();
      const favoritesList = getFavoriteParkings(allParkings);
      
      setFavoriteParkings(favoritesList);
      setPrevFavoritesLength(favoritesList.length);
    } catch (error) {
      console.error('Error loading favorites:', error);
      setFavoriteParkings([]);
      setPrevFavoritesLength(0);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing]);

  // Load favorites when component mounts and when favorites change
  useEffect(() => {
    loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites]);

  useEffect(() => {
    // Instant appearance - no delays
    if (favoriteParkings.length === 0) {
      emptyOpacity.value = withTiming(1, { 
        duration: 300, 
        easing: Easing.out(Easing.cubic) 
      });
      emptyScale.value = withTiming(1, { 
        duration: 300, 
        easing: Easing.out(Easing.back(1.2)) 
      });
      listOpacity.value = withTiming(0, { duration: 200 });
    } else {
      emptyOpacity.value = withTiming(0, { duration: 200 });
      emptyScale.value = withTiming(0.8, { duration: 200 });
      listOpacity.value = withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      });
    }
  }, [favoriteParkings.length, emptyOpacity, emptyScale, listOpacity]);

  const emptyAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: emptyOpacity.value,
      transform: [{ scale: emptyScale.value }],
    };
  }, []);

  const listAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: listOpacity.value,
    };
  }, []);

  const handleParkingPress = useCallback((parking: Parking) => {
    router.push({
      pathname: '/parking/[id]',
      params: { id: parking.id },
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFavorites();
    } finally {
      setRefreshing(false);
    }
  }, [loadFavorites]);

  const renderItem = useCallback(({ item, index }: { item: Parking; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(400).springify().damping(15)}
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

  const ListFooterComponent = useMemo(() => (
    <View style={{ height: 20 }} />
  ), []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header 
          title="Obľúbené" 
          subtitle="Vaše obľúbené parkoviská" 
        />
        <View style={styles.list}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (favoriteParkings.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header 
          title="Obľúbené" 
          subtitle="Vaše obľúbené parkoviská" 
        />

        <Animated.View style={[styles.emptyContainer, emptyAnimatedStyle]}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="heart-outline" size={64} color={Colors.text.secondary} />
          </View>
          <Text style={styles.emptyText}>Žiadne obľúbené parkoviská</Text>
          <Text style={styles.emptySubtext}>Pridajte si parkoviská do obľúbených</Text>
          <Text style={styles.emptySubtext}>kliknutím na ikonu srdca</Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header 
        title="Obľúbené" 
        subtitle="Vaše obľúbené parkoviská" 
      />

      <Animated.View style={[styles.listContainer, listAnimatedStyle]}>
        <FlatList
          data={favoriteParkings}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={8}
          windowSize={10}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.gradient.start}
              colors={[Colors.gradient.start]}
            />
          }
          ListFooterComponent={ListFooterComponent}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});

