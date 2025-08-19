import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Dimensions, StyleSheet, TouchableOpacity, Modal, Vibration } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import API_BASE_URL from '../../config';
import PageWithNavbar from '../../components/PageWithNavbar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const chartWidth = Dimensions.get('window').width - 20;
const chartHeight = 220;

const CRITICAL_HEART_RATE_THRESHOLD = 90;

const chartConfig = {
  backgroundColor: '#fff',
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(231,76,60,${opacity})`,
  labelColor: (opacity = 1) => `rgba(42,59,76,${opacity})`,
  style: { borderRadius: 10 },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#e74c3c',
  },
  fillShadowGradient: '#e74c3c',
  fillShadowGradientOpacity: 0.1,
  propsForLabels: {
    fontSize: 10,
    rotation: 45,
  },
};

export default function HeartRateScreen() {
  const [labels, setLabels] = useState<string[]>([]);
  const [data, setData] = useState<number[]>([]);
  const [showCriticalAlert, setShowCriticalAlert] = useState(false);
  const [currentHeartRate, setCurrentHeartRate] = useState<number | null>(null);
  const lastTimeRef = useRef<string | null>(null);
  const alertShownRef = useRef<boolean>(false);

  const hideAlert = () => {
    setShowCriticalAlert(false);
    setTimeout(() => {
      alertShownRef.current = false;
    }, 5000);
  };

  const sendCriticalAlertToCaregiver = async (heartRate: number) => {
    try {
      const patientId = await AsyncStorage.getItem('selectedPatientId');
      if (!patientId) {
        console.log('Patient ID not found, cannot send alert');
        return;
      }

      const alertData = {
        patient_id: parseInt(patientId),
        heart_rate: heartRate,
        threshold_value: CRITICAL_HEART_RATE_THRESHOLD,
        message: `Hasta ${patientId} kritik kalp atışı seviyesinde! Kalp atışı: ${heartRate} BPM, Eşik: ${CRITICAL_HEART_RATE_THRESHOLD} BPM`
      };

      const response = await fetch(`${API_BASE_URL}/critical_alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData),
      });

      const result = await response.json();
      if (result.success) {
        console.log(`Critical alert sent to ${result.caregivers_notified} caregiver(s)`);
      } else {
        console.log('Failed to send critical alert:', result);
      }
    } catch (error) {
      console.log('Error sending critical alert:', error);
    }
  };

  const showAlert = React.useCallback(() => {
    setShowCriticalAlert(true);
    setTimeout(hideAlert, 5000);
  }, []);

  const checkCriticalHeartRate = React.useCallback((heartRate: number) => {
    console.log(`Heart Rate: ${heartRate}, Threshold: ${CRITICAL_HEART_RATE_THRESHOLD}, Alert Shown: ${alertShownRef.current}`);
    if (heartRate < CRITICAL_HEART_RATE_THRESHOLD && !alertShownRef.current) {
      alertShownRef.current = true;
      setCurrentHeartRate(heartRate);
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
      showAlert();
      // Caregiver'a critical alert gönder
      sendCriticalAlertToCaregiver(heartRate);
    } else if (heartRate >= CRITICAL_HEART_RATE_THRESHOLD) {
      alertShownRef.current = false;
    }
  }, [showAlert]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      try {
        const res = await fetch(`${API_BASE_URL}/read_encrypted?limit=10`);
        const rows = await res.json();
        const reversed = rows.reverse();
        const heartRates: number[] = [];
        const labelList: string[] = [];

        for (const row of reversed) {
          const decRes = await fetch(`${API_BASE_URL}/decrypt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ encrypted_data: row.encrypted_data }),
          });
          const decData = await decRes.json();
          try {
            const cleaned = decData.decrypted_data.replace(/X+$/, '');
            const parsed = JSON.parse(cleaned);
            const hr = Number(parsed.heart_rate);
            if (!isNaN(hr) && isFinite(hr)) {
              heartRates.push(hr);
              labelList.push(formatLabel(row.time));
              if (heartRates.length === 1) {
                checkCriticalHeartRate(hr);
              }
            }
          } catch {
            console.log('Initial parse error:', decData?.decrypted_data);
          }
        }

        if (isMounted) {
          setData(heartRates);
          setLabels(labelList);
          if (rows.length > 0) lastTimeRef.current = rows[0].time;
        }
      } catch (e) {
        console.log('Initial fetch error:', e);
      }
    }

    loadInitial();
    return () => { isMounted = false; };
  }, [checkCriticalHeartRate]);

  useEffect(() => {
    let isMounted = true;

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/read_encrypted?limit=1`);
        const [row] = await res.json();
        if (row?.time !== lastTimeRef.current) {
          lastTimeRef.current = row.time;

          const decRes = await fetch(`${API_BASE_URL}/decrypt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ encrypted_data: row.encrypted_data }),
          });
          const decData = await decRes.json();

          try {
            const cleaned = decData.decrypted_data.replace(/X+$/, '');
            const parsed = JSON.parse(cleaned);
            const hr = Number(parsed.heart_rate);
            if (!isNaN(hr) && isFinite(hr)) {
              const timeLabel = formatLabel(row.time);
              checkCriticalHeartRate(hr);
              if (isMounted) {
                setData(prev => [...prev.slice(-9), hr]);
                setLabels(prev => [...prev.slice(-9), timeLabel]);
              }
            }
          } catch {
            console.log('Poll parse error:', decData?.decrypted_data);
          }
        }
      } catch (e) {
        console.log('Poll fetch error:', e);
      }

      if (isMounted) setTimeout(poll, 1000);
    };

    poll();
    return () => { isMounted = false; };
  }, [checkCriticalHeartRate]);

  return (
    <PageWithNavbar>
      <View style={styles.container}>
        <Text style={styles.title}>Heart Rate (Live)</Text>

        {data.length > 0 ? (
          <LineChart
            data={{
              labels,
              datasets: [{ data }],
            }}
            width={chartWidth}
            height={chartHeight}
            yAxisSuffix=" bpm"
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withVerticalLines={false}
            withHorizontalLines={true}
            withInnerLines={false}
            fromZero
            renderDotContent={({ x, y, index }) => (
              <Text
                key={index}
                style={{
                  position: 'absolute',
                  top: y - 15,
                  left: x - 12,
                  fontSize: 9,
                  color: '#2a3b4c',
                  fontWeight: 'bold',
                }}
              >
                {data[index]} bpm
              </Text>
            )}
          />
        ) : (
          <Text style={styles.loadingText}>Grafik için geçerli veri bekleniyor...</Text>
        )}

        <Modal
          visible={showCriticalAlert}
          animationType="slide"
          transparent={true}
          onRequestClose={hideAlert}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.alertContainer}>
              <Text style={styles.alertTitle}>KRİTİK UYARI</Text>
              <Text style={styles.alertMessage}>
                Kalp atış hızı kritik seviyeye düştü!
              </Text>
              <Text style={styles.alertDetails}>
                Mevcut: {currentHeartRate} bpm
              </Text>
              <Text style={styles.alertDetails}>
                Kritik eşik: {CRITICAL_HEART_RATE_THRESHOLD} bpm
              </Text>
              <Text style={styles.alertAction}>
                Acilen tıbbi yardım alın!
              </Text>
              <TouchableOpacity style={styles.alertButton} onPress={hideAlert}>
                <Text style={styles.alertButtonText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </PageWithNavbar>
  );
}

function formatLabel(iso: string) {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2a3b4c',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 12,
    alignSelf: 'center',
  },
  loadingText: {
    marginTop: 20,
    color: '#888',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#e74c3c',
  },
  alertIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 15,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    color: '#2a3b4c',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  alertDetails: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 8,
    textAlign: 'center',
  },
  alertAction: {
    fontSize: 16,
    color: '#e74c3c',
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  alertButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
