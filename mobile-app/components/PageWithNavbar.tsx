import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NavigationBar from './NavigationBar';
import PatientDrawerPanel from './PatientDrawerPanel';

interface PageWithNavbarProps {
  children: React.ReactNode;
  backgroundColor?: string;
}

export default function PageWithNavbar({ children, backgroundColor = '#f4f6fa' }: PageWithNavbarProps) {
  const [drawerVisible, setDrawerVisible] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <NavigationBar onMenuPress={() => setDrawerVisible(true)} />
      <PatientDrawerPanel visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});