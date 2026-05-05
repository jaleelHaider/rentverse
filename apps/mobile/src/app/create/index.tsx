import { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import CreateStep1ListingType from './CreateStep1ListingType';
import CreateStep2BasicInfo from './CreateStep2BasicInfo';
import CreateStep3Images from './CreateStep3Images';
import CreateStep4Pricing from './CreateStep4Pricing';
import CreateStep5Location from './CreateStep5Location';
import CreateStep6Review from './CreateStep6Review';
import { useCreateListingMutation } from '../../hooks/useListings';
import { CreateListingPayload } from '../../api/listings.api';
import { prepareImagesForUpload } from '../../utils/imageConverter';

interface FormData {
  // Step 1: Listing Type
  listingType: 'buy' | 'rent' | 'both';
  
  // Step 2: Basic Info
  title: string;
  description: string;
  category: string;
  subCategory: string;
  categoryNodeKey: string;
  categoryPath: string;
  categorySource: string;
  condition: string;
  conditionNote: string;
  conditionIssues: string[];
  features: string[];
  specifications: Record<string, any>;
  
  // Step 3: Images
  images: any[];
  
  // Step 4: Pricing
  buyPrice?: number;
  rentDailyPrice?: number;
  rentWeeklyPrice?: number;
  rentMonthlyPrice?: number;
  weeklyDiscount?: number;
  monthlyDiscount?: number;
  securityDeposit?: number;
  minRentalDays?: number;
  maxRentalDays?: number;
  totalForRent?: number;
  totalForSale?: number;
  availableForRent?: number;
  availableForSale?: number;
  
  // Step 5: Location
  address: string;
  city: string;
  state: string;
  country: string;
  serviceRadius?: number;
  
  // Step 6: Review (computed from above)
}

export default function CreateListingScreen() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    listingType: 'both',
    title: '',
    description: '',
    category: '',
    subCategory: '',
    categoryNodeKey: '',
    categoryPath: '',
    categorySource: '',
    condition: 'good',
    conditionNote: '',
    conditionIssues: [],
    features: [],
    specifications: {},
    images: [],
    buyPrice: undefined,
    rentDailyPrice: undefined,
    rentWeeklyPrice: undefined,
    rentMonthlyPrice: undefined,
    weeklyDiscount: 0,
    monthlyDiscount: 0,
    securityDeposit: 0,
    minRentalDays: 1,
    maxRentalDays: 365,
    totalForRent: 0,
    totalForSale: 0,
    availableForRent: 0,
    availableForSale: 0,
    address: '',
    city: '',
    state: '',
    country: 'Pakistan',
    serviceRadius: 25,
  });

  const router = useRouter();
  const createMutation = useCreateListingMutation();
  const scrollViewRef = useRef<ScrollView>(null);

  const handleNext = (newData: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...newData }));
    if (step < 6) {
      setStep(step + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.title?.trim()) {
        Alert.alert('Error', 'Please enter a title.');
        return;
      }
      if (!formData.description?.trim()) {
        Alert.alert('Error', 'Please enter a description.');
        return;
      }
      if (!formData.categoryNodeKey) {
        Alert.alert('Error', 'Please select a category.');
        return;
      }
      if (!formData.images || formData.images.length === 0) {
        Alert.alert('Error', 'Please add at least one image.');
        return;
      }
      if (!formData.address?.trim()) {
        Alert.alert('Error', 'Please enter an address.');
        return;
      }
      if (!formData.city) {
        Alert.alert('Error', 'Please select a city.');
        return;
      }

      // Validate pricing based on listing type
      if ((formData.listingType === 'buy' || formData.listingType === 'both') && !formData.buyPrice) {
        Alert.alert('Error', 'Please set a buy price.');
        return;
      }
      if ((formData.listingType === 'rent' || formData.listingType === 'both') && !formData.rentDailyPrice) {
        Alert.alert('Error', 'Please set a daily rental price.');
        return;
      }

      // Show loading alert while converting images
      Alert.alert('Publishing...', 'Converting and uploading images, please wait...', [], { cancelable: false });

      // Convert images to base64 format for backend
      let preparedImages: any[] = [];
      try {
        const imageData = (formData.images || []).map((img: any) => ({
          uri: typeof img === 'string' ? img : img.uri || img.path,
          type: img.type || 'image/jpeg',
          name: img.name,
        }));
        preparedImages = await prepareImagesForUpload(imageData);
        console.log('[CreateListing] Successfully prepared', preparedImages.length, 'images for upload');
      } catch (imageError) {
        Alert.alert('Error', `Failed to prepare images: ${imageError instanceof Error ? imageError.message : 'Unknown error'}`);
        return;
      }

      // Build nested payload structure matching backend expectations
      const payload: any = {
        title: formData.title,
        description: formData.description,
        categoryNodeKey: formData.categoryNodeKey,
        categoryPath: formData.categoryPath,
        categorySource: formData.categorySource || 'manual',
        listingType: formData.listingType,
        condition: formData.condition,
        price: {
          buy: formData.buyPrice,
          rent: {
            daily: formData.rentDailyPrice,
            weekly: formData.rentWeeklyPrice,
            monthly: formData.rentMonthlyPrice,
          },
          securityDeposit: formData.securityDeposit,
        },
        location: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          lat: null,
          lng: null,
          radius: formData.serviceRadius,
        },
        availability: {
          securityDeposit: formData.securityDeposit,
          minRentalDays: formData.minRentalDays,
          maxRentalDays: formData.maxRentalDays,
          totalForRent: formData.totalForRent,
          availableForRent: formData.availableForRent,
          totalForSale: formData.totalForSale,
          availableForSale: formData.availableForSale,
        },
        features: formData.features || [],
        specifications: formData.specifications || {},
        images: preparedImages,
      };

      console.log('[CreateListing] Payload prepared, sending to backend...');
      await createMutation.mutateAsync(payload);
      Alert.alert('Success', 'Your listing has been created!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create listing';
      Alert.alert('Error', message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>Step {step} of 6</Text>
        <Text style={styles.title}>Create Your Listing</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / 6) * 100}%` }]} />
      </View>

      <ScrollView ref={scrollViewRef} style={styles.content} contentContainerStyle={styles.contentPadding}>
        {step === 1 && (
          <CreateStep1ListingType
            data={formData}
            onNext={handleNext}
            onBack={handleBack}
            canGoBack={false}
          />
        )}
        {step === 2 && (
          <CreateStep2BasicInfo
            data={formData}
            onNext={handleNext}
            onBack={handleBack}
            canGoBack={true}
          />
        )}
        {step === 3 && (
          <CreateStep3Images
            data={formData}
            onNext={handleNext}
            onBack={handleBack}
            canGoBack={true}
          />
        )}
        {step === 4 && (
          <CreateStep4Pricing
            data={formData}
            onNext={handleNext}
            onBack={handleBack}
            canGoBack={true}
          />
        )}
        {step === 5 && (
          <CreateStep5Location
            data={formData}
            onNext={handleNext}
            onBack={handleBack}
            canGoBack={true}
          />
        )}
        {step === 6 && (
          <CreateStep6Review
            data={formData}
            onBack={handleBack}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  stepIndicator: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#e2e8f0',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1d4ed8',
  },
  content: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },
});
