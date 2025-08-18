import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await AsyncStorage.getItem('role');
        console.log('ROLE:', r);
        if (mounted) setRole(r);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // İstersen kısa bir loading gösterebilirsin
  if (loading) {
    return (
      <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const isCaregiver = role === 'caregiver';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E5E7EB',
            borderTopWidth: 1,
            paddingTop: 8,
            paddingBottom: 8,
            height: 65,
          },
        }),
      }}
    >
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="heartrate"
        options={{
          title: 'Heart Rate',
          tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="oxygen"
        options={{
          title: 'Oxygen',
          tabBarIcon: ({ color, size }) => <Ionicons name="water-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="temprature"
        options={{
          title: 'Temperature',
          tabBarIcon: ({ color, size }) => <Ionicons name="thermometer-outline" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="patient_update"
        options={{
          title: 'Update',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
          href: isCaregiver ? '/patient_update' : null,
          tabBarStyle: isCaregiver ? undefined : { display: 'none' },
        }}
      />
    </Tabs>
  );
}
