import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import API_BASE_URL from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PageWithNavbar from '../../components/PageWithNavbar';

const API_URL = `${API_BASE_URL}/read_encrypted?limit=20`;

function formatTime(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleTimeString();
}

export default function LogsScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const lastTimeRef = useRef<string | null>(null);

  // Initial load
  useEffect(() => {
    let isMounted = true;

    const loadInitial = async () => {
      setLoading(true);
      const selectedPatientId = await AsyncStorage.getItem('selectedPatientId');
      setPatientId(selectedPatientId);
      if (!selectedPatientId) return;

      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        const decryptedRows = [];

        for (const row of data.reverse()) {
          try {
            const decryptRes = await fetch(`${API_BASE_URL}/decrypt`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ encrypted_data: row.encrypted_data })
            });

            const decryptData = await decryptRes.json();
            if (decryptData.decrypted_data) {
              const cleaned = decryptData.decrypted_data.replace(/X+$/, '');
              const vitals = JSON.parse(cleaned);
              vitals.time = row.time;

              if (vitals.patient_id === selectedPatientId) {
                decryptedRows.push(vitals);
              }
            }
          } catch (err) {
            console.log('Decryption or parsing failed:', err);
          }
        }

        if (isMounted) {
          setLogs(decryptedRows);
          if (decryptedRows.length > 0) lastTimeRef.current = decryptedRows[0].time;
        }
      } catch (e) {
        if (isMounted) setLogs([]);
      }

      setLoading(false);
    };

    loadInitial();

    return () => { isMounted = false; };
  }, []);

  // Polling
  useEffect(() => {
    let isMounted = true;

    const poll = async () => {
      const selectedPatientId = await AsyncStorage.getItem('selectedPatientId');
      if (!selectedPatientId) return;

      try {
        const res = await fetch(`${API_BASE_URL}/read_encrypted?limit=1`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const row = data[0];

          if (row.time !== lastTimeRef.current) {

            lastTimeRef.current = row.time;

            const decryptRes = await fetch(`${API_BASE_URL}/decrypt`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ encrypted_data: row.encrypted_data })
            });

            const decryptData = await decryptRes.json();
            if (decryptData.decrypted_data) {
              const cleaned = decryptData.decrypted_data.replace(/X+$/, '');
              const vitals = JSON.parse(cleaned);
              vitals.time = row.time;
              console.log("patient id:", vitals.patient_id, "selectedPatientId:", selectedPatientId)
              if (vitals.patient_id === selectedPatientId) {
                if (isMounted) {
                  setLogs(prev => [vitals, ...prev].slice(0, 10));
                }
              }
            }
          }
        }
      } catch (e) {
        // ignore polling errors
      }

      if (isMounted) setTimeout(poll, 500);
    };

    poll();

    return () => { isMounted = false; };
  }, []);

  return (
    <PageWithNavbar>
      <View style={styles.container}>
      <Text style={styles.title}>Vitals for {patientId || '...'}</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#2a3b4c" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView horizontal>
          <View>
            <View style={styles.headerRow}>
              <Text style={[styles.cell, styles.headerCell]}>Time</Text>
              <Text style={[styles.cell, styles.headerCell]}>Patient ID</Text>
              <Text style={[styles.cell, styles.headerCell]}>Heart Rate</Text>
              <Text style={[styles.cell, styles.headerCell]}>Oxygen Level</Text>
              <Text style={[styles.cell, styles.headerCell]}>Temperature</Text>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {logs.map((row, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dataRow,
                    idx === 0 ? styles.newRow : null,
                  ]}
                >
                  <Text style={styles.cell}>{formatTime(row.time)}</Text>
                  <Text style={styles.cell}>{row.patient_id}</Text>
                  <Text style={styles.cell}>{row.heart_rate}</Text>
                  <Text style={styles.cell}>{row.oxygen_level}</Text>
                  <Text style={styles.cell}>{row.temp}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      )}
      </View>
    </PageWithNavbar>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2a3b4c',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#e3eaf2',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerCell: {
    fontWeight: 'bold',
    color: '#2a3b4c',
    backgroundColor: '#e3eaf2',
  },
  dataRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cell: {
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 8,
    textAlign: 'center',
    color: '#2a3b4c',
  },
  newRow: {
    backgroundColor: '#d1ffd6',
  },
});
