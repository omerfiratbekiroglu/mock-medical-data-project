import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const mockLabels = [
  '12:01', '12:02', '12:03', '12:04', '12:05', '12:06', '12:07', '12:08', '12:09', '12:10'
];
const mockData = [98, 97, 99, 98, 97, 98, 99, 98, 97, 98];

export default function OxygenScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Oxygen Level</Text>
      <LineChart
        data={{
          labels: mockLabels,
          datasets: [
            {
              data: mockData,
              color: (opacity = 1) => `rgba(52,152,219,${opacity})`, // #3498db
              strokeWidth: 2,
            },
          ],
        }}
        width={Dimensions.get('window').width - 40}
        height={220}
        yAxisSuffix=" %"
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(52,152,219,${opacity})`,
          labelColor: (opacity = 1) => `rgba(42,59,76,${opacity})`,
          style: { borderRadius: 10 },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: '#3498db',
          },
          fillShadowGradient: '#3498db',
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