import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

interface ListingTypeProps {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
  canGoBack: boolean;
}

interface ListingTypeOption {
  id: 'buy' | 'rent' | 'both';
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
  borderColor: string;
  benefits: string[];
}

const LISTING_TYPE_OPTIONS: ListingTypeOption[] = [
  {
    id: 'buy',
    title: 'Sell Only',
    description: 'List your item for sale',
    icon: 'shopping-bag',
    iconColor: '#059669',
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    benefits: ['One-time payment', 'Quick sale', 'Instant transfer'],
  },
  {
    id: 'rent',
    title: 'Rent Only',
    description: 'Earn by renting out your item',
    icon: 'calendar-rent',
    iconColor: '#2563eb',
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    benefits: ['Recurring income', 'Keep ownership', 'Flexible terms'],
  },
  {
    id: 'both',
    title: 'Rent & Sell',
    description: 'Both rental income and sales',
    icon: 'chart-box-outline',
    iconColor: '#9333ea',
    backgroundColor: '#faf5ff',
    borderColor: '#a855f7',
    benefits: ['Multiple revenue', 'Maximize returns', 'Full flexibility'],
  },
];

export default function CreateStep1ListingType({
  data,
  onNext,
  onBack,
  canGoBack,
}: ListingTypeProps) {
  const selectedType = data.listingType;

  const handleSelectType = (type: 'buy' | 'rent' | 'both') => {
    onNext({ listingType: type });
  };

  return (
    <ScrollView style={styles.wrapper} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>What would you like to do?</Text>
        <Text style={styles.headerSubtitle}>
          Choose how you want to use your item to make the most of it
        </Text>
      </View>

      {/* Listing Type Cards */}
      <View style={styles.cardsContainer}>
        {LISTING_TYPE_OPTIONS.map((option) => (
          <Pressable
            key={option.id}
            style={[
              styles.card,
              {
                backgroundColor: option.backgroundColor,
                borderColor: selectedType === option.id ? option.borderColor : colors.border.light,
                borderWidth: selectedType === option.id ? 2.5 : 1.5,
              },
            ]}
            onPress={() => handleSelectType(option.id)}
          >
            {/* Card Top Section */}
            <View style={styles.cardTop}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: option.iconColor + '20',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={option.icon}
                  size={32}
                  color={option.iconColor}
                />
              </View>
              <View style={styles.cardTitleSection}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardDescription}>{option.description}</Text>
              </View>
            </View>

            {/* Benefits List */}
            <View style={styles.benefitsList}>
              {option.benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color={option.iconColor}
                    style={styles.benefitIcon}
                  />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            {/* Selection Indicator */}
            {selectedType === option.id && (
              <View style={styles.selectedIndicator}>
                <MaterialIcons
                  name="check-circle"
                  size={24}
                  color={option.iconColor}
                />
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* Additional Info Card */}
      <View style={styles.infoCard}>
        <MaterialCommunityIcons
          name="lightbulb-outline"
          size={20}
          color={colors.primary.blue}
          style={styles.infoIcon}
        />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Pro Tip</Text>
          <Text style={styles.infoText}>
            You can always change your listing type later in the settings
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
        <Pressable
          style={[styles.nextButton, !selectedType && styles.nextButtonDisabled]}
          onPress={() => handleSelectType(selectedType)}
          disabled={!selectedType}
        >
          <Text style={styles.nextButtonText}>Continue</Text>
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

  // Header Section
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

  // Cards Container
  cardsContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  // Card Styles
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  cardTop: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardTitleSection: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },

  // Benefits List
  benefitsList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  benefitIcon: {
    marginRight: 4,
  },
  benefitText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },

  // Selected Indicator
  selectedIndicator: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary.blue + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary.blue + '30',
  },
  infoIcon: {
    marginRight: spacing.md,
    marginTop: 2,
    flexShrink: 0,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.primary.darkBlue,
    marginBottom: 2,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.darkBlue,
    lineHeight: 18,
  },

  // Footer Buttons
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
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
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: colors.neutral.white,
    fontWeight: '700',
    fontSize: typography.fontSize.base,
  },
});
