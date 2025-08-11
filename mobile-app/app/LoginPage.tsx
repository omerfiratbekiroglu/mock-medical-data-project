import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const testStoredData = async () => {
      const role = await AsyncStorage.getItem('role');
      const userId = await AsyncStorage.getItem('userId');
      console.log('ROLE:', role);
      console.log('USER ID:', userId);
    };
    testStoredData();
  }, []);

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();
      console.log("Login response:", result);

      if (result.success) {
        await AsyncStorage.setItem('role', result.role);
        await AsyncStorage.setItem('userId', result.user_id.toString());
        
        // Opsiyonel olarak ad soyad kaydedebilirsin
        if (result.first_name) await AsyncStorage.setItem('firstName', result.first_name);
        if (result.last_name) await AsyncStorage.setItem('lastName', result.last_name);

        if( result.role === 'patient') {
              await AsyncStorage.setItem('selectedPatientId', result.user_id.toString());
              router.replace('../(tabs)/logs');
        }
        else if (result.role === 'doctor' || result.role === 'caregiver') {
          router.replace('../PatientSelectScreen');
        } else {
          router.replace('../(tabs)/logs');
        }
      } else {
        Alert.alert('Login Failed', result.message);
      }
    } catch (err) {
      console.log('Login error:', err);
      Alert.alert('Error', 'Something went wrong!');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/RegisterPage')}>
        <Text style={styles.link}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 15, borderRadius: 8 },
  button: { backgroundColor: '#007bff', padding: 15, borderRadius: 8 },
  buttonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  link: { marginTop: 15, textAlign: 'center', color: '#555' },
});
