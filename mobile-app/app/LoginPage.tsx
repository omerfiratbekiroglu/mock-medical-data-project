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
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 24,
    backgroundColor: '#F8FAFC'
  },
  header: { 
    fontSize: 32, 
    fontWeight: '700', 
    marginBottom: 48, 
    textAlign: 'center',
    color: '#1F2937',
    letterSpacing: -0.5
  },
  input: { 
    borderWidth: 1.5, 
    borderColor: '#E5E7EB', 
    padding: 16, 
    marginBottom: 20, 
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  button: { 
    backgroundColor: '#10B981', 
    padding: 18, 
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  buttonText: { 
    color: 'white', 
    textAlign: 'center', 
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5
  },
  link: { 
    marginTop: 20, 
    textAlign: 'center', 
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500'
  },
});
