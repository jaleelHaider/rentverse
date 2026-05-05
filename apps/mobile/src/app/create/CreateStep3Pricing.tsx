import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Step3Props {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
}

export default function CreateStep3Pricing({ data, onNext, onBack }: Step3Props) {
  const [buyPrice, setBuyPrice] = useState(data.buyPrice?.toString() || '');
  const [rentDaily, setRentDaily] = useState(data.rentDailyPrice?.toString() || '');
  const [rentWeekly, setRentWeekly] = useState(data.rentWeeklyPrice?.toString() || '');
  const [rentMonthly, setRentMonthly] = useState(data.rentMonthlyPrice?.toString() || '');

  const handleNext = () => {
    const listing = data.listingType;
    const isBuy = listing === 'buy';
    const isRent = listing === 'rent';
    const isBoth = listing === 'both';

    if (isBuy && !buyPrice) {
      Alert.alert('Error', 'Please set a buy price.');
      return;
    }

    if ((isRent || isBoth) && !rentDaily) {
      Alert.alert('Error', 'Please set at least a daily rental price.');
      return;
    }

    onNext({
      buyPrice: isBuy || isBoth ? parseFloat(buyPrice || '0') || undefined : undefined,
      rentDailyPrice: (isRent || isBoth) ? parseFloat(rentDaily || '0') || undefined : undefined,
      rentWeeklyPrice: (isRent || isBoth) ? parseFloat(rentWeekly || '0') || undefined : undefined,
      rentMonthlyPrice: (isRent || isBoth) ? parseFloat(rentMonthly || '0') || undefined : undefined,
    });
  };

  const listing = data.listingType;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionTitle}>Set Prices</Text>

      {(listing === 'buy' || listing === 'both') && (
        <View style={styles.section}>
          <Text style={styles.label}>Sale Price (PKR)</Text>
          <View style={styles.inputGroup}>
            <MaterialIcons name="attach-money" size={18} color="#64748b" />
            <TextInput
              style={styles.input}
              placeholder="e.g., 25000"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              value={buyPrice}
              onChangeText={setBuyPrice}
            />
          </View>
          <Text style={styles.hint}>This is the price buyers will pay to purchase the item.</Text>
        </View>
      )}

      {(listing === 'rent' || listing === 'both') && (
        <View style={styles.section}>
          <Text style={styles.label}>Rental Prices (PKR/day or period)</Text>
          
          <View style={styles.priceGrid}>
            <View style={styles.priceCol}>
              <Text style={styles.smallLabel}>Daily</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.input, styles.smallInput]}
                  placeholder="e.g., 500"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  value={rentDaily}
                  onChangeText={setRentDaily}
                />
              </View>
            </View>

            <View style={styles.priceCol}>
              <Text style={styles.smallLabel}>Weekly</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.input, styles.smallInput]}
                  placeholder="e.g., 2800"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  value={rentWeekly}
                  onChangeText={setRentWeekly}
                />
              </View>
            </View>

            <View style={styles.priceCol}>
              <Text style={styles.smallLabel}>Monthly</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.input, styles.smallInput]}
                  placeholder="e.g., 10000"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  value={rentMonthly}
                  onChangeText={setRentMonthly}
                />
              </View>
            </View>
          </View>

          <Text style={styles.hint}>
            At minimum, set a daily price. Weekly/monthly are optional but encourage longer rentals.
          </Text>
        </View>
      )}

      <View style={styles.tips}>
        <MaterialIcons name="lightbulb" size={18} color="#f59e0b" />
        <View style={styles.tipsContent}>
          <Text style={styles.tipsTitle}>Pricing Tips</Text>
          <Text style={styles.tipsText}>
            • Research similar items to price competitively{'\n'}
            • Consider item condition and demand{'\n'}
            • For rentals, offer discounts for longer periods{'\n'}
            • Prices can be negotiated after posting
          </Text>
        </View>
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
  section: { gap: 12 },
  label: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  smallLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: '#0f172a',
    fontSize: 14,
  },
  smallInput: {
    fontSize: 13,
  },
  hint: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 16,
  },
  priceGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  priceCol: {
    flex: 1,
    gap: 6,
  },
  tips: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 12,
  },
  tipsContent: { flex: 1 },
  tipsTitle: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipsText: {
    color: '#78350f',
    fontSize: 11,
    lineHeight: 14,
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
