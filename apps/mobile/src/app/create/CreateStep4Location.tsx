import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Step4Props {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
}

const CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Hyderabad',
  'Gujranwala',
];

const AREAS_MAP: { [key: string]: string[] } = {
  Karachi: ['Defence (DHA)', 'Clifton', 'Defence View', 'Gulistan-e-Jauhar', 'North Nazimabad', 'Gulberg', 'Malir', 'Other'],
  Lahore: ['Defence (DHA)', 'Cantt', 'Gulberg', 'Johar Town', 'Bahria Town', 'Garden Town', 'Faisal Town', 'Other'],
  Islamabad: ['F-7', 'F-8', 'F-9', 'G-6', 'G-7', 'G-8', 'G-9', 'Other'],
  Rawalpindi: ['Chaklala', 'Cantt', 'Saddar', 'Pindi Point', 'Bahria Town', 'Other'],
  Faisalabad: ['University Road', 'Ghulam Muhammad Abad', 'Millat Road', 'Citi Housing', 'Other'],
  Multan: ['Cantonment', 'Old City', 'Garden Town', 'Shujabad Road', 'Other'],
  Peshawar: ['Cantonment', 'Hayatabad', 'University Town', 'Old City', 'Other'],
  Quetta: ['Cantonment', 'Civil Lines', 'Brewery Road', 'Other'],
  Hyderabad: ['Cantonment', 'Old City', 'Latifabad', 'Other'],
  Gujranwala: ['Cantonment', 'Sadar', 'Civil Lines', 'Other'],
};

export default function CreateStep4Location({ data, onNext, onBack }: Step4Props) {
  const [city, setCity] = useState(data.city);
  const [area, setArea] = useState(data.area);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);

  const areas = city && AREAS_MAP[city] ? AREAS_MAP[city] : [];

  const handleNext = () => {
    if (!city) {
      Alert.alert('Error', 'Please select a city.');
      return;
    }
    if (!area) {
      Alert.alert('Error', 'Please select an area.');
      return;
    }

    onNext({ city, area });
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionTitle}>Location</Text>
      <Text style={styles.description}>
        Where is your item located? This helps buyers find you.
      </Text>

      <View style={styles.section}>
        <Text style={styles.label}>City/Province</Text>
        <Pressable
          style={styles.dropdown}
          onPress={() => setShowCityDropdown(!showCityDropdown)}
        >
          <Text style={[styles.dropdownText, !city && styles.placeholder]}>
            {city || 'Select a city'}
          </Text>
          <MaterialIcons
            name={showCityDropdown ? 'expand-less' : 'expand-more'}
            size={20}
            color="#64748b"
          />
        </Pressable>

        {showCityDropdown && (
          <View style={styles.dropdownMenu}>
            <ScrollView nestedScrollEnabled>
              {CITIES.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.dropdownItem, city === c && styles.dropdownItemActive]}
                  onPress={() => {
                    setCity(c);
                    setArea('');
                    setShowCityDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, city === c && styles.dropdownItemTextActive]}>
                    {c}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {city && areas.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Area/Neighborhood</Text>
          <Pressable
            style={styles.dropdown}
            onPress={() => setShowAreaDropdown(!showAreaDropdown)}
          >
            <Text style={[styles.dropdownText, !area && styles.placeholder]}>
              {area || 'Select an area'}
            </Text>
            <MaterialIcons
              name={showAreaDropdown ? 'expand-less' : 'expand-more'}
              size={20}
              color="#64748b"
            />
          </Pressable>

          {showAreaDropdown && (
            <View style={styles.dropdownMenu}>
              <ScrollView nestedScrollEnabled>
                {areas.map((a) => (
                  <Pressable
                    key={a}
                    style={[styles.dropdownItem, area === a && styles.dropdownItemActive]}
                    onPress={() => {
                      setArea(a);
                      setShowAreaDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, area === a && styles.dropdownItemTextActive]}>
                      {a}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      <View style={styles.tips}>
        <MaterialIcons name="info" size={18} color="#0f172a" />
        <Text style={styles.tipsText}>
          Provide accurate location information for better delivery and buyer confidence.
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={20} color="#1d4ed8" />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Pressable style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 24 },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  description: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
  },
  section: { gap: 12 },
  label: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
  },
  placeholder: {
    color: '#94a3b8',
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: 200,
    marginTop: -8,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemActive: {
    backgroundColor: '#dbeafe',
  },
  dropdownItemText: {
    color: '#0f172a',
    fontSize: 13,
  },
  dropdownItemTextActive: {
    fontWeight: '700',
    color: '#1d4ed8',
  },
  tips: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1d4ed8',
    padding: 12,
  },
  tipsText: {
    color: '#0f172a',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1d4ed8',
    gap: 6,
  },
  backButtonText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '700',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1d4ed8',
    gap: 6,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
