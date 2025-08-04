import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';
import { useRouter } from 'expo-router';

export default function PatientSelectScreen() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

useEffect(() => {
  const fetchPatients = async () => {
    try {
      const role = await AsyncStorage.getItem('role');
      const userId = await AsyncStorage.getItem('userId');

      const res = await fetch(`${API_BASE_URL}/get_patients?user_id=${userId}&role=${role}`);
      const data = await res.json();

      console.log("Fetched patients:", data); // 🔍 ne geldiğini test etmek için

      // Burası çok önemli: `data` bir array değilse boş array yap
      if (Array.isArray(data)) {
        setPatients(data);
      } else {
        console.warn("Unexpected patient data format:", data);
        setPatients([]); // Hatalı veri geldiğinde boş array
      }

    } catch (err) {
      console.error('Failed to fetch patients:', err);
      setPatients([]);
    }
    setLoading(false);
  };

  fetchPatients();
}, []);


  const handleSelectPatient = async (patient: any) => {
    await AsyncStorage.setItem('selectedPatientId', patient.id.toString());
    router.replace('../(tabs)/logs'); // ✅ logs ekranına yönlendir
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select a Patient</Text>
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <ScrollView style={styles.scrollView}>
          {patients.map((patient, index) => (
            <TouchableOpacity
              key={index}
              style={styles.patientButton}
              onPress={() => handleSelectPatient(patient)}
            >
              <Text style={styles.buttonText}>{patient.email}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2a3b4c',
  },
  scrollView: {
    width: '100%',
  },
  patientButton: {
    backgroundColor: '#2980b9',
    padding: 14,
    marginVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
