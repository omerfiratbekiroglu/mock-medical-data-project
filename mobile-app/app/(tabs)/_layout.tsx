import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
       <Tabs.Screen
        name="(tabs)/logs"
        options={{
          title: 'Logs',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="(tabs)/heartrate"
        options={{
          title: 'Heart Rate',
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="(tabs)/oxygen"
        options={{
          title: 'Oxygen',
          tabBarIcon: ({ color, size }) => <Ionicons name="water" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="(tabs)/temperature"
        options={{
          title: 'Temperature',
          tabBarIcon: ({ color, size }) => <Ionicons name="thermometer" color={color} size={size} />,
        }}
        
       
      />

       <Tabs.Screen
        name="(tabs)/patient_update"
        options={{
          title: 'Temperature',
          tabBarIcon: ({ color, size }) => <Ionicons name="thermometer" color={color} size={size} />,
        }}
        
       
      />
    </Tabs>
 
  );
}
