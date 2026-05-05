import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

interface PricingProps {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
  canGoBack: boolean;
}

export default function CreateStep4Pricing({
  data,
  onNext,
  onBack,
  canGoBack,
}: PricingProps) {
  const listingType = data.listingType;
  const [buyPrice, setBuyPrice] = useState(data.buyPrice || '');
  const [rentDailyPrice, setRentDailyPrice] = useState(data.rentDailyPrice || '');
  const [weeklyDiscount, setWeeklyDiscount] = useState(data.rentWeeklyDiscount || 0);
  const [monthlyDiscount, setMonthlyDiscount] = useState(data.rentMonthlyDiscount || 0);
  const [securityDeposit, setSecurityDeposit] = useState(data.securityDeposit || '');
  const [minRentalDays, setMinRentalDays] = useState(String(data.minRentalDays || 1));
  const [maxRentalDays, setMaxRentalDays] = useState(String(data.maxRentalDays || 30));
  const [totalForRent, setTotalForRent] = useState(String(data.totalForRent || 1));
  const [totalForSale, setTotalForSale] = useState(String(data.totalForSale || 1));

  // Calculate rental rates
  const calculatedRates = useMemo(() => {
    const daily = parseFloat(rentDailyPrice) || 0;
    if (daily <= 0) return null;

    const weekly = daily * 7 * (1 - weeklyDiscount / 100);
    const monthly = daily * 30 * (1 - monthlyDiscount / 100);

    return {
      daily: daily.toFixed(0),
      weekly: Math.round(weekly).toString(),
      monthly: Math.round(monthly).toString(),
    };
  }, [rentDailyPrice, weeklyDiscount, monthlyDiscount]);

  const handleNext = () => {
    // Validation
    if (listingType === 'buy' || listingType === 'both') {
      const price = parseFloat(buyPrice) || 0;
      if (price <= 0) {
        Alert.alert('Error', 'Please enter a valid selling price');
        return;
      }
    }

    if (listingType === 'rent' || listingType === 'both') {
      const daily = parseFloat(rentDailyPrice) || 0;
      if (daily <= 0) {
        Alert.alert('Error', 'Please enter a valid daily rental price');
        return;
      }
    }

    if (weeklyDiscount < 0 || weeklyDiscount > 100) {
      Alert.alert('Error', 'Weekly discount must be between 0 and 100%');
      return;
    }

    if (monthlyDiscount < 0 || monthlyDiscount > 100) {
      Alert.alert('Error', 'Monthly discount must be between 0 and 100%');
      return;
    }

    const minDays = parseInt(minRentalDays) || 1;
    const maxDays = parseInt(maxRentalDays) || 30;
    if (minDays > maxDays) {
      Alert.alert('Error', 'Minimum rental days cannot be greater than maximum');
      return;
    }

    onNext({
      buyPrice,
      rentDailyPrice,
      rentWeeklyDiscount: weeklyDiscount,
      rentMonthlyDiscount: monthlyDiscount,
      securityDeposit,
      minRentalDays: minDays,
      maxRentalDays: maxDays,
      totalForRent: parseInt(totalForRent) || 1,
      totalForSale: parseInt(totalForSale) || 1,
    });
  };

  return (
    <ScrollView style={styles.wrapper} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Set Your Pricing</Text>
        <Text style={styles.headerSubtitle}>
          Price your item competitively to attract buyers
        </Text>
      </View>

      {/* Selling Price Section */}
      {(listingType === 'buy' || listingType === 'both') && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="local-offer" size={20} color={colors.primary.blue} />
            <Text style={styles.sectionTitle}>Selling Price</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price (PKR)</Text>
            <View style={styles.currencyInput}>
              <Text style={styles.currencySymbol}>Rs.</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.text.secondary}
                value={buyPrice}
                onChangeText={setBuyPrice}
                keyboardType="decimal-pad"
                maxLength={10}
              />
            </View>
          </View>

          <View style={styles.availabilityRow}>
            <View style={styles.availabilityItem}>
              <Text style={styles.label}>Total Items</Text>
              <TextInput
                style={styles.minInput}
                placeholder="1"
                placeholderTextColor={colors.text.secondary}
                value={totalForSale}
                onChangeText={setTotalForSale}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
          </View>
        </View>
      )}

      {/* Rental Price Section */}
      {(listingType === 'rent' || listingType === 'both') && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="calendar-today" size={20} color={colors.primary.blue} />
            <Text style={styles.sectionTitle}>Rental Pricing</Text>
          </View>

          {/* Daily Rate */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Daily Rate (PKR)</Text>
            <View style={styles.currencyInput}>
              <Text style={styles.currencySymbol}>Rs.</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.text.secondary}
                value={rentDailyPrice}
                onChangeText={setRentDailyPrice}
                keyboardType="decimal-pad"
                maxLength={10}
              />
            </View>
          </View>

          {/* Weekly & Monthly Discounts */}
          <View style={styles.discountsContainer}>
            <View style={styles.discountInput}>
              <Text style={styles.label}>Weekly Discount (%)</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="0"
                placeholderTextColor={colors.text.secondary}
                value={String(weeklyDiscount)}
                onChangeText={(value) => setWeeklyDiscount(parseInt(value) || 0)}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
            <View style={styles.discountInput}>
              <Text style={styles.label}>Monthly Discount (%)</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="0"
                placeholderTextColor={colors.text.secondary}
                value={String(monthlyDiscount)}
                onChangeText={(value) => setMonthlyDiscount(parseInt(value) || 0)}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
          </View>

          {/* Calculated Rates Display */}
          {calculatedRates && (
            <View style={styles.ratesDisplay}>
              <View style={styles.rateItem}>
                <Text style={styles.rateLabel}>Daily</Text>
                <Text style={styles.rateValue}>Rs. {calculatedRates.daily}</Text>
              </View>
              <View style={styles.rateItem}>
                <Text style={styles.rateLabel}>Weekly</Text>
                <Text style={styles.rateValue}>Rs. {calculatedRates.weekly}</Text>
              </View>
              <View style={styles.rateItem}>
                <Text style={styles.rateLabel}>Monthly</Text>
                <Text style={styles.rateValue}>Rs. {calculatedRates.monthly}</Text>
              </View>
            </View>
          )}

          {/* Rental Duration */}
          <View style={styles.rentalDurationContainer}>
            <Text style={styles.sectionTitle}>Rental Duration</Text>
            <View style={styles.durationRow}>
              <View style={styles.durationInput}>
                <Text style={styles.label}>Min Days</Text>
                <TextInput
                  style={styles.minInput}
                  placeholder="1"
                  placeholderTextColor={colors.text.secondary}
                  value={minRentalDays}
                  onChangeText={setMinRentalDays}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
              <View style={styles.durationInput}>
                <Text style={styles.label}>Max Days</Text>
                <TextInput
                  style={styles.minInput}
                  placeholder="30"
                  placeholderTextColor={colors.text.secondary}
                  value={maxRentalDays}
                  onChangeText={setMaxRentalDays}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            </View>
          </View>

          {/* Security Deposit */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Security Deposit (Optional, PKR)</Text>
            <View style={styles.currencyInput}>
              <Text style={styles.currencySymbol}>Rs.</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.text.secondary}
                value={securityDeposit}
                onChangeText={setSecurityDeposit}
                keyboardType="decimal-pad"
                maxLength={10}
              />
            </View>
          </View>

          {/* Total Items for Rent */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Total Items Available for Rent</Text>
            <TextInput
              style={styles.minInput}
              placeholder="1"
              placeholderTextColor={colors.text.secondary}
              value={totalForRent}
              onChangeText={setTotalForRent}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
        </View>
      )}

      {/* Tips Card */}
      <View style={styles.tipsCard}>
        <MaterialIcons name="info-outline" size={20} color={colors.primary.blue} />
        <View style={styles.tipsContent}>
          <Text style={styles.tipsTitle}>Pricing Tips</Text>
          <Text style={styles.tipsText}>
            • Research similar items{'\n'}• Competitive prices sell faster{'\n'}• Discounts encourage longer rentals
          </Text>
        </View>
      </View>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        {canGoBack && (
          <Pressable style={styles.backButton} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={20} color={colors.primary.darkBlue} />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        )}
        <Pressable style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
          <MaterialIcons name="arrow-forward" size={20} color={colors.neutral.white} />
        </Pressable>
      </View>
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

  // Header
  headerSection: {
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '900',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    lineHeight: 22,
  },

  // Section
  section: {
    marginBottom: spacing.xl,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
  },

  // Input Groups
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },

  // Currency Input
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingLeft: spacing.md,
  },
  currencySymbol: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  minInput: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  smallInput: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },

  // Availability
  availabilityRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  availabilityItem: {
    flex: 1,
  },

  // Discounts
  discountsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  discountInput: {
    flex: 1,
  },

  // Rates Display
  ratesDisplay: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.primary.blue + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  rateItem: {
    flex: 1,
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  rateValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    color: colors.primary.blue,
  },

  // Rental Duration
  rentalDurationContainer: {
    marginBottom: spacing.lg,
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  durationInput: {
    flex: 1,
  },

  // Tips Card
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary.blue + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary.blue + '30',
  },
  tipsContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  tipsTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.primary.darkBlue,
    marginBottom: 4,
  },
  tipsText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.darkBlue,
    lineHeight: 20,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: colors.primary.blue,
    gap: spacing.sm,
  },
  backButtonText: {
    color: colors.primary.darkBlue,
    fontWeight: '700',
    fontSize: typography.fontSize.base,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.blue,
    gap: spacing.sm,
  },
  nextButtonText: {
    color: colors.neutral.white,
    fontWeight: '700',
    fontSize: typography.fontSize.base,
  },
});
