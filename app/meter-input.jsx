import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { saveMeterReading } from '../utils/database';

const MeterInput = () => {
  const router = useRouter();
  const { imageUri, meter_id } = useLocalSearchParams();
  const [meterReading, setMeterReading] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!meterReading.trim()) {
      Alert.alert('Missing Information', 'Please enter a meter reading');
      return;
    }

    if (isNaN(parseFloat(meterReading))) {
      Alert.alert('Invalid Input', 'Meter reading must be a valid number');
      return;
    }

    if (!meter_id) {
      Alert.alert('Error', 'Meter not selected');
      return;
    }

    setLoading(true);
    try {
      const timestamp = new Date().toLocaleString();
      await saveMeterReading(
        parseInt(meter_id),
        imageUri,
        parseFloat(meterReading),
        timestamp,
        notes.trim()
      );

      Alert.alert('Success', 'Meter reading saved successfully!', [
        {
          text: 'OK',
          onPress: () => {
            router.push('/history');
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving reading:', error);
      Alert.alert('Error', 'Failed to save meter reading. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.emoji}>📝</Text>
            <Text style={styles.title}>Enter Meter Reading</Text>
            <Text style={styles.subtitle}>Record the value shown on your meter display</Text>
          </View>

          {/* IMAGE PREVIEW */}
          {imageUri && (
            <View style={styles.imageCard}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <View style={styles.imageLabel}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#10b981" />
                <Text style={styles.imageLabelText}>Image selected</Text>
              </View>
            </View>
          )}

          {/* FORM CARD */}
          <View style={styles.formCard}>
            {/* Meter Reading Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Meter Reading *</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="counter" size={20} color="#4f46e5" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 12345.67"
                  placeholderTextColor="#9ca3af"
                  value={meterReading}
                  onChangeText={setMeterReading}
                  keyboardType="decimal-pad"
                  editable={!loading}
                />
                <Text style={styles.unit}>units</Text>
              </View>
            </View>

            {/* Notes Input */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Notes</Text>
                <Text style={styles.optional}>(Optional)</Text>
              </View>
              <View style={styles.textAreaWrapper}>
                <MaterialCommunityIcons name="note-text" size={20} color="#4f46e5" style={styles.textAreaIcon} />
                <TextInput
                  style={styles.textArea}
                  placeholder="Add any notes about this reading..."
                  placeholderTextColor="#9ca3af"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  editable={!loading}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* INFO BOX */}
            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information-outline" size={20} color="#4f46e5" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>📅 Timestamp</Text>
                <Text style={styles.infoText}>
                  Automatically recorded as {new Date().toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* ACTION BUTTONS */}
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleCancel}
            disabled={loading}
          >
            <MaterialCommunityIcons name="close" size={20} color="#ef4444" />
            <Text style={styles.buttonTextSecondary}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={20} color="#fff" />
                <Text style={styles.buttonText}>Save Reading</Text>
              </>
            )}
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
    marginBottom: 24,
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
  imageCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imagePreview: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
    backgroundColor: '#e2e8f0',
  },
  imageLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#d1fae5',
  },
  imageLabelText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  formCard: {
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  optional: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
    fontStyle: 'italic',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  unit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 8,
  },
  textAreaWrapper: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingLeft: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 100,
  },
  textAreaIcon: {
    marginTop: 12,
  },
  textArea: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 12,
    paddingRight: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  infoBox: {
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 10,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 12,
    color: '#4f46e5',
    lineHeight: 16,
    fontWeight: '500',
  },
  footerButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 60,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  buttonPrimary: {
    backgroundColor: '#4f46e5',
  },
  buttonSecondary: {
    backgroundColor: '#fee2e2',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonTextSecondary: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default MeterInput;
