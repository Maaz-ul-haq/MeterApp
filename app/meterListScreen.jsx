import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getMeters, deleteMeter, toggleMeterActive } from '../utils/database';

const MeterListScreen = () => {
  const router = useRouter();
  const [meters, setMeters] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMeters = async () => {
    try {
      setLoading(true);
      const data = await getMeters();
      setMeters(data || []);
    } catch (error) {
      console.error('Error loading meters:', error);
      Alert.alert('Error', 'Failed to load meters');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMeters();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadMeters();
    }, [])
  );

  const handleToggleActive = async (id) => {
    try {
      await toggleMeterActive(id);
      loadMeters();
    } catch (error) {
      Alert.alert("Error", "Could not update status");
      console.error(error);
    }
  };

  const handleEdit = async (meter) => {

    try {
      router.push({
        pathname: '/addMeterScreen',
        params: {
          id: meter.id, // Passing ID triggers "Edit Mode"
          meter_name: meter.meter_name,
          meter_number: meter.meter_number,
          location: meter.location,
        },
      });
    } catch (error) {
      console.error('Error Editing meter:', error);
      Alert.alert('Error', 'Failed to Edit meter');
    }
  };
  const handleDelete = (id, meterName) => {
    Alert.alert(
      'Delete Meter',
      `Are you sure you want to delete "${meterName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMeter(id);
              setMeters(prev => prev.filter(m => m.id !== id));
              Alert.alert('Success', 'Meter deleted successfully');
            } catch (error) {
              console.error('Error deleting meter:', error);
              Alert.alert('Error', 'Failed to delete meter');
            }
          },
        },
      ]
    );
  };

  const filteredMeters = meters.filter((m) =>
    m.meter_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && meters.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading meters...</Text>
      </View>
    );
  }

  const renderItem = ({ item, index }) => (
    <View style={styles.meterCard}>
      <View style={styles.cardLeft}>
        {/* Visual indicator for status*/}
        <View style={[
          styles.iconContainer,
          { backgroundColor: item.is_active ? '#e0e7ff' : '#f1f5f9' }
        ]}>
          <MaterialCommunityIcons
            name="meter-electric"
            size={24}
            color={item.is_active ? "#4f46e5" : "#94a3b8"}
          />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.meterName, !item.is_active && { color: '#94a3b8' }]}>
            {item.meter_name} {!item.is_active && '(Inactive)'}
          </Text>
          <Text style={styles.meterNumber}>
            <MaterialCommunityIcons name="barcode" size={12} color="#94a3b8" /> {item.meter_number}
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        {/* Toggle Button */}
        <TouchableOpacity
          style={[styles.actionBtn, item.is_active ? styles.activeBtn : styles.inactiveBtn]}
          onPress={() => handleToggleActive(item.id)}
        >
          <MaterialCommunityIcons
            name={item.is_active ? "eye" : "eye-off"}
            size={16}
            color={item.is_active ? "#10b981" : "#64748b"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => handleEdit(item)}
        >
          <MaterialCommunityIcons name="pencil" size={16} color="#3b82f6" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDelete(item.id, item.meter_name)}
        >
          <MaterialCommunityIcons name="trash-can" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Meters</Text>
        <Text style={styles.subtitle}>Manage all registered meters</Text>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search meters..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialCommunityIcons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* METERS LIST */}
      {filteredMeters.length > 0 ? (
        <FlatList
          data={filteredMeters}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emoji}>📭</Text>
          <Text style={styles.emptyText}>
            {meters.length === 0 ? 'No meters added yet' : 'No meters found'}
          </Text>
          <Text style={styles.emptySubtext}>
            {meters.length === 0
              ? 'Add your first meter to get started'
              : 'Try a different search term'}
          </Text>
          {meters.length === 0 && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/addMeterScreen')}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add First Meter</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* STATS FOOTER */}
      {filteredMeters.length > 0 && (
        <View style={styles.statsFooter}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Meters</Text>
            <Text style={styles.statValue}>{filteredMeters.length}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Active</Text>
            <Text style={styles.statValue}>{filteredMeters.filter(m => m.is_active === 1).length}</Text>
          </View>
        </View>
      )}

      {/* FLOATING ADD BUTTON */}
      <TouchableOpacity
        style={[styles.fab, filteredMeters.length > 0 ? styles.fabWithStats : styles.fabDefault]}
        onPress={() => router.push('/addMeterScreen')}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    height: 48,
    marginHorizontal: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  meterCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  meterName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  meterNumber: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#dbeafe',
  },
  deleteBtn: {
    backgroundColor: '#fee2e2',
  },
  emptyState: {
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
  addButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  statsFooter: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e2e8f0',
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

  activeBtn: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  inactiveBtn: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,

  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
});

export default MeterListScreen;
