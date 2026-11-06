import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';
import 'react-native-reanimated';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import * as NavigationBar from 'expo-navigation-bar';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/lib/toast';
import { Colors } from '@/constants/colors';

LogBox.ignoreLogs([
  'Unable to activate keep awake',
  'keep awake',
  'setBackgroundColorAsync is not supported',
  'Reading from `value` during component render',
]);

export default function RootLayout() {
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      // Filter out known non-critical errors
      if (
        message.includes('keep awake') ||
        message.includes('Unable to activate keep awake') ||
        message.includes('WebSocket error') ||
        (message.includes('readyState') && message.includes('CLOSED'))
      ) {
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  // Style Android navigation bar system UI
  // Note: setBackgroundColorAsync is not supported with edge-to-edge enabled in newer Android
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        try {
          // Set button style to dark for contrast on light background
          await NavigationBar.setButtonStyleAsync('dark');
          // Ensure navigation bar is visible on app start
          await NavigationBar.setVisibilityAsync('visible');
        } catch (error) {
          // Silently ignore errors (e.g., if APIs are not available)
        }
      }
    })();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.white }}>
        <BottomSheetModalProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'none',
              contentStyle: { backgroundColor: Colors.white },
            }}
            initialRouteName="(tabs)">
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="parking/[id]"
              options={{
                animation: 'none',
              }}
            />
            <Stack.Screen
              name="map-fullscreen"
              options={{
                animation: 'none',
              }}
            />
          </Stack>
          <StatusBar style="dark" />
          <Toast 
            position="top" 
            topOffset={50} 
            config={toastConfig}
            visibilityTime={2500}
            autoHide={true}
          />
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
