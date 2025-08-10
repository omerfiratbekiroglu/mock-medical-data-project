import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../../config';

export default function PatientUpdateScreen() {
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveComment = async () => {
    const userId = await AsyncStorage.getItem('userId');
    const patientId = await AsyncStorage.getItem('selectedPatientId');

    if (!comment.trim()) {
      Alert.alert('Empty Comment', 'Please enter a comment.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/save_comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          patient_id: patientId,
          comment: comment.trim(),
        }),
      });

      const result = await res.json();

      if (res.ok) {
        Alert.alert('Success', 'Comment saved successfully.');
        setComment('');
      } else {
        Alert.alert('Error', result.detail || 'Failed to save comment.');
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
      <Text style={styles.header}>Patient Notes</Text>
      <Text style={styles.subtext}>Add a note or comment for the selected patient.</Text>

      <TextInput
        style={styles.input}
        multiline
        placeholder="Write your comment here..."
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
        <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Comment'}</Text>
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
  input: {
    height: 150,
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
