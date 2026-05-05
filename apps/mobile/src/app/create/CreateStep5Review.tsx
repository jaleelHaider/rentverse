import { Pressable, ScrollView, StyleSheet, Text, View, Image, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

interface Step5Props {
  data: any;
  onBack: () => void;
  onSubmit: () => Promise<void>;
  isLoading: boolean;
}

export default function CreateStep5Review({ data, onBack, onSubmit, isLoading }: Step5Props) {
  const formatPrice = (price: number | undefined) => {
    return price ? `PKR ${price.toLocaleString()}` : 'Not set';
  };

  return (
    <ScrollView style={styles.wrapper}>
      <Text style={styles.sectionTitle}>Review Your Listing</Text>
      <Text style={styles.description}>
        Please review all details before submitting. You can edit after posting.
      </Text>

      {/* Basic Info Section */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <MaterialIcons name="description" size={20} color="#1d4ed8" />
          <Text style={styles.reviewSectionTitle}>Basic Information</Text>
        </View>

        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Title</Text>
          <Text style={styles.reviewValue}>{data.title}</Text>
        </View>

        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Description</Text>
          <Text style={styles.reviewValue}>{data.description}</Text>
        </View>

        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Category</Text>
          <Text style={styles.reviewValue}>{data.categoryPath}</Text>
        </View>

        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Type</Text>
          <Text style={styles.reviewValue}>
            {data.listingType === 'buy' ? 'For Sale' : data.listingType === 'rent' ? 'For Rent' : 'For Sale & Rent'}
          </Text>
        </View>

        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Condition</Text>
          <Text style={styles.reviewValue}>
            {data.condition.charAt(0).toUpperCase() + data.condition.slice(1)}
          </Text>
        </View>
      </View>

      {/* Images Section */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <MaterialIcons name="image" size={20} color="#1d4ed8" />
          <Text style={styles.reviewSectionTitle}>Images ({data.imageUrls.length})</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
          {data.imageUrls.map((url: string, index: number) => (
            <View key={index} style={styles.reviewImageWrapper}>
              <Image source={{ uri: url }} style={styles.reviewImage} />
              <Text style={styles.reviewImageNumber}>#{index + 1}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Pricing Section */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <MaterialIcons name="attach-money" size={20} color="#1d4ed8" />
          <Text style={styles.reviewSectionTitle}>Pricing</Text>
        </View>

        {data.buyPrice && (
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Sale Price</Text>
            <Text style={styles.reviewValue}>{formatPrice(data.buyPrice)}</Text>
          </View>
        )}

        {data.rentDailyPrice && (
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Daily Rental</Text>
            <Text style={styles.reviewValue}>{formatPrice(data.rentDailyPrice)}</Text>
          </View>
        )}

        {data.rentWeeklyPrice && (
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Weekly Rental</Text>
            <Text style={styles.reviewValue}>{formatPrice(data.rentWeeklyPrice)}</Text>
          </View>
        )}

        {data.rentMonthlyPrice && (
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Monthly Rental</Text>
            <Text style={styles.reviewValue}>{formatPrice(data.rentMonthlyPrice)}</Text>
          </View>
        )}
      </View>

      {/* Location Section */}
      <View style={styles.reviewSection}>
        <View style={styles.reviewHeader}>
          <MaterialIcons name="location-on" size={20} color="#1d4ed8" />
          <Text style={styles.reviewSectionTitle}>Location</Text>
        </View>

        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>City</Text>
          <Text style={styles.reviewValue}>{data.city}</Text>
        </View>

        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Area</Text>
          <Text style={styles.reviewValue}>{data.area}</Text>
        </View>
      </View>

      {/* Submit Section */}
      <View style={styles.submitSection}>
        <View style={styles.tips}>
          <MaterialIcons name="verified-user" size={18} color="#059669" />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>Ready to publish?</Text>
            <Text style={styles.tipsText}>
              Your listing will be visible to buyers/renters immediately after posting.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.backButton} onPress={onBack} disabled={isLoading}>
            <MaterialIcons name="arrow-back" size={20} color="#1d4ed8" />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>

          <Pressable style={styles.submitButton} onPress={onSubmit} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Publish Listing</Text>
              </>
            )}
          </Pressable>
        </View>
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
  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  description: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  reviewSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  reviewSectionTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  reviewItem: {
    marginBottom: 12,
  },
  reviewLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  reviewValue: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  imagesScroll: {
    marginTop: 8,
  },
  reviewImageWrapper: {
    marginRight: 10,
    position: 'relative',
  },
  reviewImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  reviewImageNumber: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: '#0f172a',
    color: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '700',
  },
  submitSection: {
    gap: 16,
    marginBottom: 40,
  },
  tips: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#d1fae5',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
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
    color: '#047857',
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
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
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1d4ed8',
    gap: 6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
