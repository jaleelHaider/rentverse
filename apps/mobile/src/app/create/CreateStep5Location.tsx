import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

interface LocationProps {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
  canGoBack: boolean;
}

// City-State mapping for Pakistan
const CITY_STATE_MAPPING: Record<string, string[]> = {
  'Sindh': ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Nawabshah', 'Shikarpur', 'Jacobabad', 'Dadu'],
  'Punjab': ['Lahore', 'Faisalabad', 'Multan', 'Rawalpindi', 'Gujranwala', 'Sialkot', 'Bahawalpur', 'Sargodha'],
  'KPK': ['Peshawar', 'Mardan', 'Abbottabad', 'Kohat', 'Bannu', 'Mingora', 'Dera Ismail Khan', 'Charsadda'],
  'Balochistan': ['Quetta', 'Gwadar', 'Khuzdar', 'Turbat', 'Chaman', 'Sibi', 'Nasirabad', 'Loralai'],
  'Gilgit-Baltistan': ['Gilgit', 'Skardu', 'Hunza', 'Nagar', 'Diamer', 'Ghanche'],
  'Azad Kashmir': ['Muzaffarabad', 'Mirpur', 'Rawalakot', 'Kotli', 'Bhimber', 'Poonch'],
  'Islamabad Capital Territory': ['Islamabad'],
};

const STATES = Object.keys(CITY_STATE_MAPPING);

