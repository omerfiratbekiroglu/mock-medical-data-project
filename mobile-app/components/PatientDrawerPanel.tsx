// components/PatientDrawerPanel.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import API_BASE_URL from '../config';

const width = Dimensions.get('window').width;

export default function PatientDrawerPanel({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [patients, setPatients] = useState<{ id: number; first_name: string; last_name: string  }[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        const role = await AsyncStorage.getItem('role');
        
        setUserRole(role);
        
        // Hasta rolündeki kullanıcılara hasta listesi gösterme
        if (role === 'patient') {
          setPatients([]);
          return;
        }

        const url = `${API_BASE_URL}/get_patients?user_id=${userId}&role=${role}`;
        const response = await fetch(url);
        const data = await response.json();

        setPatients(data);
      } catch (error) {
        console.error('Error fetching patients:', error);
      }
    };

    if (visible) {
      fetchPatients();
    }
  }, [visible]);

  const handlePatientSelect = async (patient: { id: number; first_name: string; last_name: string }) => {
    try {
      const role = await AsyncStorage.getItem('role');
      
      if (role === 'doctor') {
        // Doctor için hasta notları sayfasına git
        router.push({
          pathname: '/PatientNotesViewScreen',
          params: {
            patientId: patient.id.toString(),
            patientName: `${patient.first_name} ${patient.last_name}`
          }
        });
      } else {
        // Caregiver/Patient için mevcut davranış
        await AsyncStorage.setItem('selectedPatientId', patient.id.toString());
        router.push('/(tabs)/logs');
      }
      onClose();
    } catch (error) {
      console.error('Patient select error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      router.replace('/LoginPage');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.drawer}>
      {userRole === 'patient' ? (
        // Hasta kullanıcılar için sadece logout menüsü
        <>
          <Text style={styles.title}>Menu</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ color: '#fff' }}>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </>
      ) : (
        // Doktor ve caregiver için hasta listesi
        <>
          <Text style={styles.title}>Patient Info</Text>
          {patients.length > 0 ? (
            patients.map((p) => (
              <TouchableOpacity 
                key={p.id} 
                style={styles.patientBox}
                onPress={() => handlePatientSelect(p)}
              >
                <Text style={styles.name}>{p.first_name} {p.last_name}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{ fontStyle: 'italic', color: '#555' }}>No patient data.</Text>
          )}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ color: '#fff' }}>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </>
      )}
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
    marginTop: 300,
    alignItems: 'center',
    borderRadius: 5,
  },
  logoutButton: {
    marginTop: 20,
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
