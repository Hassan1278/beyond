import { Stack } from 'expo-router';
export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0b0c0e' } }} />
  );
}
