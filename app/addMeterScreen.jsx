import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { addMeter, updateMeter } from '../utils/database';

const addMeterScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isEditing = !!params.id;

  const [meterName, setMeterName] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (isEditing) {
      setMeterName(params.meter_name || '');
      setMeterNumber(params.meter_number || '');
      setLocation(params.location || '');
    }
  }, []);

  const handleSave = async () => {
    if (!meterName.trim()) {
      Alert.alert('Validation Error', 'Meter name is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        meter_name: meterName.trim(),
        meter_number: meterNumber.trim(),
        location: location.trim(),
        is_active: 1,
      };

      if (isEditing) {
        // Edit existing meter
        await updateMeter(params.id, payload);
        Alert.alert('Success', 'Meter updated successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        // Add new meter
        await addMeter(payload);
        Alert.alert('Success', 'Meter added successfully', [
          {
            text: 'OK',
            onPress: () => {
              setMeterName('');
              setMeterNumber('');
              setLocation('');
              router.push('/meterListScreen');
            },
          },
        ]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'save'} meter`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent}>

          <View style={styles.header}>
            <Text style={styles.emoji}>{isEditing ? '📝' : '⚡'}</Text>
            <Text style={styles.title}>{isEditing ? 'Edit Meter' : 'Add New Meter'}</Text>
            <Text style={styles.subtitle}>
              {isEditing ? 'Modify the details of your meter' : 'Register a new meter device to track usage'}
            </Text>
          </View>

          <View style={styles.card}>
            {/* Meter Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Meter Name *</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="meter-electric" size={20} color="#4f46e5" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Home Main Meter"
                  value={meterName}
                  onChangeText={setMeterName}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Meter Number */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Meter Number</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="barcode" size={20} color="#f59e0b" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 123456789"
                  value={meterNumber}
                  onChangeText={setMeterNumber}
                  keyboardType="number-pad"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Location */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="map-marker" size={20} color="#ef4444" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Karachi, House"
                  value={location}
                  onChangeText={setLocation}
                  editable={!loading}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => router.back()}
            disabled={loading}
          >
            <MaterialCommunityIcons name="close" size={20} color="#4f46e5" />
            <Text style={styles.buttonTextSecondary}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <MaterialCommunityIcons name="check" size={20} color="#fff" />
            <Text style={styles.buttonText}>
              {loading ? 'Saving...' : isEditing ? 'Update Meter' : 'Add Meter'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  input: {
    flex: 1,
    height: 48,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  infoBox: {
    backgroundColor: '#e0e7ff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 100,
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
  footerButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 60,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: '#4f46e5',
  },
  buttonSecondary: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonTextSecondary: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default addMeterScreen;
