import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { deleteMeterReading, getMeterReadingsWithMeterDetails } from '../utils/database';

const History = () => {
  const router = useRouter();
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadReadings = async () => {
    try {
      setLoading(true);
      const data = await getMeterReadingsWithMeterDetails();
      if (data && Array.isArray(data)) {
        setReadings(data);
      }
    } catch (error) {
      console.error('Error loading readings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReadings();
    setRefreshing(false);
  };

  const handleDelete = (id, reading) => {
    Alert.alert(
      'Delete Reading',
      `Delete reading ${reading}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMeterReading(id);
              setReadings((prev) => prev.filter((item) => item.id !== id));
              Alert.alert('Success', 'Reading deleted successfully');
            } catch (error) {
              console.error('Error deleting reading:', error);
              Alert.alert('Error', 'Failed to delete reading');
            }
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      loadReadings();
    }, [])
  );

  const renderReadingItem = ({ item }) => (
    <View style={styles.readingCard}>
      <View style={styles.cardHeader}>

        <View style={styles.readingInfo}>
          <View style={styles.readingIconContainer}>
            <MaterialCommunityIcons name="counter" size={24} color="#4f46e5" />
          </View>
          <View>
            <Text style={styles.readingValue}>{item.meter_reading} units</Text>
            <Text style={styles.readingDate}>
              <MaterialCommunityIcons name="calendar" size={12} color="#94a3b8" /> {item.timestamp}
            </Text>
          </View>
        </View>

        <View style={styles.badge}>
          <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
        </View>
      </View>

      {item.notes && (
        <View style={styles.notesContainer}>
          <MaterialCommunityIcons name="note-text" size={16} color="#64748b" />
          <Text style={styles.notes}>{item.notes}</Text>
        </View>
      )}
      <View style={styles.imageContainer}>
        {item.image_uri && (
          <Image source={{ uri: item.image_uri }} style={styles.thumbnail} />
        )}
        <Text style={styles.meterNameBadgeOverlay}>
          {item.meter_name}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id, item.meter_reading)}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
        <Text style={styles.deleteButtonText}>Delete Reading</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && readings.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading meter readings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Reading History</Text>
        <Text style={styles.subtitle}>{readings.length} readings saved</Text>
      </View>

      {/* READINGS LIST */}
      {readings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emoji}>📭</Text>
          <Text style={styles.emptyText}>No readings yet</Text>
          <Text style={styles.emptySubtext}>
            Capture your first meter reading to get started
          </Text>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={() => router.push('/capture')}
          >
            <MaterialCommunityIcons name="camera-plus" size={20} color="#fff" />
            <Text style={styles.captureButtonText}>Capture Reading</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={readings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderReadingItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* STATS CARD */}
      {readings.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Latest Reading</Text>
            <Text style={styles.statValue}>{readings[0]?.meter_reading || '—'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Readings</Text>
            <Text style={styles.statValue}>{readings.length}</Text>
          </View>
          {/* {readings.length > 1 && (
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Usage</Text>
              <Text style={styles.statValue}>
                {(parseFloat(readings[0]?.meter_reading || 0) - parseFloat(readings[readings.length - 1]?.meter_reading || 0)).toFixed(2)}
              </Text>
            </View>
          )} */}
        </View>
      )}

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity
        style={[
          styles.fab,
          readings.length > 0 ? styles.fabWithStats : styles.fabDefault
        ]}
        onPress={() => router.push('/capture')}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    paddingBottom: 200,
  },
  readingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#4f46e5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  readingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  readingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  readingValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  readingDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '600',
  },
  badge: {
    width: 40,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  notes: {
    marginLeft: 8,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    lineHeight: 16,
    flex: 1,
  },
  thumbnail: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#e2e8f0',
  },
  deleteButton: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  captureButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },

  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  fabWithStats: {
    bottom: 120,
  },
  fabDefault: {
    bottom: 30,
  },

  imageContainer: {
    position: "relative",
    marginTop: 10,
  },

  meterNameBadgeOverlay: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(79, 70, 229, 0.9)",
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },

});

export default History;
