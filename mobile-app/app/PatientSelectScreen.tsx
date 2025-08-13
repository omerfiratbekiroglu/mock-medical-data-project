import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
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
        <ActivityIndicator size="large" color="#10B981" style={styles.loading} />
      ) : (
        <ScrollView style={styles.scrollView}>
          {patients.map((patient, index) => (
            <TouchableOpacity
              key={index}
              style={styles.patientButton}
              onPress={() => handleSelectPatient(patient)}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>{patient.first_name} {patient.last_name}</Text>
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
    padding: 24,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    marginTop: 40,
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  scrollView: {
    width: '100%',
    maxWidth: 400,
  },
  patientButton: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#374151',
    fontSize: 18,
    fontWeight: '600',
  },
  loading: {
    marginTop: 60,
  },
});
