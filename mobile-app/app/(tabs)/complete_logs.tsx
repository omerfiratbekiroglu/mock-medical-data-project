import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

const API_URL = 'http://192.168.2.159:8000';
const PATIENT_ID = 'patient1';

function formatTime(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleTimeString();
}

export default function FallbackLogsScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSeqNo, setLastSeqNo] = useState<number>(0);

const insertWithGapDetection = (newEntries: any[], existing: any[]) => {
  const existingSeqs = new Set(existing.map(e => e.seq_no));
  const merged = [...existing];
  let lastSeenSeq = existing.length > 0 ? existing[existing.length - 1].seq_no : 0;

  newEntries.sort((a, b) => a.seq_no - b.seq_no);

  for (const entry of newEntries) {
    if (existingSeqs.has(entry.seq_no)) {
      continue; // Skip duplicate
    }

    // Check for missing in-between
    if (entry.seq_no > lastSeenSeq + 1) {
      for (let missingSeq = lastSeenSeq + 1; missingSeq < entry.seq_no; missingSeq++) {
        if (!existingSeqs.has(missingSeq)) {
          merged.push({
            seq_no: missingSeq,
            patient_id: entry.patient_id,
            heart_rate: 'N/A',
            oxygen_level: 'N/A',
            temp: 'N/A',
            time: 'Recovered via fallback',
            late: false,
            missedLive: true,
          });
          existingSeqs.add(missingSeq);
        }
      }
      entry.missedLive = true;
    }

    // Also mark manually inserted fallback rows
    if (entry.missedLive === undefined && entry.time === 'Recovered via fallback') {
      entry.missedLive = true;
    }

    merged.push(entry);
    existingSeqs.add(entry.seq_no);
    lastSeenSeq = entry.seq_no;
  }

  merged.sort((a, b) => a.seq_no - b.seq_no);
  return merged;
};


  const decryptRows = async (rows: any[]) => {
    const decryptedRows: any[] = [];
    for (const row of rows) {
      try {
        const decryptRes = await fetch(`${API_URL}/decrypt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ encrypted_data: row.encrypted_data }),
        });
        const decryptData = await decryptRes.json();

        if (decryptData.decrypted_data) {
          const cleaned = decryptData.decrypted_data.replace(/X+$/, '');
          const vitals = JSON.parse(cleaned);
          vitals.time = row.time;
          vitals.seq_no = row.seq_no;
          vitals.late = row.late;
          vitals.patient_id = row.patient_id;
          decryptedRows.push(vitals);
        }
      } catch (err) {
        console.log('Decryption failed:', err);
      }
    }
    return decryptedRows;
  };

  useEffect(() => {
    let isMounted = true;

    const fetchInitial = async () => {
      try {
        const res = await fetch(`${API_URL}/fetch_by_seq_range?patient_id=${PATIENT_ID}&start=1&end=50`);
        const rows = await res.json();
        const decryptedRows = await decryptRows(rows);

        if (isMounted) {
          decryptedRows.sort((a, b) => a.seq_no - b.seq_no);
          const merged = insertWithGapDetection(decryptedRows, []);
          setLogs(merged);
          const last = decryptedRows.length > 0 ? decryptedRows[decryptedRows.length - 1].seq_no : 0;
          setLastSeqNo(last);
        }
      } catch (e) {
        console.log('Initial fetch failed:', e);
      }
      setLoading(false);
    };

    fetchInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const windowSize = 50;
        const start = lastSeqNo + 1;
        const end = start + windowSize - 1;

        const res = await fetch(`${API_URL}/fetch_by_seq_range?patient_id=${PATIENT_ID}&start=${start}&end=${end}`);
        const rows = await res.json();
        if (!Array.isArray(rows) || rows.length === 0) return;

        const receivedSeqs = rows.map(r => r.seq_no);
        const decryptedRows = await decryptRows(rows);

        // Check for missing seq_nos in current window
        const missingSeqs: number[] = [];
        for (let s = start; s <= end; s++) {
          if (!receivedSeqs.includes(s)) {
            missingSeqs.push(s);
          }
        }

        // Recover missing packets from DB if available
        if (missingSeqs.length > 0) {
          const recoveryRes = await fetch(`${API_URL}/fetch_by_seq_range?patient_id=${PATIENT_ID}&start=${missingSeqs[0]}&end=${missingSeqs[missingSeqs.length - 1]}`);
          const recoveryRows = await recoveryRes.json();
          const recovered = await decryptRows(recoveryRows);
          recovered.forEach(r => (r.missedLive = true));
          decryptedRows.push(...recovered);
        }

        // Merge and update logs
        setLogs(prev => {
          const merged = insertWithGapDetection(decryptedRows, prev);
          return merged;
        });

        const maxSeq = Math.max(...receivedSeqs, lastSeqNo);
        setLastSeqNo(maxSeq);
      } catch (e) {
        console.log('Polling fetch error:', e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [lastSeqNo]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Extensive Fallback Logs</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#2a3b4c" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView horizontal>
          <View>
            <View style={styles.headerRow}>
              <Text style={[styles.cell, styles.headerCell]}>Seq</Text>
              <Text style={[styles.cell, styles.headerCell]}>Patient</Text>
              <Text style={[styles.cell, styles.headerCell]}>Heart</Text>
              <Text style={[styles.cell, styles.headerCell]}>O₂</Text>
              <Text style={[styles.cell, styles.headerCell]}>Temp</Text>
              <Text style={[styles.cell, styles.headerCell]}>Time</Text>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {logs.map((row, idx) => (
                <View
                  key={`${row.seq_no}-${idx}`}
                  style={[
                    styles.dataRow,
                    row.late ? styles.lateRow : null,
                    row.missedLive ? styles.missedRow : null,
                  ]}
                >
                  <Text style={styles.cell}>{row.seq_no}</Text>
                  <Text style={styles.cell}>{row.patient_id}</Text>
                  <Text style={styles.cell}>{row.heart_rate}</Text>
                  <Text style={styles.cell}>{row.oxygen_level}</Text>
                  <Text style={styles.cell}>{row.temp}</Text>
                  <Text style={styles.cell}>{formatTime(row.time)}</Text>
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
    padding: 10,
    textAlign: 'center',
    color: '#2a3b4c',
  },
  lateRow: {
    backgroundColor: '#ffe4e1',
  },
  missedRow: {
    backgroundColor: '#fff7cc',
  },
});
