import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';

interface ImagesProps {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
  canGoBack: boolean;
}

const MAX_IMAGES = 5;

export default function CreateStep3Images({
  data,
  onNext,
  onBack,
  canGoBack,
}: ImagesProps) {
  const [images, setImages] = useState<any[]>(data.imageUris || []);
  const [isLoading, setIsLoading] = useState(false);

  const requestMediaPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting media permissions:', error);
      return false;
    }
  };

  const requestCameraPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  };

  const pickImages = async () => {
    try {
      setIsLoading(true);
      
      // Request permissions
      const hasPermission = await requestMediaPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Denied',
          'Gallery access is required to upload images. Please enable it in settings.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultiple: true,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1, // Max quality
      });

      if (!result.canceled && result.assets.length > 0) {
        const newImages = result.assets.map((asset) => ({
          uri: asset.uri,
          type: 'image/jpeg',
          name: asset.uri.split('/').pop() || 'image.jpg',
        }));

        const totalImages = images.length + newImages.length;
        if (totalImages > MAX_IMAGES) {
          Alert.alert(
            'Too many images',
            `You can upload a maximum of ${MAX_IMAGES} images. You selected ${totalImages}.`
          );
          return;
        }

        setImages([...images, ...newImages]);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      setIsLoading(true);
      
      // Request permissions
      const hasPermission = await requestCameraPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Denied',
          'Camera access is required to take photos. Please enable it in settings.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1, // Max quality
      });

      if (!result.canceled && result.assets.length > 0) {
        if (images.length >= MAX_IMAGES) {
          Alert.alert('Limit reached', `You can upload a maximum of ${MAX_IMAGES} images`);
          return;
        }

        const newImage = {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: result.assets[0].uri.split('/').pop() || 'photo.jpg',
        };

        setImages([...images, newImage]);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const moveImageUp = (index: number) => {
    if (index > 0) {
      const newImages = [...images];
      [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
      setImages(newImages);
    }
  };

  const moveImageDown = (index: number) => {
    if (index < images.length - 1) {
      const newImages = [...images];
      [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
      setImages(newImages);
    }
  };

  const handleNext = () => {
    if (images.length === 0) {
      Alert.alert('Error', 'Please upload at least one image');
      return;
    }

    onNext({
      imageUris: images,
      images: images,
    });
  };

  return (
    <ScrollView style={styles.wrapper} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Add Photos</Text>
        <Text style={styles.headerSubtitle}>
          Upload clear photos of your item. First photo will be the main image.
        </Text>
      </View>

      {/* Photo Upload Buttons */}
      {images.length < MAX_IMAGES && (
        <View style={styles.uploadButtonsContainer}>
          <Pressable
            style={styles.uploadButton}
            onPress={takePhoto}
            disabled={isLoading}
          >
            <MaterialIcons name="camera-alt" size={28} color={colors.primary.blue} />
            <Text style={styles.uploadButtonText}>Take Photo</Text>
          </Pressable>
          <Pressable
            style={styles.uploadButton}
            onPress={pickImages}
            disabled={isLoading}
          >
            <MaterialIcons name="image" size={28} color={colors.primary.blue} />
            <Text style={styles.uploadButtonText}>Choose from Gallery</Text>
          </Pressable>
        </View>
      )}

      {/* Images Count */}
      <View style={styles.imageCountContainer}>
        <Text style={styles.imageCountText}>
          {images.length} / {MAX_IMAGES} images
        </Text>
        {images.length > 0 && (
          <Text style={styles.imageCountHint}>
            {MAX_IMAGES - images.length > 0
              ? `Add ${MAX_IMAGES - images.length} more images`
              : 'Maximum images reached'}
          </Text>
        )}
      </View>

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.blue} />
          <Text style={styles.loadingText}>Loading image...</Text>
        </View>
      )}

      {/* Images Grid */}
      {images.length > 0 && (
        <View style={styles.imagesGrid}>
          {images.map((image, index) => (
            <View key={index} style={styles.imageCard}>
              <Image source={{ uri: image.uri }} style={styles.image} />
              {index === 0 && <View style={styles.primaryBadge} />}
              
              <View style={styles.imageControls}>
                {index > 0 && (
                  <Pressable
                    style={styles.controlButton}
                    onPress={() => moveImageUp(index)}
                  >
                    <MaterialIcons name="arrow-upward" size={16} color={colors.neutral.white} />
                  </Pressable>
                )}
                {index < images.length - 1 && (
                  <Pressable
                    style={styles.controlButton}
                    onPress={() => moveImageDown(index)}
                  >
                    <MaterialIcons name="arrow-downward" size={16} color={colors.neutral.white} />
                  </Pressable>
                )}
                <Pressable
                  style={[styles.controlButton, styles.deleteButton]}
                  onPress={() => removeImage(index)}
                >
                  <MaterialIcons name="delete" size={16} color={colors.neutral.white} />
                </Pressable>
              </View>
              
              <Text style={styles.imageIndexBadge}>{index + 1}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Empty State */}
      {images.length === 0 && !isLoading && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="image-plus-outline"
            size={64}
            color={colors.border.light}
          />
          <Text style={styles.emptyStateTitle}>No photos yet</Text>
          <Text style={styles.emptyStateText}>
            Add clear, well-lit photos to increase buyer interest
          </Text>
        </View>
      )}

      {/* Tips Card */}
      <View style={styles.tipsCard}>
        <MaterialIcons name="lightbulb-outline" size={20} color={colors.primary.blue} />
        <View style={styles.tipsContent}>
          <Text style={styles.tipsTitle}>Photo Tips</Text>
          <Text style={styles.tipsText}>• Use natural lighting{'\n'}• Show the entire item{'\n'}• Include details/defects</Text>
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
          style={[styles.nextButton, images.length === 0 && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={images.length === 0}
        >
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

  // Upload Buttons
  uploadButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: colors.primary.blue + '10',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary.blue + '30',
  },
  uploadButtonText: {
    marginTop: spacing.sm,
    color: colors.primary.blue,
    fontWeight: '700',
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },

  // Image Count
  imageCountContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  imageCountText: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  imageCountHint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },

  // Images Grid
  imagesGrid: {
    marginBottom: spacing.xl,
  },

  imageCard: {
    position: 'relative',
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  image: {
    width: '100%',
    height: 200,
  },
  primaryBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.status.success,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  imageIndexBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.primary.blue,
    color: colors.neutral.white,
    fontWeight: '700',
    width: 28,
    height: 28,
    textAlign: 'center',
    lineHeight: 28,
    borderRadius: 14,
    fontSize: typography.fontSize.sm,
  },
  imageControls: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
  },
  controlButton: {
    flex: 1,
    backgroundColor: colors.primary.blue,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: colors.status.error,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateTitle: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  emptyStateText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
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
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: colors.neutral.white,
    fontWeight: '700',
    fontSize: typography.fontSize.base,
  },
});
