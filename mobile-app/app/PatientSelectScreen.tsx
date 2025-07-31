import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

export default function PatientSelectScreen({ navigation }: any) {
  const [patients, setPatients] = useState<{ id: number; email: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/get_patients`);
        const data = await res.json();
        setPatients(data);
      } catch (err) {
        console.error('Failed to fetch patients:', err);
        setPatients([]);
      }
      setLoading(false);
    };
    fetchPatients();
  }, []);

  const handleSelectPatient = async (patientId: number) => {
    await AsyncStorage.setItem('selectedPatientId', patientId.toString());
    navigation.navigate('LogsScreen'); // logs ekranına yönlendirme
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
              onPress={() => handleSelectPatient(patient.id)}
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
