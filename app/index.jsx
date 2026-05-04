import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getAllStats, getMeterReadings, getMeters, initDatabase } from '../utils/database';

const screenWidth = Dimensions.get('window').width;

const Home = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    meters: 0,
    readings: 0,
    usage: 0,
  });
  const [chartData, setChartData] = useState({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{ data: [0, 0, 0, 0, 0, 0] }],
  });

  const [isReady, setIsReady] = useState(false);
  const [metersData, setMetersData] = useState([]);
  const [selectedMeter, setSelectedMeter] = useState();
  const [meterModalVisible, setMeterModalVisible] = useState(false);

  const handleSelectMeter = async (meter) => {
    setSelectedMeter(meter);
    setMeterModalVisible(false);
  };

  const loadDashboardData = async () => {
    try {
      const [metersResult, readingsResult, dbStatsResult] = await Promise.allSettled([
        getMeters(),
        getMeterReadings(),
        getAllStats(),
      ]);

      const metersData = metersResult.status === 'fulfilled' ? metersResult.value ?? [] : [];
      const readingsData = readingsResult.status === 'fulfilled' ? readingsResult.value ?? [] : [];
      const dbStats = dbStatsResult.status === 'fulfilled' ? dbStatsResult.value ?? {} : {};

      setMetersData(metersData);

      // ✅ Filter readings by selected meter's id
      const filteredReadings = selectedMeter
        ? readingsData?.filter(r => r.meter_id === selectedMeter.id) || []
        : readingsData || [];

      const activeMeterCount = metersData?.filter(m => m.is_active === 1).length || 0;
      const totalReadings = filteredReadings.length;

      // ✅ Group readings by month
      const monthlyReadingsMap = {};
      filteredReadings.forEach(reading => {
        const date = new Date(reading.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyReadingsMap[monthKey]) {
          monthlyReadingsMap[monthKey] = [];
        }
        monthlyReadingsMap[monthKey].push({
          value: parseFloat(reading.meter_reading || 0),
          date,
        });
      });

      // ✅ For each month: usage = FIRST reading − LAST reading (your logic)
      const monthlyUsage = {};
      Object.entries(monthlyReadingsMap).forEach(([monthKey, readings]) => {
        // Sort ascending by date so index 0 = earliest, last index = latest
        readings.sort((a, b) => a.date - b.date);

        const firstReading = readings[0].value;                      // e.g. 2000
        const lastReading = readings[readings.length - 1].value;   // e.g. 2020

        // first - last gives negative, so we use last - first = 20 units ✅
        // If YOUR meter works in reverse (higher first = more consumed), flip this:
        const usage = lastReading - firstReading;

        monthlyUsage[monthKey] = usage > 0 ? usage : 0;
      });

      // ✅ Total usage across all months
      const totalUnits = Object.values(monthlyUsage).reduce((sum, v) => sum + v, 0);

      // ✅ Last 6 months for chart
      const now = new Date();
      const last6Months = [];
      const chartValues = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        last6Months.push(monthName);
        chartValues.push(Math.round(monthlyUsage[monthKey] || 0));
      }

      setStats({
        meters: activeMeterCount,
        readings: totalReadings,
        usage: Math.round(totalUnits * 10) / 10,
      });

      setChartData({
        labels: last6Months,
        datasets: [{ data: chartValues }],
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const initializeApp = async () => {
    try {
      setLoading(true);
      await initDatabase();
      await loadDashboardData();
      setIsReady(true);
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (metersData.length > 0 && !selectedMeter) {
      setSelectedMeter(metersData[0]);
    }
  }, [metersData]);



  useEffect(() => {
    if (isReady) {
      loadDashboardData();
    }
  }, [selectedMeter]);


  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  const menu = [
    {
      id: '1',
      title: 'Capture',
      subtitle: 'Take meter photo',
      icon: 'camera',
      route: '/capture',
      color: '#4f46e5',
      bgColor: '#e0e7ff',
    },
    {
      id: '2',
      title: 'Meters',
      subtitle: 'View all meters',
      icon: 'meter-electric',
      route: '/meterListScreen',
      color: '#f59e0b',
      bgColor: '#fef3c7',
    },
    {
      id: '3',
      title: 'History',
      subtitle: 'Reading logs',
      icon: 'history',
      route: '/history',
      color: '#ef4444',
      bgColor: '#fee2e2',
    },
    {
      id: '4',
      title: 'Calculate',
      subtitle: 'Compare readings',
      icon: 'calculator',
      route: '/calculation',
      color: '#06b6d4',
      bgColor: '#cffafe',
    },
    {
      id: '5',
      title: 'Rates',
      subtitle: 'Manage rates',
      icon: 'tag-multiple',
      route: '/rateScreen',
      color: '#10b981',
      bgColor: '#d1fae5',
    },

  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >

        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>👋 Welcome Back</Text>
            <Text style={styles.title}>Meter Dashboard</Text>
            <Text style={styles.subtitle}>Manage all your meter readings in one place</Text>
          </View>
        </View>

        {/* Select Meter */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => setMeterModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="meter-electric" size={24} color="#4f46e5" />

            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>Selected Meter</Text>
              <Text style={styles.cardValue}>
                {selectedMeter?.meter_name || "Select a meter"}
              </Text>
            </View>

            <MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />
          </View>
        </TouchableOpacity>

        {/* STATS CARDS */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="meter-electric" size={24} color="#4f46e5" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{stats.meters}</Text>
              <Text style={styles.statLabel}>Total Active Meters</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="clipboard-text" size={24} color="#f59e0b" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{stats.readings}</Text>
              <Text style={styles.statLabel}>Total Readings</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="lightning-bolt" size={24} color="#ef4444" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{stats.usage}</Text>
              <Text style={styles.statLabel}>Units Used</Text>
            </View>
          </View>
        </View>

        {/* CHART */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>📊 Usage Trend</Text>
          <Text style={styles.chartSubtitle}>Last 6 months</Text>
          {chartData.datasets[0].data.some(val => val > 0) ? (
            <LineChart
              data={chartData}
              width={screenWidth - 80}
              height={220}
              chartConfig={{
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                color: () => '#4f46e5',
                labelColor: () => '#94a3b8',
                strokeWidth: 2,
                propsForDots: {
                  r: '5',
                  strokeWidth: '2',
                  stroke: '#4f46e5',
                  fill: '#fff',
                },
              }}
              bezier
              style={styles.chart}
            />
          ) : (
            <View style={styles.noChartData}>
              <Text style={styles.noChartDataText}>No data available yet</Text>
              <Text style={styles.noChartDataSubtext}>Capture readings to see usage trends</Text>
            </View>
          )}
        </View>

        {/* QUICK ACTIONS MENU */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <FlatList
            data={menu}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.menuGrid}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.menuCard}
                onPress={() => router.push(item.route)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: item.bgColor },
                  ]}
                >
                  <MaterialCommunityIcons name={item.icon} size={28} color={item.color} />
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* INFO CARD */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information" size={24} color="#4f46e5" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Pro Tip</Text>
            <Text style={styles.infoText}>
              Take clear meter photos for accurate readings and better tracking over time.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/capture')}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="camera-plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Meter Selection Modal */}
      <Modal visible={meterModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Meter</Text>
              <TouchableOpacity onPress={() => setMeterModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={metersData}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    selectedMeter?.id === item.id && styles.modalOptionSelected,
                  ]}
                  onPress={() => handleSelectMeter(item)}
                >
                  <View>
                    <Text style={styles.modalOptionName}>{item.meter_name}</Text>
                    <Text style={styles.modalOptionDetail}>{item.meter_number}</Text>
                  </View>
                  {selectedMeter?.id === item.id && (
                    <MaterialCommunityIcons name="check" size={24} color="#4f46e5" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  chartCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
    fontWeight: '600',
  },
  chart: {
    borderRadius: 12,
  },
  noChartData: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noChartDataText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  noChartDataSubtext: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  menuSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  menuGrid: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  menuCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '600',
  },
  infoCard: {
    marginHorizontal: 24,
    marginBottom: 100,
    backgroundColor: '#e0e7ff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4f46e5',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#4f46e5',
    lineHeight: 18,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  //new

  card: {
    backgroundColor: "#fff",
    padding: 16,
    margin: 16,
    borderRadius: 16,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardContent: {
    flex: 1,
    marginLeft: 12,
  },

  cardLabel: {
    fontSize: 12,
    color: "#6b7280",
  },

  cardValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalOptionSelected: {
    backgroundColor: '#e0e7ff',
  },
  modalOptionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  modalOptionDetail: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },

});

export default Home;
