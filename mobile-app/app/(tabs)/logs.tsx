import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import API_BASE_URL from '../../config';

const API_URL = `${API_BASE_URL}/read_encrypted?limit=10`;

function formatTime(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleTimeString();
}

export default function LogsScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const lastTimeRef = useRef<string | null>(null);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    const AES_KEY = "thisisaverysecretkey1234567890ab"; // Not needed anymore
    async function loadInitial() {
      setLoading(true);
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        console.log('API data:', data);
        const decryptedRows = [];
        for (const row of data.reverse()) {
          try {
            // Call /decrypt endpoint
            const decryptRes = await fetch(`${API_BASE_URL}/decrypt`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ encrypted_data: row.encrypted_data })
            });
            const decryptData = await decryptRes.json();
            if (decryptData.decrypted_data) {
              const byteLength = new TextEncoder().encode(decryptData.decrypted_data).length;
              console.log(`Decrypted data length: ${byteLength} bytes`);
              const cleaned = decryptData.decrypted_data.replace(/X+$/, '');
              const vitals = JSON.parse(cleaned);
              vitals.time = row.time;
              decryptedRows.push(vitals);
            } else {
              console.log('Decryption failed:', decryptData);
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
        // fallback to mock data if error
        if (isMounted) setLogs([]);
      }
      setLoading(false);
    }
    loadInitial();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/read_encrypted?limit=1`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const row = data[0];
          if (row.time !== lastTimeRef.current) {
            lastTimeRef.current = row.time;
            // Call /decrypt endpoint
            const decryptRes = await fetch(`${API_BASE_URL}/decrypt`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ encrypted_data: row.encrypted_data })
            });
            const decryptData = await decryptRes.json();
            if (decryptData.decrypted_data) {
              const byteLength = new TextEncoder().encode(decryptData.decrypted_data).length;
              console.log(`Decrypted data length: ${byteLength} bytes`);
              const cleaned = decryptData.decrypted_data.replace(/X+$/, '');
              const vitals = JSON.parse(cleaned);
              vitals.time = row.time;
              if (isMounted) {
                setLogs(prev => [vitals, ...prev].slice(0, 10));
              }
            } else {
              console.log('Decryption failed:', decryptData);
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
    <View style={styles.container}>
      <Text style={styles.title}>Live Vitals Logs</Text>
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
                    idx === 0 ? styles.newRow : null, // highlight the latest row
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fa',
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