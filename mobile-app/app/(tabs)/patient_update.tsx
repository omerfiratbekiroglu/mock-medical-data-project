import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../../config';

interface CriticalAlert {
  id: number;
  patient_id: number;
  alert_type: string;
  heart_rate: number;
  threshold_value: number;
  message: string;
  is_read: boolean;
  created_at: string;
  patient_name: string;
  patient_email: string;
}

export default function PatientUpdateScreen() {
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [careLevel, setCareLevel] = useState(3);
  const [saving, setSaving] = useState(false);
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>([]);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);

  const loadCriticalAlerts = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const role = await AsyncStorage.getItem('role');
      
      if (role !== 'caregiver' || !userId) return;

      const response = await fetch(
        `${API_BASE_URL}/critical_alerts?caregiver_id=${userId}&role=${role}`
      );
      const result = await response.json();
      
      if (result.success) {
        setCriticalAlerts(result.alerts);
        const unreadCount = result.alerts.filter((alert: CriticalAlert) => !alert.is_read).length;
        setUnreadAlertsCount(unreadCount);
      }
    } catch (error) {
      console.log('Error loading critical alerts:', error);
    }
  };

  const markAlertAsRead = async (alertId: number) => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const role = await AsyncStorage.getItem('role');
      
      const response = await fetch(
        `${API_BASE_URL}/critical_alerts/${alertId}/mark_read?caregiver_id=${userId}&role=${role}`,
        { method: 'PUT' }
      );
      
      if (response.ok) {
        loadCriticalAlerts(); // Reload alerts to update read status
      }
    } catch (error) {
      console.log('Error marking alert as read:', error);
    }
  };

  useEffect(() => {
    loadCriticalAlerts();
    // Poll for new alerts every 30 seconds
    const interval = setInterval(loadCriticalAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveComment = async () => {
    const userId = await AsyncStorage.getItem('userId');
    const patientId = await AsyncStorage.getItem('selectedPatientId');
    const role = await AsyncStorage.getItem('role');

    // Validation
    if (!title.trim()) {
      Alert.alert('Empty Title', 'Please enter a note title.');
      return;
    }
    if (!comment.trim()) {
      Alert.alert('Empty Content', 'Please enter note content.');
      return;
    }
    if (role !== 'caregiver') {
      Alert.alert('Access Denied', 'Only caregivers can add notes.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/caregiver_notes?caregiver_id=${userId}&role=${role}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: parseInt(patientId || '0'),
          title: title.trim(),
          content: comment.trim(),
          care_level: careLevel
        }),
      });

      const result = await res.json();

      if (res.ok) {
        Alert.alert('Success', 'Note saved successfully.');
        setTitle('');
        setComment('');
        setCareLevel(3);
      } else {
        Alert.alert('Error', result.detail || 'Failed to save note.');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.header}>Caregiver Notes</Text>
          <Text style={styles.subtext}>Add observation notes for the selected patient.</Text>
        </View>
        
        {/* Critical Alerts Button */}
        <TouchableOpacity 
          style={[styles.alertsButton, unreadAlertsCount > 0 && styles.alertsButtonActive]}
          onPress={() => setShowAlertsModal(true)}
        >
          <Text style={[styles.alertsButtonText, unreadAlertsCount > 0 && styles.alertsButtonTextActive]}>
            🚨 Alerts {unreadAlertsCount > 0 && `(${unreadAlertsCount})`}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Note Title</Text>
      <TextInput
        style={styles.titleInput}
        placeholder="Enter note title..."
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Care Level (1-5)</Text>
      <View style={styles.careLevelContainer}>
        {[1, 2, 3, 4, 5].map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.careLevelButton,
              careLevel === level && styles.careLevelSelected
            ]}
            onPress={() => setCareLevel(level)}
          >
            <Text style={[
              styles.careLevelText,
              careLevel === level && styles.careLevelTextSelected
            ]}>
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Note Content</Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder="Write your observation notes here..."
        value={comment}
        onChangeText={setComment}
        textAlignVertical="top"
        numberOfLines={6}
      />

      <TouchableOpacity
        style={[styles.button, saving && { backgroundColor: '#ccc' }]}
        onPress={handleSaveComment}
        disabled={saving}
      >
        <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Note'}</Text>
      </TouchableOpacity>

      {/* Critical Alerts Modal */}
      <Modal
        visible={showAlertsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAlertsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Critical Heart Rate Alerts</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowAlertsModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.alertsList}>
            {criticalAlerts.length === 0 ? (
              <Text style={styles.noAlertsText}>No critical alerts at this time.</Text>
            ) : (
              criticalAlerts.map((alert: CriticalAlert) => (
                <View 
                  key={alert.id} 
                  style={[styles.alertItem, !alert.is_read && styles.unreadAlert]}
                >
                  <View style={styles.alertHeader}>
                    <Text style={styles.patientName}>{alert.patient_name}</Text>
                    <Text style={styles.alertTime}>
                      {new Date(alert.created_at).toLocaleString('tr-TR')}
                    </Text>
                  </View>
                  
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  
                  <View style={styles.alertDetails}>
                    <Text style={styles.heartRateText}>
                      ♥ {alert.heart_rate} BPM (Eşik: {alert.threshold_value} BPM)
                    </Text>
                  </View>
                  
                  {!alert.is_read && (
                    <TouchableOpacity 
                      style={styles.markReadButton}
                      onPress={() => markAlertAsRead(alert.id)}
                    >
                      <Text style={styles.markReadButtonText}>Okundu olarak işaretle</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    padding: 20,
    paddingTop: 60,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2a3b4c',
  },
  alertsButton: {
    backgroundColor: '#e8e8e8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  alertsButtonActive: {
    backgroundColor: '#ff4757',
    borderColor: '#ff4757',
  },
  alertsButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  alertsButtonTextActive: {
    color: '#fff',
  },
  subtext: {
    fontSize: 14,
    color: '#555',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 15,
    color: '#2a3b4c',
  },
  titleInput: {
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  careLevelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  careLevelButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  careLevelSelected: {
    borderColor: '#2980b9',
    backgroundColor: '#2980b9',
  },
  careLevelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  careLevelTextSelected: {
    color: '#fff',
  },
  input: {
    height: 120,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2980b9',
    padding: 15,
    marginTop: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    padding: 20,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2a3b4c',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  alertsList: {
    flex: 1,
  },
  noAlertsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
    fontStyle: 'italic',
  },
  alertItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ccc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadAlert: {
    borderLeftColor: '#ff4757',
    backgroundColor: '#fff5f5',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2a3b4c',
  },
  alertTime: {
    fontSize: 12,
    color: '#666',
  },
  alertMessage: {
    fontSize: 14,
    color: '#444',
    marginBottom: 10,
    lineHeight: 20,
  },
  alertDetails: {
    marginBottom: 10,
  },
  heartRateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  markReadButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#2980b9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  markReadButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
