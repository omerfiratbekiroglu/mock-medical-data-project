import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

const mockLogs = [
  {
    time: '12:01:01',
    patient_id: 'P001',
    heart_rate: 75,
    oxygen_level: 98,
    temp: 36.7,
  },
  {
    time: '12:01:03',
    patient_id: 'P002',
    heart_rate: 77,
    oxygen_level: 97,
    temp: 36.8,
  },
  {
    time: '12:01:05',
    patient_id: 'P001',
    heart_rate: 76,
    oxygen_level: 99,
    temp: 36.9,
  },
  {
    time: '12:01:07',
    patient_id: 'P003',
    heart_rate: 78,
    oxygen_level: 98,
    temp: 36.7,
  },
  {
    time: '12:01:09',
    patient_id: 'P002',
    heart_rate: 74,
    oxygen_level: 97,
    temp: 36.6,
  },
  // Add more mock rows as needed
];

export default function LogsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Vitals Logs</Text>
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
            {mockLogs.map((row, idx) => (
              <View
                key={idx}
                style={[
                  styles.dataRow,
                  idx === 0 ? styles.newRow : null, // highlight the latest row
                ]}
              >
                <Text style={styles.cell}>{row.time}</Text>
                <Text style={styles.cell}>{row.patient_id}</Text>
                <Text style={styles.cell}>{row.heart_rate}</Text>
                <Text style={styles.cell}>{row.oxygen_level}</Text>
                <Text style={styles.cell}>{row.temp}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
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