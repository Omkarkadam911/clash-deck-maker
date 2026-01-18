import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '../store';

export default function RootLayout() {
  const loadCards = useStore((state) => state.loadCards);
  const loadArenas = useStore((state) => state.loadArenas);

  useEffect(() => {
    // Load data on app start
    loadCards();
    loadArenas();
  }, [loadCards, loadArenas]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1a2e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#16213e',
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
