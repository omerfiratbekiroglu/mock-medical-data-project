import { Slot, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFonts } from 'expo-font';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  // ✅ Yönlendirmeyi layout yüklendikten sonra yap
  useEffect(() => {
    if (loaded) {
      if (!isLoggedIn) {
        router.replace('/LoginPage');
      } else {
        router.replace('/(tabs)/logs');


      }
    }
  }, [loaded, isLoggedIn]);

  // 🛑 Layout yüklenmeden null döndür
  if (!loaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Slot /> {/* <== mutlaka burada olmalı */}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
