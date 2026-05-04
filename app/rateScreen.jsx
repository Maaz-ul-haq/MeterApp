import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { addRate, deleteRate, getMeterReadings, getRates, updateRate, getMeters } from '../utils/database';

const RateScreen = () => {
  // Rates Tab State
  const [rates, setRates] = useState([]);
  const [activeTab, setActiveTab] = useState('rates');
  const [modalVisible, setModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [rateLabel, setRateLabel] = useState('');
  const [ratePrice, setRatePrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [dateType, setDateType] = useState('from');
  const [meterModalVisible, setMeterModalVisible] = useState(false);
  const [rateModalVisible, setRateModalVisible] = useState(false);

  // Monthly Analysis State
  const [meters, setMeters] = useState([]);
  const [meterReadings, setMeterReadings] = useState([]);
  const [selectedMeterId, setSelectedMeterId] = useState(null);
  const [selectedRate, setSelectedRate] = useState(null);
  const [salesTax, setSalesTax] = useState('0');
  const [fromDate, setFromDate] = useState(getDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [toDate, setToDate] = useState(getDateString(new Date()));
  const [monthlyData, setMonthlyData] = useState([]);

  // Month/Year Picker State
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  function getDateString(date) {
    return date.toISOString().split('T')[0];
  }

  const loadRates = async () => {
    try {
      setLoading(true);
      const data = await getRates();
      setRates(data || []);
    } catch (error) {
      console.error('Error loading rates:', error);
      Alert.alert('Error', 'Failed to load rates');
    } finally {
      setLoading(false);
    }
  };

  const loadReadings = async () => {
    try {
      const data = await getMeterReadings();
      setMeterReadings(data || []);
    } catch (error) {
      console.error('Error loading readings:', error);
    }
  };

  const loadMeters = async () => {
    try {
      const data = await getMeters();
      setMeters(data || []);
      if (data && data.length > 0 && !selectedMeterId) {
        setSelectedMeterId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading meters:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRates();
      loadReadings();
      loadMeters();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const calculateMonthlyData = (readings, ratesList, start, end) => {
    if (!start || !end || !selectedMeterId || !selectedRate) return;

    const from = new Date(start);
    const to = new Date(end);

    const meterReadingsList = readings.filter(r => r.meter_id === selectedMeterId);

    const monthly = {};

    const sortedReadings = [...meterReadingsList].sort((a, b) =>
      new Date(a.created_at || a.timestamp) - new Date(b.created_at || b.timestamp)
    );

    sortedReadings.forEach((reading) => {
      const readDate = new Date(reading.created_at || reading.timestamp);
      if (readDate >= from && readDate <= to) {
        const monthKey = `${readDate.getFullYear()}-${String(readDate.getMonth() + 1).padStart(2, '0')}`;
        if (!monthly[monthKey]) {
          monthly[monthKey] = { readings: [] };
        }
        monthly[monthKey].readings.push(reading);
      }
    });

    const result = Object.entries(monthly).map(([monthKey, data]) => {
      const sortedMonthReadings = data.readings.sort((a, b) =>
        new Date(a.created_at || a.timestamp) - new Date(b.created_at || b.timestamp)
      );

      const startingReading = sortedMonthReadings[0]?.meter_reading || 0;
      const endingReading = sortedMonthReadings[sortedMonthReadings.length - 1]?.meter_reading || 0;
      const totalUnits = endingReading - startingReading;

      const rateObj = ratesList.find(r => r.id === selectedRate);
      const pricePerUnit = rateObj ? parseFloat(rateObj.price_per_unit) : 0;
      const taxRate = parseFloat(salesTax) / 100;
      const subtotal = totalUnits * pricePerUnit;
      const tax = subtotal * taxRate;
      const totalAmount = subtotal + tax;

      return {
        month: monthKey,
        monthName: new Date(`${monthKey}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        startingReading: startingReading.toFixed(2),
        endingReading: endingReading.toFixed(2),
        totalUnits: totalUnits.toFixed(2),
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
      };
    });

    setMonthlyData(result.sort((a, b) => a.month.localeCompare(b.month)));
  };

  useEffect(() => {
    calculateMonthlyData(meterReadings, rates, fromDate, toDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, meterReadings, rates, selectedMeterId, selectedRate, salesTax]);

  const addRateHandler = async () => {
    if (!rateLabel || !ratePrice) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    try {
      if (editingId) {
        await updateRate(editingId, { label: rateLabel, price_per_unit: ratePrice, is_active: 1 });
        Alert.alert('Success', 'Rate updated successfully');
      } else {
        await addRate({ label: rateLabel, price_per_unit: ratePrice });
        Alert.alert('Success', 'Rate added successfully');
      }
      await loadRates();
      resetForm();
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving rate:', error);
      Alert.alert('Error', 'Failed to save rate');
    }
  };

  const deleteRateHandler = (id, label) => {
    Alert.alert('Delete Rate', `Are you sure you want to delete "${label}"?`, [
      { text: 'Cancel', onPress: () => { } },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await deleteRate(id);
            await loadRates();
            Alert.alert('Success', 'Rate deleted successfully');
          } catch (error) {
            console.error('Error deleting rate:', error);
            Alert.alert('Error', 'Failed to delete rate');
          }
        },
      },
    ]);
  };

  const editRateHandler = (rate) => {
    setEditingId(rate.id);
    setRateLabel(rate.label);
    setRatePrice(rate.price_per_unit.toString());
    setModalVisible(true);
  };

  const resetForm = () => {
    setRateLabel('');
    setRatePrice('');
    setEditingId(null);
  };

  const handleMonthSelect = (month) => {
    const selectedDate = new Date(calendarYear, month, 1);
    if (dateType === 'from') {
      setFromDate(getDateString(selectedDate));
    } else {
      const lastDay = new Date(calendarYear, month + 1, 0);
      setToDate(getDateString(lastDay));
    }
    setCalendarVisible(false);
  };

  const handleYearChange = (direction) => {
    if (direction === 'prev') {
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarYear(calendarYear + 1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rates' && styles.tabActive]}
          onPress={() => setActiveTab('rates')}
        >
          <MaterialCommunityIcons name="tag-multiple" size={20} color={activeTab === 'rates' ? '#4f46e5' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'rates' && styles.tabTextActive]}>Rates</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'analysis' && styles.tabActive]}
          onPress={() => setActiveTab('analysis')}
        >
          <MaterialCommunityIcons name="chart-line" size={20} color={activeTab === 'analysis' ? '#4f46e5' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'analysis' && styles.tabTextActive]}>Monthly Analysis</Text>
        </TouchableOpacity>
      </View>

      {/* RATES TAB */}
      {activeTab === 'rates' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.emoji}>💰</Text>
              <Text style={styles.title}>Manage Rates</Text>
              <Text style={styles.subtitle}>Add, edit, or delete unit rates for billing</Text>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4f46e5" />
              </View>
            ) : rates.length > 0 ? (
              <View style={styles.ratesList}>
                {rates.map((rate) => (
                  <View key={rate.id} style={styles.rateCard}>
                    <View style={styles.rateHeader}>
                      <View>
                        <Text style={styles.rateLabel}>{rate.label}</Text>
                        <Text style={styles.rateDate}>
                          Created: {new Date(rate.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={styles.ratePrice}>PKR {parseFloat(rate.price_per_unit).toFixed(2)}</Text>
                    </View>

                    <View style={styles.rateActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.editBtn]}
                        onPress={() => editRateHandler(rate)}
                      >
                        <MaterialCommunityIcons name="pencil" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => deleteRateHandler(rate.id, rate.label)}
                      >
                        <MaterialCommunityIcons name="trash-can" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emoji}>📋</Text>
                <Text style={styles.emptyText}>No rates added yet</Text>
              </View>
            )}
          </ScrollView>

          {/* Add Rate Button */}
          <View style={styles.floatingBtnContainer}>
            <TouchableOpacity
              style={styles.floatingBtn}
              onPress={() => {
                resetForm();
                setModalVisible(true);
              }}
            >
              <MaterialCommunityIcons name="plus" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* MONTHLY ANALYSIS TAB */}
      {activeTab === 'analysis' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.emoji}>📊</Text>
              <Text style={styles.title}>Monthly Analysis</Text>
              <Text style={styles.subtitle}>View units consumed and calculate costs</Text>
            </View>

            {/* Meter, Rate, and Tax Selection */}
            <View style={styles.filterSection}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Select Meter</Text>
                <TouchableOpacity
                  style={styles.dropdownWrapper}
                  onPress={() => setMeterModalVisible(true)}
                >
                  <MaterialCommunityIcons name="gauge" size={20} color="#4f46e5" />
                  <Text style={styles.dropdownText}>
                    {meters.find(m => m.id === selectedMeterId)?.meter_name || 'Choose a meter'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Select Rate</Text>
                <TouchableOpacity
                  style={styles.dropdownWrapper}
                  onPress={() => setRateModalVisible(true)}
                >
                  <MaterialCommunityIcons name="tag" size={20} color="#4f46e5" />
                  <Text style={styles.dropdownText}>
                    {rates.find(r => r.id === selectedRate)
                      ? `${rates.find(r => r.id === selectedRate).label} (PKR ${parseFloat(
                        rates.find(r => r.id === selectedRate).price_per_unit
                      ).toFixed(2)}/unit)`
                      : 'Choose a rate'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View style={[styles.filterGroup, { marginBottom: 0 }]}>
                <Text style={styles.filterLabel}>Sales Tax (%)</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="percent" size={20} color="#4f46e5" />
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                    value={salesTax}
                    onChangeText={setSalesTax}
                  />
                </View>
              </View>
            </View>

            {/* Date Range Filters with Calendar */}
            <View style={styles.filterSection}>
              <View style={styles.dateInputGroup}>
                <Text style={styles.filterLabel}>From Date</Text>
                <TouchableOpacity
                  style={styles.dateInputWrapper}
                  onPress={() => {
                    setDateType('from');
                    setCalendarVisible(true);
                  }}
                >
                  <MaterialCommunityIcons name="calendar-start" size={20} color="#4f46e5" />
                  <Text style={styles.dateInputText}>{fromDate}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View style={[styles.dateInputGroup, { marginBottom: 0 }]}>
                <Text style={styles.filterLabel}>To Date</Text>
                <TouchableOpacity
                  style={styles.dateInputWrapper}
                  onPress={() => {
                    setDateType('to');
                    setCalendarVisible(true);
                  }}
                >
                  <MaterialCommunityIcons name="calendar-end" size={20} color="#4f46e5" />
                  <Text style={styles.dateInputText}>{toDate}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Monthly Data Cards */}
            {monthlyData.length > 0 ? (
              <View>
                {monthlyData.map((item, index) => (
                  <View key={index} style={styles.monthCard}>
                    <View style={styles.monthHeader}>
                      <View>
                        <Text style={styles.monthName}>{item.monthName}</Text>
                        <Text style={styles.monthSubtext}>
                          {item.totalUnits} units consumed
                        </Text>
                      </View>
                      <View style={styles.amountBadge}>
                        <Text style={styles.amountText}>PKR {item.totalAmount}</Text>
                      </View>
                    </View>

                    <View style={styles.readingDetails}>
                      <View style={styles.readingRow}>
                        <Text style={styles.readingLabel}>Starting Reading</Text>
                        <Text style={styles.readingValue}>{item.startingReading}</Text>
                      </View>
                      <View style={[styles.readingRow, { marginBottom: 0 }]}>
                        <Text style={styles.readingLabel}>Ending Reading</Text>
                        <Text style={styles.readingValue}>{item.endingReading}</Text>
                      </View>
                    </View>

                    <View style={styles.monthStats}>
                      <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>Units Used</Text>
                          <Text style={styles.statValue}>{item.totalUnits}</Text>
                          <Text style={styles.statUnit}>units</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>Subtotal</Text>
                          <Text style={styles.statValue}>
                            <Text style={styles.statCurrency}>PKR </Text>
                            {item.subtotal}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>Tax</Text>
                          <Text style={styles.statValue}>
                            <Text style={styles.statCurrency}>PKR </Text>
                            {item.tax}
                          </Text>
                        </View>
                        <View style={[styles.statBox, styles.statBoxTotal]}>
                          <Text style={[styles.statLabel, styles.statLabelTotal]}>Total</Text>
                          <Text style={styles.statValueTotal}>
                            <Text style={styles.statCurrencyTotal}>PKR </Text>
                            {item.totalAmount}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

                {/* Summary Card */}
                {monthlyData.length > 0 && (
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Summary</Text>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Total Units:</Text>
                      <Text style={styles.summaryValue}>
                        {monthlyData.reduce((sum, m) => sum + parseFloat(m.totalUnits), 0).toFixed(2)} units
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Total Subtotal:</Text>
                      <Text style={styles.summaryValue}>
                        PKR {monthlyData.reduce((sum, m) => sum + parseFloat(m.subtotal), 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Total Tax:</Text>
                      <Text style={styles.summaryValue}>
                        PKR {monthlyData.reduce((sum, m) => sum + parseFloat(m.tax), 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                      <Text style={[styles.summaryLabel, styles.summaryLabelTotal]}>Total Cost:</Text>
                      <Text style={[styles.summaryValue, styles.summaryValueTotal]}>
                        PKR {monthlyData.reduce((sum, m) => sum + parseFloat(m.totalAmount), 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emoji}>📭</Text>
                <Text style={styles.emptyText}>No data found for the selected date range</Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Meter Selection Modal*/}
      <Modal visible={meterModalVisible} transparent animationType="slide" onRequestClose={() => setMeterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Meter</Text>
              <TouchableOpacity onPress={() => setMeterModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>

            {meters.length === 0 ? (
              <View style={styles.emptyPickerState}>
                <Text style={styles.emptyPickerText}>No meters available</Text>
              </View>
            ) : (
              <FlatList
                data={meters}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.pickerOption,
                      selectedMeterId === item.id && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedMeterId(item.id);
                      setMeterModalVisible(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <MaterialCommunityIcons
                        name="gauge"
                        size={20}
                        color={selectedMeterId === item.id ? '#1e40af' : '#94a3b8'}
                      />
                      <Text style={[
                        styles.pickerOptionText,
                        selectedMeterId === item.id && styles.pickerOptionTextSelected,
                      ]}>
                        {item.meter_name}
                      </Text>
                    </View>
                    {selectedMeterId === item.id && (
                      <MaterialCommunityIcons name="check" size={20} color="#1e40af" />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={() => setMeterModalVisible(false)}
              >
                <Text style={styles.btnTextSecondary}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rate Selection Modal */}
      <Modal visible={rateModalVisible} transparent animationType="slide" onRequestClose={() => setRateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Rate</Text>
              <TouchableOpacity onPress={() => setRateModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>

            {rates.length === 0 ? (
              <View style={styles.emptyPickerState}>
                <Text style={styles.emptyPickerText}>No rates available. Add a rate first.</Text>
              </View>
            ) : (
              <FlatList
                data={rates}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.pickerOption,
                      selectedRate === item.id && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedRate(item.id);
                      setRateModalVisible(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.pickerOptionText,
                        selectedRate === item.id && styles.pickerOptionTextSelected,
                      ]}>
                        {item.label}
                      </Text>
                      <Text style={[
                        styles.pickerOptionSubtext,
                        selectedRate === item.id && styles.pickerOptionSubtextSelected,
                      ]}>
                        PKR {parseFloat(item.price_per_unit).toFixed(2)} / unit
                      </Text>
                    </View>
                    {selectedRate === item.id && (
                      <MaterialCommunityIcons name="check" size={20} color="#1e40af" />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={() => setRateModalVisible(false)}
              >
                <Text style={styles.btnTextSecondary}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Month Picker Modal */}
      <Modal visible={calendarVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.monthPickerContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>
                {dateType === 'from' ? 'Select Start Month' : 'Select End Month'}
              </Text>
              <TouchableOpacity onPress={() => setCalendarVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>

            {/* Year Navigation */}
            <View style={styles.yearNavigator}>
              <TouchableOpacity
                style={styles.yearNavButton}
                onPress={() => handleYearChange('prev')}
              >
                <MaterialCommunityIcons name="chevron-left" size={24} color="#4f46e5" />
              </TouchableOpacity>
              <Text style={styles.yearDisplay}>{calendarYear}</Text>
              <TouchableOpacity
                style={styles.yearNavButton}
                onPress={() => handleYearChange('next')}
              >
                <MaterialCommunityIcons name="chevron-right" size={24} color="#4f46e5" />
              </TouchableOpacity>
            </View>

            {/* Month Grid */}
            <View style={styles.monthGrid}>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
                (month, index) => {
                  const isSelected =
                    (dateType === 'from'
                      ? fromDate.startsWith(`${calendarYear}-${String(index + 1).padStart(2, '0')}`)
                      : toDate.startsWith(`${calendarYear}-${String(index + 1).padStart(2, '0')}`));

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.monthButton, isSelected && styles.monthButtonSelected]}
                      onPress={() => handleMonthSelect(index)}
                    >
                      <Text style={[styles.monthButtonText, isSelected && styles.monthButtonTextSelected]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Rate Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingId ? 'Edit Rate' : 'Add New Rate'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Rate Name</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="label" size={20} color="#4f46e5" />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Standard Rate, Premium Rate"
                      placeholderTextColor="#9ca3af"
                      value={rateLabel}
                      onChangeText={setRateLabel}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Price Per Unit (PKR)</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.currencyPrefix}>PKR</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      placeholderTextColor="#9ca3af"
                      keyboardType="decimal-pad"
                      value={ratePrice}
                      onChangeText={setRatePrice}
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnSecondary]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.btnTextSecondary}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={addRateHandler}
                >
                  <Text style={styles.btnText}>{editingId ? 'Update' : 'Add'} Rate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginHorizontal: 4,
  },
  tabActive: {
    borderBottomColor: '#4f46e5',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 8,
  },
  tabTextActive: {
    color: '#4f46e5',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
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

  // Rates Section
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  ratesList: {
    marginBottom: 80,
  },
  rateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  rateLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  rateDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  ratePrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4f46e5',
  },
  rateActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  editBtn: {
    backgroundColor: '#3b82f6',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  floatingBtnContainer: {
    position: 'absolute',
    bottom: 50,
    right: 20,
  },
  floatingBtn: {
    backgroundColor: '#4f46e5',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Monthly Analysis Section
  filterSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  dropdownWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  dateInputGroup: {
    marginBottom: 16,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateInputText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 10,
  },
  monthPickerContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  yearNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#f0f9ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  yearNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e0e7ff',
  },
  yearDisplay: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4f46e5',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  monthButton: {
    width: '30%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  monthButtonSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  monthButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  monthButtonTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  monthCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  monthName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  monthSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  amountBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
  },

  summaryCard: {
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    marginBottom: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 12,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
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
  modalBody: {
    padding: 20,
    maxHeight: 300,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
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
  currencyPrefix: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#4f46e5',
  },
  btnSecondary: {
    backgroundColor: '#e2e8f0',
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnTextSecondary: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '700',
  },

  // Picker option styles (used in meter + rate modals)
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerOptionSelected: {
    backgroundColor: '#dbeafe',
  },
  pickerOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  pickerOptionTextSelected: {
    color: '#1e40af',
    fontWeight: '700',
  },
  pickerOptionSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  pickerOptionSubtextSelected: {
    color: '#3b82f6',
  },
  emptyPickerState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyPickerText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // Reading detail rows
  readingDetails: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4f46e5',
  },
  readingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  readingLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  readingValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '700',
  },
  summaryRowTotal: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 0,
  },
  summaryLabelTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryValueTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Monthly stats grid
  monthStats: {
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statBoxTotal: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statLabelTotal: {
    color: '#818cf8',
  },
  statCurrency: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  statCurrencyTotal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#818cf8',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  statUnit: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 2,
  },
  statValueTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4f46e5',
  },
});

export default RateScreen;