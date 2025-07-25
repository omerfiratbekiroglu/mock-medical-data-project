import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions, StyleSheet, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import API_BASE_URL from '../../config';

const chartConfig = {
  backgroundColor: '#fff',
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(230, 126, 34, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(42, 59, 76, ${opacity})`,
  propsForDots: {
    r: '5',
    strokeWidth: '2',
    stroke: '#e67e22',
  },
  fillShadowGradient: '#e67e22',
  fillShadowGradientOpacity: 0.2,
  style: { borderRadius: 10 },
};

export default function TemperatureScreen() {
  const [labels, setLabels] = useState<string[]>([]);
  const [data, setData] = useState<number[]>([]);

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
            const temp = Number(Number(parsed.temp).toFixed(1));
            if (!isNaN(temp) && isFinite(temp)) {
              temps.push(temp);
              labelList.push(formatLabelNow());
            }
          } catch (err) {
            console.log('Initial parse error:', decData?.decrypted_data);
          }
        }

        if (isMounted) {
          setData(temps);
          setLabels(labelList);
        }
      } catch (e) {
        console.log('Initial fetch error:', e);
      }
    }

    loadInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/read_encrypted?limit=1`);
        const [row] = await res.json();

        const decRes = await fetch(`${API_BASE_URL}/decrypt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ encrypted_data: row.encrypted_data }),
        });
        const decData = await decRes.json();

        try {
          const cleaned = decData.decrypted_data.replace(/X+$/, '');
          const parsed = JSON.parse(cleaned);
          const temp = Number(Number(parsed.temp).toFixed(1));
          if (!isNaN(temp) && isFinite(temp)) {
            const now = formatLabelNow();
            if (isMounted) {
              setData((prev) => [...prev.slice(-9), temp]);
              setLabels((prev) => [...prev.slice(-9), now]);
            }
          }
        } catch (err) {
          console.log('Poll parse error:', decData?.decrypted_data);
        }
      } catch (e) {
        console.log('Poll fetch error:', e);
      }

      if (isMounted) setTimeout(poll, 1000);
    };

    poll();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Temperature (Live)</Text>

      {data.length > 0 && data.every((n) => typeof n === 'number' && isFinite(n)) ? (
        <View style={styles.chartWrapper}>
          <ScrollView horizontal contentContainerStyle={styles.scrollContainer}>
            <LineChart
              data={{
                labels: formatLabels(labels),
                datasets: [
                  {
                    data,
                    color: (opacity = 1) => `rgba(230, 126, 34, ${opacity})`,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={Dimensions.get('window').width * 1.5}
              height={260}
              yAxisSuffix=" °C"
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withVerticalLines={false}
              withHorizontalLines={true}
              withInnerLines={false}
              fromZero
              withDots={true}
              renderDotContent={({ x, y, index }) => (
                <Text
                  key={index}
                  style={{
                    position: 'absolute',
                    top: y - 22,
                    left: x - 12,
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: '#e67e22',
                    backgroundColor: 'white',
                    paddingHorizontal: 2,
                    borderRadius: 4,
                  }}
                >
                  {data[index].toFixed(1)}
                </Text>
              )}
            />
          </ScrollView>
        </View>
      ) : (
        <Text style={styles.loadingText}>Grafik için geçerli veri bekleniyor...</Text>
      )}
    </View>
  );
}

function formatLabelNow() {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function formatLabels(times: string[]) {
  return times.map((t, i) => (i % 2 === 0 ? t : ''));
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
  chartWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
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
