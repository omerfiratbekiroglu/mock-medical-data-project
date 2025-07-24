import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

const RegisterPage = () => {
  const [role, setRole] = useState<'doctor' | 'patient'>('patient');

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Register</Text>

      <TextInput style={styles.input} placeholder="Username" />
      <TextInput style={styles.input} placeholder="Email" />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry />
      <TextInput style={styles.input} placeholder="Confirm Password" secureTextEntry />

      <Text style={styles.label}>Select Role:</Text>
      <View style={styles.roleContainer}>
        <TouchableOpacity
          style={[
            styles.roleButton,
            role === 'patient' && styles.roleButtonSelected,
          ]}
          onPress={() => setRole('patient')}
        >
          <Text
            style={[
              styles.roleButtonText,
              role === 'patient' && styles.roleButtonTextSelected,
            ]}
          >
            Patient
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.roleButton,
            role === 'doctor' && styles.roleButtonSelected,
          ]}
          onPress={() => setRole('doctor')}
        >
          <Text
            style={[
              styles.roleButtonText,
              role === 'doctor' && styles.roleButtonTextSelected,
            ]}
          >
            Doctor
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
    </View>
  );
};

export default RegisterPage;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 15, borderRadius: 8 },
  label: { marginTop: 10, marginBottom: 5, fontWeight: 'bold' },

  roleContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
  },
  roleButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  roleButtonText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#555',
  },
  roleButtonTextSelected: {
    color: 'white',
  },

  button: { backgroundColor: '#28a745', padding: 15, borderRadius: 8 },
  buttonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
});
