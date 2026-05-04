import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  FlatList,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { pickImageFromCamera, pickImageFromGallery } from '../utils/imagePicker';
import { getMeters } from '../utils/database';

const CaptureImage = () => {
  const router = useRouter();
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [meters, setMeters] = useState([]);
  const [selectedMeter, setSelectedMeter] = useState(null);
  const [showMeterModal, setShowMeterModal] = useState(false);

  const loadMeters = async () => {
    try {
      const data = await getMeters();
      setMeters(data || []);
      if (data && data.length > 0) {
        setSelectedMeter(data[0]);
      }
    } catch (error) {
      console.error('Error loading meters:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMeters();
    }, [])
  );

  const handleTakePhoto = async () => {
    setLoading(true);
    try {
      const result = await pickImageFromCamera();
      if (result.success) {
        setImageUri(result.uri);
      } else {
        Alert.alert('Camera Error', result.error || 'Failed to capture photo');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePickGallery = async () => {
    setLoading(true);
    try {
      const result = await pickImageFromGallery();
      if (result.success) {
        setImageUri(result.uri);
      } else {
        Alert.alert('Gallery Error', result.error || 'Failed to pick image');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!imageUri) {
      Alert.alert('No Image', 'Please capture or select an image first.');
      return;
    }
    if (!selectedMeter) {
      Alert.alert('No Meter', 'Please select a meter first.');
      return;
    }
    router.push({
      pathname: '/meter-input',
      params: { imageUri, meter_id: selectedMeter.id.toString() },
    });
  };

  const handleClear = () => {
    setImageUri(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.emoji}>📸</Text>
          <Text style={styles.title}>Capture Meter Reading</Text>
          <Text style={styles.subtitle}>
            Take a clear photo of your meter display to record the reading
          </Text>
        </View>

        {/* METER SELECTOR */}
        {meters.length > 0 && (
          <TouchableOpacity
            style={styles.meterSelector}
            onPress={() => setShowMeterModal(true)}
          >
            <MaterialCommunityIcons name="meter-electric" size={24} color="#4f46e5" />
            <View style={styles.meterSelectorContent}>
              <Text style={styles.meterSelectorLabel}>Selected Meter</Text>
              <Text style={styles.meterSelectorValue}>{selectedMeter?.meter_name}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={24} color="#94a3b8" />
          </TouchableOpacity>
        )}

        {/* METER SELECTION MODAL */}
        <Modal visible={showMeterModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Meter</Text>
                <TouchableOpacity onPress={() => setShowMeterModal(false)}>
                  <MaterialCommunityIcons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={meters}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.meterOption,
                      selectedMeter?.id === item.id && styles.meterOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedMeter(item);
                      setShowMeterModal(false);
                    }}
                  >
                    <View>
                      <Text style={styles.meterOptionName}>{item.meter_name}</Text>
                      <Text style={styles.meterOptionNumber}>{item.meter_number}</Text>
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

        {/* IMAGE PREVIEW OR BUTTONS */}
        {imageUri ? (
          <View style={styles.previewCard}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            <View style={styles.previewInfo}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#10b981" />
              <Text style={styles.previewText}>Image captured successfully</Text>
            </View>
          </View>
        ) : (
          <View style={styles.optionsCard}>
            <View style={styles.optionSeparator}>
              <Text style={styles.separatorText}>Choose Image Source</Text>
            </View>

            <TouchableOpacity
              style={[styles.optionButton, styles.cameraButton]}
              onPress={handleTakePhoto}
              disabled={loading}
            >
              <View style={styles.optionIconContainer}>
                <MaterialCommunityIcons name="camera" size={32} color="#fff" />
              </View>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.optionTitle}>Take Photo</Text>
                  <Text style={styles.optionSubtitle}>Use device camera</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.buttonDivider} />

            <TouchableOpacity
              style={[styles.optionButton, styles.galleryButton]}
              onPress={handlePickGallery}
              disabled={loading}
            >
              <View style={styles.optionIconContainer}>
                <MaterialCommunityIcons name="image" size={32} color="#fff" />
              </View>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.optionTitle}>Pick from Gallery</Text>
                  <Text style={styles.optionSubtitle}>Choose existing photo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* INFO TIPS */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Tips for Best Results</Text>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="check" size={16} color="#10b981" />
            <Text style={styles.tipText}>Ensure good lighting and clear visibility</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="check" size={16} color="#10b981" />
            <Text style={styles.tipText}>Hold camera steady and take from front</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="check" size={16} color="#10b981" />
            <Text style={styles.tipText}>Avoid glare and shadows on display</Text>
          </View>
        </View>
      </ScrollView>

      {/* ACTION BUTTONS */}
      <View style={styles.footer}>
        {imageUri && (
          <>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleClear}
              disabled={loading}
            >
              <MaterialCommunityIcons name="trash-can" size={20} color="#ef4444" />
              <Text style={styles.buttonTextSecondary}>Discard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleNext}
              disabled={loading}
            >
              <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {!imageUri && (
          <TouchableOpacity
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push('/history')}
          >
            <MaterialCommunityIcons name="history" size={20} color="#4f46e5" />
            <Text style={styles.buttonTextOutline}>View History</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  meterSelector: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  meterSelectorContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  meterSelectorLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 4,
  },
  meterSelectorValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  meterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  meterOptionSelected: {
    backgroundColor: '#e0e7ff',
  },
  meterOptionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  meterOptionNumber: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  preview: {
    width: '100%',
    height: 350,
    resizeMode: 'cover',
    backgroundColor: '#f1f5f9',
  },
  previewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#d1fae5',
  },
  previewText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  optionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  optionSeparator: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  separatorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  optionButton: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cameraButton: {
    backgroundColor: '#4f46e5',
  },
  galleryButton: {
    backgroundColor: '#06b6d4',
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  optionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  buttonDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  tipsCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 100,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
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
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: '#4f46e5',
  },
  buttonSecondary: {
    backgroundColor: '#fee2e2',
  },
  buttonOutline: {
    borderWidth: 2,
    borderColor: '#4f46e5',
    backgroundColor: 'transparent',
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
  buttonTextOutline: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default CaptureImage;
