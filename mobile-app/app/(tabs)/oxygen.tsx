import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Dimensions, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import API_BASE_URL from '../../config';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import PatientDrawerButton from '../../components/PatientDrawerButton';
import PatientDrawerPanel from '../../components/PatientDrawerPanel';
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
  color: (opacity = 1) => `rgba(41, 128, 185, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(42, 59, 76, ${opacity})`,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#2980b9',
  },
  fillShadowGradient: '#2980b9',
  fillShadowGradientOpacity: 0.2,
  propsForLabels: {
    fontSize: 10,
    dx: -10,
  },
  style: { borderRadius: 10 },
};

 
export default function OxygenLevelScreen() {
  const [labels, setLabels] = useState<string[]>([]);
  const [data, setData] = useState<number[]>([]);
  const lastTimeRef = useRef<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<'oxy' | 'other' | null>(null);
  const router = useRouter();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const toggleDrawer = () => {
  setDrawerVisible((prev) => !prev);
};



  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/LoginPage');
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

  const renderChart = (id: 'oxy' | 'other', color: string, dataset: number[], suffix: string) => {
    const isExpanded = expandedChart === id;
    const toggleExpand = () => {
      setExpandedChart(prev => (prev === id ? null : id));
    };

    const chartComponent = (
      <TouchableOpacity onPress={toggleExpand} activeOpacity={0.95}>
        <View
          style={{
            width: CARD_WIDTH,
            backgroundColor: '#fff',
            borderRadius: 12,
            paddingVertical: CARD_PADDING_V,
            paddingHorizontal: CARD_PADDING_H,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
            marginVertical: 10,
          }}
        >
        <View style={{ height: isExpanded ? 450 : INNER_CHART_HEIGHT, justifyContent: 'center' }}>
          <LineChart
            data={{
              labels,
              datasets: [{
                data: dataset,
                color: (opacity = 1) => color.replace('1)', `${opacity})`),
                strokeWidth: 2,
              }],
            }}
            width={INNER_CHART_WIDTH}
            height={isExpanded ? 450 : INNER_CHART_HEIGHT}
            yAxisSuffix={suffix}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => color.replace('1)', `${opacity})`),
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: color.replace('rgba(', '').replace(', 1)', '').split(', ').slice(0, 3).join(', '),
              },
              fillShadowGradient: color.replace('rgba(', '').replace(', 1)', '').split(', ').slice(0, 3).join(', '),
            }}
            bezier
            style={{ borderRadius: 10, alignItems: 'center', marginLeft: -10 }}
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
                    color: color.replace('rgba(', '').replace(', 1)', '').split(', ').slice(0, 3).join(', '),
                    backgroundColor: 'white',
                    paddingHorizontal: 4,
                    borderRadius: 4,
                  }}
                >
                  {dataset[index]}{suffix}
                </Text>
              );
            }}
          />
        </View>
        </View>
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
    <PageWithNavbar>
      <PatientDrawerPanel visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Oxygen Level (Live)</Text>
        {data.length > 0 ? (
          <>
            {renderChart('oxy', 'rgba(41, 128, 185, 1)', data, '%')}
            {renderChart('other', 'rgba(231, 76, 60, 1)', data.map(v => v - 5), '%')}
          </>
        ) : (
          <Text style={styles.loadingText}>Grafik için geçerli veri bekleniyor...</Text>
        )}
      </ScrollView>
    </PageWithNavbar>
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
