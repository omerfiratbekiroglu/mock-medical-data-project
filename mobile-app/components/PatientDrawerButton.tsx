// components/PatientDrawerButton.tsx
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PatientDrawerButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 500,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 8,
        elevation: 4,
      }}
    >
      <Ionicons name="person" size={24} color="#2a3b4c" />
    </TouchableOpacity>
  );
}
