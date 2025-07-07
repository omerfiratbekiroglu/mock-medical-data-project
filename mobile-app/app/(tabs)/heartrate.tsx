import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const mockLabels = [
  '12:01', '12:02', '12:03', '12:04', '12:05', '12:06', '12:07', '12:08', '12:09', '12:10'
];
const mockData = [75, 77, 76, 78, 74, 73, 75, 76, 77, 75];

export default function HeartRateScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Heart Rate</Text>
      <LineChart
        data={{
          labels: mockLabels,
          datasets: [
            {
              data: mockData,
              color: (opacity = 1) => `rgba(231,76,60,${opacity})`, // #e74c3c
              strokeWidth: 2,
            },
          ],
        }}
        width={Dimensions.get('window').width - 40}
        height={220}
        yAxisSuffix=" bpm"
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(231,76,60,${opacity})`,
          labelColor: (opacity = 1) => `rgba(42,59,76,${opacity})`, // #2a3b4c
          style: { borderRadius: 10 },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: '#e74c3c',
          },
          fillShadowGradient: '#e74c3c',
          fillShadowGradientOpacity: 0.1,
        }}
        bezier
        style={styles.chart}
        withVerticalLines={false}
        withHorizontalLines={true}
        withInnerLines={false}
        fromZero
      />
    </View>
  );
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
});