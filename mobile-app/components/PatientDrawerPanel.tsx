// components/PatientDrawerPanel.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import API_BASE_URL from '../config';

interface PatientWithAlert {
  id: number;
  first_name: string;
  last_name: string;
  hasHighPriorityNotes?: boolean;
  maxCareLevel?: number;
}

const width = Dimensions.get('window').width;

export default function PatientDrawerPanel({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [patients, setPatients] = useState<PatientWithAlert[]>([]);
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

        // Doktor ise hasta notlarını kontrol et ve kritik seviyeyi belirle
        if (role === 'doctor') {
          const patientsWithAlerts = await Promise.all(
            data.map(async (patient: PatientWithAlert) => {
              try {
                // Her hasta için en yüksek care level'ı al
                const notesResponse = await fetch(
                  `${API_BASE_URL}/caregiver_notes/by_patient/${patient.id}?user_id=${userId}&role=${role}`
                );
                const notes = await notesResponse.json();
                
                if (Array.isArray(notes) && notes.length > 0) {
                  const maxCareLevel = Math.max(...notes.map((note: any) => note.care_level || 0));
                  return {
                    ...patient,
                    hasHighPriorityNotes: maxCareLevel >= 4, // Care level 4-5 kritik
                    maxCareLevel
                  };
                }
              } catch (error) {
                console.error(`Error fetching notes for patient ${patient.id}:`, error);
              }
              
              return patient;
            })
          );

          // Kritik hastaları üste sırala
          const sortedPatients = patientsWithAlerts.sort((a, b) => {
            if (a.hasHighPriorityNotes && !b.hasHighPriorityNotes) return -1;
            if (!a.hasHighPriorityNotes && b.hasHighPriorityNotes) return 1;
            if (a.maxCareLevel && b.maxCareLevel) {
              return b.maxCareLevel - a.maxCareLevel;
            }
            return 0;
          });

          setPatients(sortedPatients);
        } else {
          setPatients(data);
        }
      } catch (error) {
        console.error('Error fetching patients:', error);
      }
    };

    if (visible) {
      fetchPatients();
    }
  }, [visible]);

  const handlePatientSelect = async (patient: PatientWithAlert) => {
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

  const handleGoBack = () => {
    router.push('/PatientSelectScreen');
    onClose();
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
            <Text style={styles.closeText}>Close</Text>
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
                style={[
                  styles.patientBox,
                  p.hasHighPriorityNotes ? styles.criticalPatientBox : null
                ]}
                onPress={() => handlePatientSelect(p)}
              >
                <View style={styles.patientRow}>
                  <Text style={styles.name}>{p.first_name} {p.last_name}</Text>
                  {p.hasHighPriorityNotes && (
                    <View style={styles.alertContainer}>
                      <Ionicons 
                        name="warning" 
                        size={18} 
                        color="#e74c3c" 
                        style={styles.warningIcon}
                      />
                      <Text style={styles.careLevel}>Level {p.maxCareLevel}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noDataText}>No patient data.</Text>
          )}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
          
          {(userRole === 'doctor' || userRole === 'caregiver') && (
            <TouchableOpacity style={styles.patientSelectButton} onPress={handleGoBack}>
              <Text style={styles.patientSelectText}>Patient Select Page</Text>
            </TouchableOpacity>
          )}

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
  criticalPatientBox: {
    backgroundColor: '#ffe6e6',
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  patientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  warningIcon: {
    marginRight: 4,
    color: '#fff',
  },
  careLevel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  patientSelectButton: {
    marginTop: 8,
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  patientSelectText: {
    color: '#fff',
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
    marginTop: 8,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
  },
  closeText: {
    color: '#fff',
  },
  noDataText: {
    fontStyle: 'italic',
    color: '#555',
  },
});
