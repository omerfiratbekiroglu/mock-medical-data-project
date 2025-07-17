import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import API_BASE_URL from '../../config';

const chartConfig = {
  backgroundColor: '#fff',
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(230, 126, 34,${opacity})`, // turuncu ton
  labelColor: (opacity = 1) => `rgba(42,59,76,${opacity})`,
  style: { borderRadius: 10 },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#e67e22',
  },
  fillShadowGradient: '#e67e22',
  fillShadowGradientOpacity: 0.1,
};

export default function TemperatureScreen() {
  const [labels, setLabels] = useState<string[]>([]);
  const [data, setData] = useState<number[]>([]);
  const lastTimeRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      try {
        const res = await fetch(`${API_BASE_URL}/read_encrypted?limit=10`);
        const rows = await res.json();
        const reversed = rows.reverse();
        const temps: number[] = [];
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
            console.log('Parsed data:', parsed);
            const temp = Number(parsed.temp);
            if (!isNaN(temp) && isFinite(temp)) {
              temps.push(temp);
              labelList.push(formatLabel(row.time));
            }
          } catch (err) {
            console.log('Initial parse error:', decData?.decrypted_data);
          }
        }

        if (isMounted) {
          setData(temps);
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
            const temp = Number(parsed.temp);
            if (!isNaN(temp) && isFinite(temp)) {
              const timeLabel = formatLabel(row.time);
              if (isMounted) {
                setData(prev => [...prev.slice(-9), temp]);
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Temperature (Live)</Text>

      {data.length > 0 && data.every(n => typeof n === 'number' && isFinite(n)) ? (
        <LineChart
          data={{
            labels,
            datasets: [{
              data,
              color: (opacity = 1) => `rgba(230, 126, 34,${opacity})`,
              strokeWidth: 2,
            }],
          }}
          width={Dimensions.get('window').width - 40}
          height={220}
          yAxisSuffix=" °C"
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withVerticalLines={false}
          withHorizontalLines={true}
          withInnerLines={false}
          fromZero
        />
      ) : (
        <Text style={styles.loadingText}>Grafik için geçerli veri bekleniyor...</Text>
      )}
    </View>
  );
}

function formatLabel(iso: string) {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2a3b4c',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 10,
    marginVertical: 8,
  },
  loadingText: {
    marginTop: 20,
    color: '#888',
    fontStyle: 'italic',
  },
});
