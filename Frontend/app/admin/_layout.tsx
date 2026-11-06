import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="zones/index" />
      <Stack.Screen name="zones/[id]" />
      <Stack.Screen name="zones/[id]/analytics" />
      <Stack.Screen name="analytics" />
    </Stack>
  );
}
