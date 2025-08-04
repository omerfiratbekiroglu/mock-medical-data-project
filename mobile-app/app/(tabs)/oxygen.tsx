import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Dimensions, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import API_BASE_URL from '../../config';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';


const chartConfig = {
  backgroundColor: '#fff',
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(41, 128, 185,${opacity})`,
  labelColor: (opacity = 1) => `rgba(42,59,76,${opacity})`,
  style: {
    borderRadius: 10,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#2980b9',
  },
  fillShadowGradient: '#2980b9',
  fillShadowGradientOpacity: 0.1,
  propsForLabels: {
    fontSize: 10,
    rotation: 45,
  },
};

export default function OxygenLevelScreen() {
  const [labels, setLabels] = useState<string[]>([]);
  const [data, setData] = useState<number[]>([]);
  const lastTimeRef = useRef<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<'oxy' | 'other' | null>(null);
  const router = useRouter();

  const handleGoBack = () => {
   router.push('../PatientSelectScreen');
  };

  const handleLogout = async () => {
  await AsyncStorage.clear();
  router.replace('/LoginPage'); // 👈 seni doğrudan login ekranına götürür
  };




  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      try {
        const res = await fetch(`${API_BASE_URL}/read_encrypted?limit=10`);
        const rows = await res.json();
        const reversed = rows.reverse();
        const oxyLevels: number[] = [];
        const labelList: string[] = [];

        for (let i = 0; i < reversed.length; i++) {
          const row = reversed[i];
          const decRes = await fetch(`${API_BASE_URL}/decrypt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ encrypted_data: row.encrypted_data }),
          });
          const decData = await decRes.json();
          try {
            const cleaned = decData.decrypted_data.replace(/X+$/, '');
            const parsed = JSON.parse(cleaned);
            const oxy = Number(parsed.oxygen_level);
            if (!isNaN(oxy) && isFinite(oxy)) {
              oxyLevels.push(oxy);
              labelList.push(formatLabel(row.time));
            }
          } catch (err) {
            console.log('Initial parse error:', decData?.decrypted_data);
          }
        }

        if (isMounted) {
          setData(oxyLevels);
          setLabels(labelList);
          if (rows.length > 0) lastTimeRef.current = rows[0].time;
        }
      } catch (e) {
        console.log('Initial fetch error:', e);
      }
    }

    loadInitial();
    return () => { isMounted = false; };
  }, []);

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
            const oxy = Number(parsed.oxygen_level);
            if (!isNaN(oxy) && isFinite(oxy)) {
              const timeLabel = formatLabel(row.time);
              if (isMounted) {
                setData(prev => [...prev.slice(-9), oxy]);
                setLabels(prev => [...prev.slice(-9), timeLabel]);
              }
            }
          } catch (err) {
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
  }, []);

  const renderChart = (id: 'oxy' | 'other', color: string, dataset: number[]) => {
    const isExpanded = expandedChart === id;
    const toggleExpand = () => {
      setExpandedChart(prev => (prev === id ? null : id));
    };

    const chartComponent = (
      <TouchableOpacity onPress={toggleExpand} activeOpacity={0.95}>
        <LineChart
          data={{
            labels,
            datasets: [{ data: dataset, color: () => color }],
          }}
          width={Dimensions.get('window').width - 20}
          height={isExpanded ? 360 : 220}
          yAxisSuffix="%"
          yLabelsOffset={10}
          chartConfig={{
            ...chartConfig,
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: color,
            },
            fillShadowGradient: color,
          }}
          bezier
          style={styles.chart}
          withVerticalLines={false}
          withHorizontalLines={true}
          withInnerLines={false}
          withDots={true}
          withShadow={true}
          fromZero={true}
          segments={5}
          renderDotContent={({ x, y, index }) => (
            <Text
              key={index}
              style={{
                position: 'absolute',
                top: y - 12,
                left: x - 12,
                fontSize: 10,
                color: '#2a3b4c',
                fontWeight: 'bold',
              }}
            >
              {dataset[index]}%
            </Text>
          )}
        />
      </TouchableOpacity>
    );

    if (isExpanded) {
      return (
        <View style={styles.expanded}>
          {chartComponent}
        </View>
      );
    }

    if (expandedChart !== null && expandedChart !== id) {
      return null;
    }

    return chartComponent;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f6fa' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Oxygen Level (Live)</Text>
        {data.length > 0 ? (
          <>
            {renderChart('oxy', '#2980b9', data)}
            {renderChart('other', '#e74c3c', data.map(v => v - 5))}
          </>
        ) : (
          <Text style={styles.loadingText}>Grafik için geçerli veri bekleniyor...</Text>
        )}
      </ScrollView>
      <View style={{ marginTop: 20 }}>
  <TouchableOpacity
    onPress={handleGoBack}
    style={{ backgroundColor: '#ccc', padding: 10, borderRadius: 50, marginBottom: 10 ,width: 100, alignSelf: 'center'}}
  >
    <Text style={{ textAlign: 'center', color: '#000' }}>← Go Back</Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={handleLogout}
    style={{ backgroundColor: '#517d86ff', padding: 10, borderRadius: 50, width: 100, alignSelf: 'center' }}
  >
    <Text style={{ textAlign: 'center', color: '#fff' }}>Logout</Text>
  </TouchableOpacity>
</View>

    </SafeAreaView>
  );
}

function formatLabel(iso: string) {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: 20,
    paddingHorizontal: 10,
    backgroundColor: '#f4f6fa',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2a3b4c',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 12,
    marginVertical: 10,
    alignSelf: 'center',
  },
  expanded: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    color: '#888',
    fontStyle: 'italic',
  },
});
