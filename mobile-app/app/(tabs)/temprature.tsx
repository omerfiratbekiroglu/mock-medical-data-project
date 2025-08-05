import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions, StyleSheet,TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import API_BASE_URL from '../../config';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // 👈 bu satırı ekle




const chartWidth = Dimensions.get('window').width - 40;
const chartHeight = 260;

const chartConfig = {
  backgroundColor: '#fff',
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(230, 126, 34, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(42, 59, 76, ${opacity})`,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#e67e22',
  },
  fillShadowGradient: '#e67e22',
  fillShadowGradientOpacity: 0.2,
  propsForLabels: {
    fontSize: 10,
    rotation: 45, // ↖️ Açılı X ekseni etiketleri
  },
  style: { borderRadius: 10 },
};

export default function TemperatureScreen() {
  const [labels, setLabels] = useState<string[]>([]);
  const [data, setData] = useState<number[]>([]);
  const router = useRouter();

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
    return () => { isMounted = false; };
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
    return () => { isMounted = false; };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Temperature (Live)</Text>

      {data.length > 0 && data.every(n => typeof n === 'number' && isFinite(n)) ? (
        <View style={{ position: 'relative', width: chartWidth, height: chartHeight }}>
          <LineChart
            data={{
              labels: labels, // 👈 tüm timestamp'leri göster
              datasets: [{
                data,
                color: (opacity = 1) => `rgba(230, 126, 34, ${opacity})`,
                strokeWidth: 2,
              }],
            }}
            width={chartWidth}
            height={chartHeight}
            yAxisSuffix=" °C"
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withVerticalLines={false}
            withHorizontalLines={true}
            withInnerLines={false}
            fromZero
            withDots={true}
            renderDotContent={({ x, y, index }) => {
              const offset = index % 2 === 0 ? -22 : 10; // Zigzag: yukarı / aşağı
              return (
                <Text
                  key={index}
                  style={{
                    position: 'absolute',
                    top: y + offset,
                    left: x - 12,
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: '#e67e22',
                    backgroundColor: 'white',
                    paddingHorizontal: 4,
                    borderRadius: 4,
                  }}
                >
                  {data[index].toFixed(1)}°
                </Text>
              );
            }}
          />
        </View>
      ) : (
        <Text style={styles.loadingText}>Grafik için geçerli veri bekleniyor...</Text>
      )}

<TouchableOpacity
  onPress={() => router.push('../(tabs)/complete_logs')}
  style={{
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#3498db',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  }}
>
  <Ionicons name="home" size={28} color="#fff" />
</TouchableOpacity>




    </View>
  );
}

function formatLabelNow() {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
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
