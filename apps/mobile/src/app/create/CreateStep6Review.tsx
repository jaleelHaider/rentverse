import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Image,
  FlatList,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

interface ReviewProps {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
  canGoBack: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}

interface ReviewSection {
  title: string;
  items: { label: string; value: string }[];
}

export default function CreateStep6Review({
  data,
  onNext,
  onBack,
  canGoBack,
  isSubmitting,
  onSubmit,
}: ReviewProps) {
  const reviewSections = useMemo(() => {
    const sections: ReviewSection[] = [];

    // Listing Type & Basic Info
    sections.push({
      title: 'Listing Type & Basic Info',
      items: [
        { label: 'Listing Type', value: data.listingType === 'buy' ? 'Sell' : data.listingType === 'rent' ? 'Rent' : 'Rent & Sell' },
        { label: 'Title', value: data.title },
        { label: 'Category', value: data.category },
        { label: 'Condition', value: data.condition },
      ],
    });

    // Description
    sections.push({
      title: 'Description',
      items: [{ label: 'Details', value: data.description.substring(0, 100) + (data.description.length > 100 ? '...' : '') }],
    });

    // Pricing
    if (data.listingType === 'buy' || data.listingType === 'both') {
      sections.push({
        title: 'Selling Price',
        items: [
          { label: 'Price', value: `Rs. ${data.buyPrice}` },
          { label: 'Available for Sale', value: String(data.totalForSale) },
        ],
      });
    }

    if (data.listingType === 'rent' || data.listingType === 'both') {
      sections.push({
        title: 'Rental Pricing',
        items: [
          { label: 'Daily Rate', value: `Rs. ${data.rentDailyPrice}` },
          { label: 'Weekly Discount', value: `${data.rentWeeklyDiscount}%` },
          { label: 'Monthly Discount', value: `${data.rentMonthlyDiscount}%` },
          { label: 'Min Rental Days', value: String(data.minRentalDays) },
          { label: 'Max Rental Days', value: String(data.maxRentalDays) },
          { label: 'Security Deposit', value: data.securityDeposit ? `Rs. ${data.securityDeposit}` : 'None' },
          { label: 'Available for Rent', value: String(data.totalForRent) },
        ],
      });
    }

    // Location
    sections.push({
      title: 'Location',
      items: [
        { label: 'Address', value: data.address },
        { label: 'City', value: data.city },
        { label: 'State', value: data.state },
        { label: 'Service Radius', value: `${data.serviceRadius} km` },
      ],
    });

    return sections;
  }, [data]);

  return (
    <ScrollView style={styles.wrapper} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Review Your Listing</Text>
        <Text style={styles.headerSubtitle}>
          Make sure everything looks good before publishing
        </Text>
      </View>

      {/* Images Preview */}
      {data.imageUris && data.imageUris.length > 0 && (
        <View style={styles.imagesSection}>
          <Text style={styles.sectionTitle}>Photos ({data.imageUris.length})</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imagesScroll}
            contentContainerStyle={styles.imagesScrollContent}
          >
            {data.imageUris.map((image: any, index: number) => (
              <View key={index} style={styles.imagePreview}>
                <Image source={{ uri: image.uri }} style={styles.previewImage} />
                {index === 0 && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>Main</Text>
                  </View>
                )}
                <Text style={styles.imageNumber}>{index + 1}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Review Sections */}
      {reviewSections.map((section, index) => (
        <View key={index} style={styles.reviewSection}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item, itemIndex) => (
            <View
              key={itemIndex}
              style={[styles.reviewItem, itemIndex !== section.items.length - 1 && styles.reviewItemBorder]}
            >
              <Text style={styles.reviewLabel}>{item.label}</Text>
              <Text style={styles.reviewValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      ))}

      {/* Important Notice */}
      <View style={styles.noticeCard}>
        <MaterialIcons name="info-outline" size={20} color={colors.status.warning} />
        <View style={styles.noticeContent}>
          <Text style={styles.noticeTitle}>Before You Publish</Text>
          <Text style={styles.noticeText}>
            • Review all details carefully{'\n'}
            • Check spelling and accuracy{'\n'}
            • Verify photos are clear{'\n'}
            • Ensure contact information is correct
          </Text>
        </View>
      </View>

      {/* Edit Buttons */}
      <View style={styles.editButtonsContainer}>
        <Pressable style={styles.editButton} onPress={onBack}>
          <MaterialIcons name="edit" size={18} color={colors.primary.blue} />
          <Text style={styles.editButtonText}>Edit Details</Text>
        </Pressable>
      </View>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        {canGoBack && (
          <Pressable style={styles.backButton} onPress={onBack} disabled={isSubmitting}>
            <MaterialIcons name="arrow-back" size={20} color={colors.primary.darkBlue} />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.publishButton, isSubmitting && styles.publishButtonDisabled]}
          onPress={onSubmit}
          disabled={isSubmitting}
        >
          <MaterialIcons name="check-circle" size={20} color={colors.neutral.white} />
          <Text style={styles.publishButtonText}>
            {isSubmitting ? 'Publishing...' : 'Publish Listing'}
          </Text>
        </Pressable>
      </View>

      {/* Success Message */}
      <View style={styles.successNote}>
        <MaterialIcons name="check" size={16} color={colors.status.success} />
        <Text style={styles.successText}>Your listing will be live immediately after publishing</Text>
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

  // Images Section
  imagesSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  imagesScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  imagesScrollContent: {
    gap: spacing.md,
  },
  imagePreview: {
    position: 'relative',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  previewImage: {
    width: 120,
    height: 120,
  },
  primaryBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.status.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  primaryBadgeText: {
    color: colors.neutral.white,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },
  imageNumber: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.primary.blue,
    color: colors.neutral.white,
    fontWeight: '700',
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    borderRadius: 12,
    fontSize: typography.fontSize.xs,
  },

  // Review Section
  reviewSection: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  // Review Item
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  reviewItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.background.primary,
  },
  reviewLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text.secondary,
    flex: 0.4,
  },
  reviewValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 0.6,
    textAlign: 'right',
  },

  // Notice Card
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: colors.status.warning + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.status.warning + '40',
  },
  noticeContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  noticeTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },

  // Edit Buttons
  editButtonsContainer: {
    marginBottom: spacing.lg,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary.blue,
    backgroundColor: colors.primary.blue + '10',
  },
  editButtonText: {
    color: colors.primary.blue,
    fontWeight: '700',
    fontSize: typography.fontSize.base,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
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
  publishButton: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.status.success,
    gap: spacing.sm,
  },
  publishButtonDisabled: {
    opacity: 0.7,
  },
  publishButtonText: {
    color: colors.neutral.white,
    fontWeight: '800',
    fontSize: typography.fontSize.base,
  },

  // Success Note
  successNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.status.success + '15',
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.status.success + '40',
  },
  successText: {
    fontSize: typography.fontSize.sm,
    color: colors.status.success,
    fontWeight: '600',
    flex: 1,
  },
});