export default function CreateStep5Location({
  data,
  onNext,
  onBack,
  canGoBack,
}: LocationProps) {
  const [address, setAddress] = useState(data.address || '');
  const [state, setState] = useState(data.state || '');
  const [city, setCity] = useState(data.city || '');
  const [radius, setRadius] = useState(String(data.serviceRadius || 25));
  
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  // Get cities for selected state
  const citiesForState = useMemo(() => {
    if (!state) return [];
    return CITY_STATE_MAPPING[state] || [];
  }, [state]);

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return citiesForState;
    return citiesForState.filter((c) =>
      c.toLowerCase().includes(citySearch.toLowerCase())
    );
  }, [citySearch, citiesForState]);

  const handleStateSelect = (selectedState: string) => {
    setState(selectedState);
    setCity(''); // Reset city when state changes
    setShowStatePicker(false);
    setCitySearch('');
  };

  const handleCitySelect = (selectedCity: string) => {
    setCity(selectedCity);
    setShowCityPicker(false);
    setCitySearch('');
  };

  const handleNext = () => {
    if (!state.trim()) {
      Alert.alert('Error', 'Please select a state or province');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Error', 'Please select a city');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Error', 'Please enter a complete address');
      return;
    }

    onNext({
      state: state.trim(),
      city: city.trim(),
      address: address.trim(),
      country: 'Pakistan',
      serviceRadius: parseInt(radius) || 25,
    });
  };

  return (
    <ScrollView style={styles.wrapper} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Location Details</Text>
        <Text style={styles.headerSubtitle}>
          Help buyers find your item and arrange pickup
        </Text>
      </View>

      {/* State Selection */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="map" size={20} color={colors.primary.blue} />
          <Text style={styles.sectionTitle}>State / Province</Text>
        </View>
        <Pressable
          style={[styles.input, state && styles.inputFilled]}
          onPress={() => setShowStatePicker(true)}
        >
          <Text style={[styles.inputText, !state && styles.placeholder]}>
            {state || 'Select State or Province'}
          </Text>
          <MaterialIcons
            name="expand-more"
            size={20}
            color={colors.text.secondary}
          />
        </Pressable>
      </View>

      {/* City Selection */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="location-city" size={20} color={colors.primary.blue} />
          <Text style={styles.sectionTitle}>City</Text>
        </View>
        <Pressable
          style={[
            styles.input,
            city && styles.inputFilled,
            !state && styles.inputDisabled,
          ]}
          onPress={() => state && setShowCityPicker(true)}
          disabled={!state}
        >
          <Text
            style={[
              styles.inputText,
              !city && styles.placeholder,
              !state && styles.placeholderDisabled,
            ]}
          >
            {city || (state ? 'Select City' : 'Select State First')}
          </Text>
          <MaterialIcons
            name="expand-more"
            size={20}
            color={state ? colors.text.secondary : colors.text.secondary + '50'}
          />
        </Pressable>
      </View>

      {/* Address */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="home" size={20} color={colors.primary.blue} />
          <Text style={styles.sectionTitle}>Complete Address</Text>
        </View>
        <TextInput
          style={[styles.input, styles.largeInput]}
          placeholder="House number, street name, area"
          placeholderTextColor={colors.text.secondary}
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Service Radius */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="near-me" size={20} color={colors.primary.blue} />
          <Text style={styles.sectionTitle}>Service Radius (km)</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="e.g., 25"
          placeholderTextColor={colors.text.secondary}
          value={radius}
          onChangeText={setRadius}
          keyboardType="numeric"
        />
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        {canGoBack && (
          <Pressable style={styles.buttonBack} onPress={onBack}>
            <Text style={styles.buttonBackText}>Back</Text>
          </Pressable>
        )}
        <Pressable style={styles.buttonNext} onPress={handleNext}>
          <Text style={styles.buttonNextText}>Next</Text>
        </Pressable>
      </View>

      {/* State Picker Modal */}
      <Modal
        visible={showStatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatePicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowStatePicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <Pressable onPress={() => setShowStatePicker(false)}>
                <MaterialIcons name="close" size={24} color={colors.text.primary} />
              </Pressable>
            </View>
            <FlatList
              data={STATES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.optionItem,
                    state === item && styles.optionItemSelected,
                  ]}
                  onPress={() => handleStateSelect(item)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      state === item && styles.optionTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {state === item && (
                    <MaterialIcons name="check" size={20} color={colors.primary.blue} />
                  )}
                </Pressable>
              )}
              scrollEnabled={true}
              nestedScrollEnabled={true}
            />
          </View>
        </Pressable>
      </Modal>

      {/* City Picker Modal */}
      <Modal
        visible={showCityPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCityPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCityPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <Pressable onPress={() => setShowCityPicker(false)}>
                <MaterialIcons name="close" size={24} color={colors.text.primary} />
              </Pressable>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <MaterialIcons
                name="search"
                size={20}
                color={colors.text.secondary}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search cities..."
                placeholderTextColor={colors.text.secondary}
                value={citySearch}
                onChangeText={setCitySearch}
              />
            </View>

            {/* Filtered Cities List */}
            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.optionItem,
                    city === item && styles.optionItemSelected,
                  ]}
                  onPress={() => handleCitySelect(item)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      city === item && styles.optionTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {city === item && (
                    <MaterialIcons name="check" size={20} color={colors.primary.blue} />
                  )}
                </Pressable>
              )}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              ListEmptyState={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No cities found</Text>
                </View>
              }
            />
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
  },

  headerSection: {
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '900',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    lineHeight: 22,
  },

  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.text.primary,
  },

  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: '#ffffff',
    minHeight: 48,
  },
  inputFilled: {
    borderColor: colors.primary.blue,
    backgroundColor: colors.primary.blue + '05',
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    opacity: 0.6,
  },
  inputText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  placeholder: {
    color: colors.text.secondary,
  },
  placeholderDisabled: {
    color: colors.text.secondary + '80',
  },
  largeInput: {
    height: 'auto',
    minHeight: 100,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
  },

  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  buttonBack: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.primary.blue,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonBackText: {
    color: colors.primary.blue,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  buttonNext: {
    flex: 1,
    backgroundColor: colors.primary.blue,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonNextText: {
    color: '#ffffff',
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    color: colors.text.primary,
  },

  // Search Input
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: '#f1f5f9',
    height: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },

  // Option Item
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionItemSelected: {
    backgroundColor: colors.primary.blue + '10',
  },
  optionText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '700',
    color: colors.primary.blue,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
});
