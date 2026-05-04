import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getMeterReadingsByMeterId, getMeters, getRates } from '../utils/database';

const Calculation = () => {
  const [meters, setMeters] = useState([]);
  const [readings, setReadings] = useState([]);
  const [rates, setRates] = useState([]);
  const [selectedMeter, setSelectedMeter] = useState(null);
  const [selectedRate, setSelectedRate] = useState(null);
  const [meterModalVisible, setMeterModalVisible] = useState(false);
  const [readingsModalVisible, setReadingsModalVisible] = useState(false);
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [fromReading, setFromReading] = useState(null);
  const [toReading, setToReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [readingType, setReadingType] = useState('from');
  const [calculation, setCalculation] = useState(null);
  const [salesTax, setSalesTax] = useState('');
  const loadData = async () => {
    try {
      setLoading(true);
      const [meterData, rateData] = await Promise.all([getMeters(), getRates()]);
      setMeters(meterData || []);
      const activeRates = (rateData || []).filter((r) => r.is_active === 1);
      setRates(activeRates);
      // Auto-select first active rate
      if (activeRates.length > 0 && !selectedRate) {
        setSelectedRate(activeRates[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadReadingsForMeter = async (meterId) => {
    try {
      const data = await getMeterReadingsByMeterId(meterId);
      setReadings(data || []);
    } catch (error) {
      console.error('Error loading readings:', error);
      Alert.alert('Error', 'Failed to load readings');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleSelectMeter = async (meter) => {
    setSelectedMeter(meter);
    await loadReadingsForMeter(meter.id);
    setMeterModalVisible(false);
    setFromReading(null);
    setToReading(null);
    setCalculation(null);
  };

  const handleSelectReading = (reading) => {
    if (readingType === 'from') {
      setFromReading(reading);
    } else {
      setToReading(reading);
    }
    setReadingsModalVisible(false);
  };

  const handleSelectRate = (rate) => {
    setSelectedRate(rate);
    setRateModalVisible(false);
    setCalculation(null); // reset result when rate changes
  };

  const calculateUsage = () => {
    if (!fromReading || !toReading) {
      Alert.alert('Error', 'Please select both readings');
      return;
    }

    const fromValue = parseFloat(fromReading.meter_reading);
    const toValue = parseFloat(toReading.meter_reading);
    const usage = toValue - fromValue;

    const fromDate = new Date(fromReading.created_at);
    const toDate = new Date(toReading.created_at);
    const days = Math.floor((toDate - fromDate) / (1000 * 60 * 60 * 24));
    const dailyAverage = days > 0 ? (usage / days).toFixed(2) : 0;

    const pricePerUnit = selectedRate ? parseFloat(selectedRate.price_per_unit) : null;
    const totalCost = pricePerUnit != null ? (usage * pricePerUnit).toFixed(2) : null;
    const taxAmount = totalCost * (parseFloat(salesTax || 0) / 100);

   const finalTotal = Number(totalCost || 0) + Number(taxAmount || 0);
    setCalculation({
      usage: usage.toFixed(2),
      fromValue: fromValue.toFixed(2),
      toValue: toValue.toFixed(2),
      days,
      dailyAverage,
      fromDate: fromDate.toLocaleDateString(),
      toDate: toDate.toLocaleDateString(),
      pricePerUnit,
      totalCost,
      taxAmount,
      finalTotal,
      rateLabel: selectedRate?.label || null,
    });
  };

  const resetCalculation = () => {
    setFromReading(null);
    setToReading(null);
    setCalculation(null);
  };

  if (loading && meters.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🧮</Text>
          <Text style={styles.title}>Usage Calculator</Text>
          <Text style={styles.subtitle}>Calculate usage between two meter readings</Text>
        </View>

        {/* METER SELECTOR */}
        <TouchableOpacity style={styles.card} onPress={() => setMeterModalVisible(true)}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="meter-electric" size={24} color="#4f46e5" />
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>Selected Meter</Text>
              <Text style={styles.cardValue}>{selectedMeter?.meter_name || 'Select a meter'}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />
          </View>
        </TouchableOpacity>

        {/* RATE SELECTOR */}
        <TouchableOpacity
          style={[styles.card, rates.length === 0 && styles.cardDisabled]}
          onPress={() => rates.length > 0 && setRateModalVisible(true)}
        >
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ marginLeft: 6, fontWeight: '600', color: '#01ce20' }}>PKR</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>Rate (per unit)</Text>
              {rates.length === 0 ? (
                <Text style={styles.cardValueMuted}>No active rates — add in Settings</Text>
              ) : (
                <Text style={styles.cardValue}>
                  {selectedRate
                    ? `${selectedRate.label}  •  ${selectedRate.price_per_unit} / unit`
                    : 'Select a rate'}
                </Text>
              )}
            </View>
            {rates.length > 0 && (
              <MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Sales Tax (%)</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="percent" size={20} color="#4f46e5" />
            <TextInput
              style={styles.input}
              placeholder="e.g., 17"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={salesTax}
              onChangeText={setSalesTax}
            />
          </View>
        </View>

        {selectedMeter && readings.length > 0 && (
          <>
            {/* READING SELECTORS */}
            <View style={styles.readingsContainer}>
              {/* From Reading */}
              <TouchableOpacity
                style={styles.readingCard}
                onPress={() => {
                  setReadingType('from');
                  setReadingsModalVisible(true);
                }}
              >
                <View style={styles.readingHeader}>
                  <Text style={styles.readingLabel}>From Reading</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color="#94a3b8" />
                </View>
                {fromReading ? (
                  <View style={styles.readingInfo}>
                    <Text style={styles.readingValue}>{fromReading.meter_reading}</Text>
                    <Text style={styles.readingDate}>
                      {new Date(fromReading.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Select starting reading</Text>
                )}
              </TouchableOpacity>

              <View style={styles.arrowContainer}>
                <MaterialCommunityIcons name="arrow-down" size={32} color="#4f46e5" />
              </View>

              <TouchableOpacity
                style={styles.readingCard}
                onPress={() => {
                  setReadingType('to');
                  setReadingsModalVisible(true);
                }}
              >
                <View style={styles.readingHeader}>
                  <Text style={styles.readingLabel}>To Reading</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color="#94a3b8" />
                </View>
                {toReading ? (
                  <View style={styles.readingInfo}>
                    <Text style={styles.readingValue}>{toReading.meter_reading}</Text>
                    <Text style={styles.readingDate}>
                      {new Date(toReading.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Select ending reading</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* CALCULATION BUTTON */}
            {fromReading && toReading && !calculation && (
              <TouchableOpacity style={styles.calculateButton} onPress={calculateUsage}>
                <MaterialCommunityIcons name="calculator" size={20} color="#fff" />
                <Text style={styles.calculateButtonText}>Calculate Usage</Text>
              </TouchableOpacity>
            )}

            {/* CALCULATION RESULTS */}
            {calculation && (
              <View style={styles.resultContainer}>
                <View style={styles.resultCard}>
                  <Text style={styles.resultTitle}>📊 Calculation Results</Text>

                  {/* Main Result */}
                  <View style={styles.mainResult}>
                    <Text style={styles.mainResultLabel}>Total Usage</Text>
                    <Text style={styles.mainResultValue}>{calculation.usage}</Text>
                    <Text style={styles.mainResultUnit}>units</Text>
                  </View>

                  {/* Details Grid */}
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Starting Reading</Text>
                      <Text style={styles.detailValue}>{calculation.fromValue}</Text>
                      <Text style={styles.detailDate}>{calculation.fromDate}</Text>
                    </View>
                    <View style={styles.detailDivider} />
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Ending Reading</Text>
                      <Text style={styles.detailValue}>{calculation.toValue}</Text>
                      <Text style={styles.detailDate}>{calculation.toDate}</Text>
                    </View>
                  </View>

                  {/* Time Period */}
                  <View style={styles.periodCard}>
                    <MaterialCommunityIcons name="calendar-range" size={20} color="#4f46e5" />
                    <View style={styles.periodContent}>
                      <Text style={styles.periodLabel}>Time Period</Text>
                      <Text style={styles.periodValue}>{calculation.days} days</Text>
                    </View>
                  </View>

                  {/* Daily Average */}
                  <View style={[styles.averageCard, { marginBottom: calculation.totalCost != null ? 12 : 0 }]}>
                    <MaterialCommunityIcons name="chart-line" size={20} color="#10b981" />
                    <View style={styles.averageContent}>
                      <Text style={styles.averageLabel}>Daily Average</Text>
                      <Text style={styles.averageValue}>{calculation.dailyAverage} units/day</Text>
                    </View>
                  </View>

                  {/* Total Cost shown only if a rate was selected */}
                  {calculation.totalCost != null && (
                    <View style={styles.costCard}>
                      <MaterialCommunityIcons name="cash-multiple" size={22} color="#f59e0b" />
                      <View style={styles.costContent}>
                        <View style={styles.costTopRow}>
                          <Text style={styles.costLabel}>Estimated Cost</Text>
                          {calculation.rateLabel && (
                            <View style={styles.rateBadge}>
                              <Text style={styles.rateBadgeText}>{calculation.rateLabel}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.costValue}>PKR {calculation.totalCost}</Text>
                        <Text style={styles.costBreakdown}>
                          {calculation.usage} units × {calculation.pricePerUnit} / unit
                        </Text>
                      </View>
                    </View>
                  )}

                  {calculation.totalCost != null && (
                    <View style={styles.taxCard}>

                      <View style={styles.taxRow}>
                        <Text style={styles.taxLabel}>Sales Tax ({salesTax || 0}%)</Text>
                        <Text style={styles.taxValue}>
                          + PKR {calculation.taxAmount}
                        </Text>
                      </View>

                      <View style={styles.taxDivider} />

                      <View style={styles.taxRow}>
                        <Text style={styles.finalLabel}>Final Total</Text>
                        <Text style={styles.finalValue}>
                          PKR   {(Number(calculation?.finalTotal) || 0).toFixed(2)}
                        </Text>
                      </View>

                    </View>
                  )}

                  {calculation.totalCost == null && (
                    <View style={styles.noRateHint}>
                      <MaterialCommunityIcons name="information-outline" size={16} color="#94a3b8" />
                      <Text style={styles.noRateHintText}>
                        Select a rate above to see estimated cost
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={resetCalculation}
                  >
                    <MaterialCommunityIcons name="refresh" size={20} color="#4f46e5" />
                    <Text style={styles.buttonTextSecondary}>New Calculation</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {selectedMeter && readings.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emoji}>📭</Text>
            <Text style={styles.emptyText}>No readings for this meter</Text>
            <Text style={styles.emptySubtext}>Capture meter readings to get started</Text>
          </View>
        )}

        {!selectedMeter && meters.length > 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emoji}>⚡</Text>
            <Text style={styles.emptyText}>Select a meter to begin</Text>
            <Text style={styles.emptySubtext}>Choose a meter and compare readings</Text>
          </View>
        )}

        {meters.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emoji}>🔧</Text>
            <Text style={styles.emptyText}>No meters available</Text>
            <Text style={styles.emptySubtext}>Create a meter first from the dashboard</Text>
          </View>
        )}
      </ScrollView>

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
              data={meters}
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

      {/* Rate Selection Modal */}
      <Modal visible={rateModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Rate</Text>
              <TouchableOpacity onPress={() => setRateModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={rates}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    selectedRate?.id === item.id && styles.modalOptionSelected,
                  ]}
                  onPress={() => handleSelectRate(item)}
                >
                  <View>
                    <Text style={styles.modalOptionName}>{item.label}</Text>
                    <Text style={styles.modalOptionDetail}>
                      PKR {parseFloat(item.price_per_unit).toFixed(2)} per unit
                    </Text>
                  </View>
                  {selectedRate?.id === item.id && (
                    <MaterialCommunityIcons name="check" size={24} color="#10b981" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No active rates</Text>
                  <Text style={styles.emptySubtext}>Add rates in Settings</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Readings Selection Modal */}
      <Modal visible={readingsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {readingType === 'from' ? 'Select Starting Reading' : 'Select Ending Reading'}
              </Text>
              <TouchableOpacity onPress={() => setReadingsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={readings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    (readingType === 'from' ? fromReading?.id : toReading?.id) === item.id &&
                    styles.modalOptionSelected,
                  ]}
                  onPress={() => handleSelectReading(item)}
                >
                  <View>
                    <Text style={styles.modalOptionName}>{item.meter_reading} units</Text>
                    <Text style={styles.modalOptionDetail}>
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  {(readingType === 'from' ? fromReading?.id : toReading?.id) === item.id && (
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
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  cardValueMuted: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  readingsContainer: {
    marginBottom: 24,
    marginTop: 8,
    gap: 12,
  },
  readingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  readingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  readingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  readingInfo: {
    alignItems: 'center',
  },
  readingValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4f46e5',
  },
  readingDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  placeholderText: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    fontWeight: '600',
  },
  arrowContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  calculateButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resultContainer: {
    marginBottom: 40,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  mainResult: {
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4f46e5',
  },
  mainResultLabel: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '600',
    marginBottom: 4,
  },
  mainResultValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#4f46e5',
  },
  mainResultUnit: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '600',
    marginTop: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  detailDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  detailLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  detailDate: {
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 4,
  },
  periodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4f46e5',
  },
  periodContent: {
    flex: 1,
    marginLeft: 12,
  },
  periodLabel: {
    fontSize: 11,
    color: '#4f46e5',
    fontWeight: '600',
  },
  periodValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4f46e5',
    marginTop: 2,
  },
  averageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  averageContent: {
    flex: 1,
    marginLeft: 12,
  },
  averageLabel: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  averageValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  // ── Cost card ──────────────────────────────────────────
  costCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    marginTop: 12,
  },
  costContent: {
    flex: 1,
    marginLeft: 12,
  },
  costTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  costLabel: {
    fontSize: 11,
    color: '#b45309',
    fontWeight: '600',
  },
  rateBadge: {
    backgroundColor: '#fde68a',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rateBadgeText: {
    fontSize: 10,
    color: '#92400e',
    fontWeight: '700',
  },
  costValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#b45309',
  },
  costBreakdown: {
    fontSize: 11,
    color: '#d97706',
    marginTop: 4,
    fontWeight: '500',
  },
  noRateHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  noRateHintText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  actionButtons: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonSecondary: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  buttonTextSecondary: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
  formGroup: {
    marginBottom: 16,
  },

  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 6,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },

  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#111827",
  },
  taxCard: {
    marginTop: 12,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  taxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },

  taxLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },

  taxValue: {
    fontSize: 13,
    color: "#ef4444",
    fontWeight: "600",
  },

  taxDivider: {
    height: 1,
    backgroundColor: "#00050e",
    marginVertical: 10,
  },

  finalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  finalValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#10b981",
  },
});

export default Calculation;