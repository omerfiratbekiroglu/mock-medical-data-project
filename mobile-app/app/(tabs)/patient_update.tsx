import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../../config';

export default function PatientUpdateScreen() {
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [careLevel, setCareLevel] = useState(3);
  const [saving, setSaving] = useState(false);

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
    <View style={styles.container}>
      <Text style={styles.header}>Caregiver Notes</Text>
      <Text style={styles.subtext}>Add observation notes for the selected patient.</Text>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2a3b4c',
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
});
