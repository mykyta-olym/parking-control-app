import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ComponentProps } from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Colors } from '@/constants/colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: {
  icon: IoniconName;
  iconFocused: IoniconName;
  label: string;
  route: string;
}[] = [
  { icon: 'home-outline', iconFocused: 'home', label: 'Domov', route: 'index' },
  { icon: 'search-outline', iconFocused: 'search', label: 'Hľadať', route: 'search' },
  { icon: 'map-outline', iconFocused: 'map', label: 'Mapa', route: 'map' },
  { icon: 'heart-outline', iconFocused: 'heart', label: 'Obľúbené', route: 'favorites' },
  { icon: 'settings-outline', iconFocused: 'settings', label: 'Admin', route: 'admin' },
];

interface TabButtonProps {
  item: typeof TAB_CONFIG[0];
  onPress: () => void;
  focused: boolean;
  index: number;
  activeIndex: number;
}

function TabButton({ item, onPress, focused, index, activeIndex }: TabButtonProps) {
  const scale = useSharedValue(focused ? 1.15 : 1);
  const opacity = useSharedValue(focused ? 1 : 0.55);
  const indicatorScale = useSharedValue(focused ? 1 : 0);
  const indicatorOpacity = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, { damping: 18, stiffness: 250 });
    opacity.value = withTiming(focused ? 1 : 0.55, { duration: 200 });
    indicatorScale.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 180 });
    indicatorOpacity.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused, scale, opacity, indicatorScale, indicatorOpacity]);

  const iconStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  }, []);

  const indicatorStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: indicatorScale.value }],
      opacity: indicatorOpacity.value,
    };
  }, []);

  const labelStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: opacity.value,
      transform: [{ scale: focused ? 1.05 : 1 }],
    };
  }, []);

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.tabButton]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      pressRetentionOffset={{ top: 12, bottom: 12, left: 12, right: 12 }}
      android_ripple={{ color: Colors.gradient.subtle, borderless: true }}>
      <View style={styles.tabContent}>
        <Animated.View style={iconStyle}>
          <Ionicons
            name={focused ? item.iconFocused : item.icon}
            size={26}
            color={focused ? Colors.gradient.start : Colors.text.secondary}
          />
        </Animated.View>
        <Animated.View style={[styles.activeIndicator, indicatorStyle]}>
          <LinearGradient
            colors={[Colors.gradient.start, Colors.gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.indicatorGradient}
          />
        </Animated.View>
      </View>
      <Animated.Text
        style={[
          styles.tabLabel,
          { color: focused ? Colors.gradient.start : Colors.text.secondary },
          labelStyle,
        ]}>
        {item.label}
      </Animated.Text>
    </AnimatedPressable>
  );
}

export default function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const routes = state.routes;
  const insets = useSafeAreaInsets();
  
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={[styles.safeAreaContainer, { paddingBottom: insets.bottom }]}>
        <View style={styles.container}>
          <View style={styles.tabBar}>
            {routes.map((route, index) => {
              const isFocused = state.index === index;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              const tabConfig = TAB_CONFIG.find((t) => t.route === route.name) || TAB_CONFIG[0];

              return (
                <TabButton
                  key={route.key}
                  item={tabConfig}
                  onPress={onPress}
                  focused={isFocused}
                  index={index}
                  activeIndex={state.index}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
  },
  safeAreaContainer: {
    backgroundColor: Colors.white,
    width: '100%',
  },
  container: {
    backgroundColor: Colors.white,
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    height: 72,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 0,
    marginBottom: 0,
    alignSelf: 'stretch',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 0,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
    width: 44,
    height: 44,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -3,
    width: 36,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    shadowColor: Colors.gradient.start,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 3,
  },
  indicatorGradient: {
    width: '100%',
    height: '100%',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
