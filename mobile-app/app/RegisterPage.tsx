import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import API_BASE_URL from '../config';
import MapView, { Marker, MapPressEvent, Region, PROVIDER_GOOGLE } from 'react-native-maps';


export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Modal + Harita için state’ler
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Harita başlangıç bölgesi (İstanbul — değiştirebilirsin)
  const initialRegion: Region = {
    latitude: 41.015137,
    longitude: 28.97953,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
  };

  const handleRegister = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        }),
      });

      if (res.status === 201) {
        Alert.alert('Success', 'Registration successful');
        router.replace('../LoginPage');
      } else {
        const result = await res.json();
        Alert.alert('Registration Failed', result.detail || 'Unknown error');
      }
    } catch (err) {
      console.log('Registration error:', err);
      Alert.alert('Error', 'Something went wrong!');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Register</Text>

      <TextInput
        style={styles.input}
        placeholder="First Name"
        autoCapitalize="words"
        value={firstName}
        onChangeText={setFirstName}
      />

      <TextInput
        style={styles.input}
        placeholder="Last Name"
        autoCapitalize="words"
        value={lastName}
        onChangeText={setLastName}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
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

      {/* KONUM SEÇ butonu */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#3B82F6', marginTop: 12 }]}
        onPress={() => setLocationModalVisible(true)}
      >
        <Text style={styles.buttonText}>Konum Seç</Text>
      </TouchableOpacity>

      {/* Seçilen konumu küçük metinle göster */}
      {selectedLocation && (
        <Text style={styles.locationText}>
          Seçilen Konum: {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
        </Text>
      )}


      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('../LoginPage')}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>

      {/* HARİTA MODAL */}
      <Modal
        visible={locationModalVisible}
        animationType="slide"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.mapContainer}>
          <Text style={styles.mapHeader}>Haritadan Konum Seç</Text>

          <MapView
            style={styles.map}
            initialRegion={initialRegion}
            onPress={handleMapPress} 
          >
              {selectedLocation && (
              <Marker
                coordinate={selectedLocation}
                title="Seçilen Konum"
                description={`${selectedLocation.latitude.toFixed(5)}, ${selectedLocation.longitude.toFixed(5)}`}
              />
            )}
          </MapView>

          <View style={styles.mapActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#6B7280' }]}
              onPress={() => setLocationModalVisible(false)}
            >
              <Text style={styles.actionText}>İptal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
              onPress={() => setLocationModalVisible(false)}
              disabled={!selectedLocation}
            >
              <Text style={styles.actionText}>{selectedLocation ? 'Onayla' : 'Nokta Seç'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


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
    marginTop: 8,
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
   // Modal/Map
  mapContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  mapHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  map: {
    flex: 1,
    borderRadius: 12,
  },
  mapActions: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
  },
  actionBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  locationText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },

});
