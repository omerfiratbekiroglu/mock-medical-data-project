// components/PatientDrawerPanel.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions,} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';


const width = Dimensions.get('window').width;
const router = useRouter();

const patients = [
  { id: 1, name: 'Patient 1', age: 30, gender: 'Male' },
  { id: 2, name: 'Patient 2', age: 25, gender: 'Female' },
  { id: 3, name: 'Patient 3', age: 40, gender: 'Male' },
];

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear(); // Tüm verileri temizle
      router.replace('/LoginPage'); // Login ekranına yönlendir
    } catch (error) {
      console.error('Logout error:', error);
    }
  };


export default function PatientDrawerPanel({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  if (!visible) return null;

  return (
    <View style={styles.drawer}>
      <Text style={styles.title}>Patient Info</Text>
      {patients.map((p) => (
        <TouchableOpacity key={p.id} style={styles.patientBox}>
          <Text style={styles.name}>{p.name}</Text>
          <Text>Age: {p.age}</Text>
          <Text>Gender: {p.gender}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
        <Text style={{ color: '#fff' }}>Close</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
      
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: '150%',
    width: width * 0.6,
    backgroundColor: '#ecf0f1',
    padding: 20,
    zIndex: 99,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  patientBox: {
    padding: 10,
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 8,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeBtn: {
    backgroundColor: '#3498db',
    padding: 10,
    marginTop: 20,
    alignItems: 'center',
    borderRadius: 5,
  },
   logoutButton: {
    top: 10,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
