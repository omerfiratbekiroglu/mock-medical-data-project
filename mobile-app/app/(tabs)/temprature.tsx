import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions, StyleSheet,TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import API_BASE_URL from '../../config';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PageWithNavbar from '../../components/PageWithNavbar';




const chartWidth = Dimensions.get('window').width - 40;
const chartHeight = 350;

const CARD_PADDING_V = 20;   // üst-alt boşluk
const CARD_PADDING_H = 16;   // sağ-sol boşluk
const CARD_WIDTH = chartWidth; 
const INNER_CHART_HEIGHT = chartHeight;
const INNER_CHART_WIDTH = CARD_WIDTH - CARD_PADDING_H;

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
    //rotation: 45, // ↖️ Açılı X ekseni etiketleri
    dx: -10,
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
    <PageWithNavbar>
      <View style={styles.container}>
      <Text style={styles.title}>Temperature (Live)</Text>
      
{data.length > 0 && data.every(n => typeof n === 'number' && isFinite(n)) ? (
  <View
    style={{
      width: CARD_WIDTH,
      backgroundColor: '#fff',   // kart arka planı
      borderRadius: 12,
      paddingVertical: CARD_PADDING_V,
      paddingHorizontal: CARD_PADDING_H,
      // gölge / border istersen:
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    }}
  >
    {/* Bu view, LineChart'ı dikeyde ortalar */}
    <View style={{ height: INNER_CHART_HEIGHT, justifyContent: 'center' }}>
      <LineChart
        data={{
          labels,
          datasets: [{
            data,
            color: (opacity = 1) => `rgba(230, 126, 34, ${opacity})`,
            strokeWidth: 2,
          }],
        }}
        width={INNER_CHART_WIDTH}     // iç genişlik: padding'i düş
        height={INNER_CHART_HEIGHT}   // grafik sabit yükseklik
        yAxisSuffix=" °C"
        chartConfig={chartConfig}
        bezier
        style={{ borderRadius: 10, alignItems: 'center', marginLeft: -10  }}
        withVerticalLines={false}
        withHorizontalLines={true}
        withInnerLines={false}
        fromZero
        horizontalLabelRotation={0}
        verticalLabelRotation={-45}
        xLabelsOffset={10}
        
        withDots={true}
        renderDotContent={({ x, y, index }) => {
          const offset = index % 2 === 0 ? -22 : 10;
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
  </View>
) : (
  <Text style={styles.loadingText}>Grafik için geçerli veri bekleniyor...</Text>
)}

      </View>
    </PageWithNavbar>
  );
}

function formatLabelNow() {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
