import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, Image, FlatList, ActivityIndicator } from 'react-native';
// Image picker functionality
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { uploadListingImage } from '../../api/listings.api';

interface Step2Props {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
}

export default function CreateStep2Images({ data, onNext, onBack }: Step2Props) {
  const [images, setImages] = useState<string[]>(data.imageUrls || []);
  const [uploading, setUploading] = useState(false);

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      // Request permissions depending on source
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Camera permission is required to take photos. Please enable it in your device settings.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Photo library permission is required to select images. Please enable it in your device settings.');
          return;
        }
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });

      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        setUploading(true);
        try {
          const uploadedUrl = await uploadListingImage(uri);
          setImages((prev) => [...prev, uploadedUrl]);
        } catch (err) {
          Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
        } finally {
          setUploading(false);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to access photos.');
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (images.length === 0) {
      Alert.alert('Error', 'Please add at least one image.');
      return;
    }
    onNext({ imageUrls: images });
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionTitle}>Add Photos</Text>
      <Text style={styles.description}>
        Add clear photos of your item. Listings with photos sell faster!
      </Text>

      {uploading && (
        <View style={styles.uploadingBox}>
          <ActivityIndicator color="#1d4ed8" size="large" />
          <Text style={styles.uploadingText}>Uploading image...</Text>
        </View>
      )}

      <View style={styles.imagesContainer}>
        {images.length > 0 && (
          <FlatList
            data={images}
            renderItem={({ item, index }) => (
              <View style={styles.imageCard}>
                <Image source={{ uri: item }} style={styles.image} />
                <Pressable
                  style={styles.removeButton}
                  onPress={() => removeImage(index)}
                >
                  <MaterialIcons name="close" size={20} color="#fff" />
                </Pressable>
                <Text style={styles.imageIndex}>#{index + 1}</Text>
              </View>
            )}
            keyExtractor={(_, index) => index.toString()}
            numColumns={2}
            columnWrapperStyle={styles.row}
            scrollEnabled={false}
          />
        )}

        {images.length < 8 && (
          <View style={styles.row}>
            <Pressable
              style={[styles.addButton, images.length === 0 && styles.addButtonFull]}
              onPress={() => pickImage('camera')}
              disabled={uploading}
            >
              <MaterialIcons name="photo-camera" size={24} color="#1d4ed8" />
              <Text style={styles.addButtonText}>Camera</Text>
            </Pressable>

            <Pressable
              style={[styles.addButton, images.length === 0 && styles.addButtonFull]}
              onPress={() => pickImage('library')}
              disabled={uploading}
            >
              <MaterialIcons name="image" size={24} color="#1d4ed8" />
              <Text style={styles.addButtonText}>Gallery</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Text style={styles.photoCount}>{images.length} photo(s) added</Text>

      <View style={styles.tips}>
        <MaterialIcons name="info" size={18} color="#0f172a" />
        <Text style={styles.tipsText}>
          Use well-lit photos, show the item from multiple angles, and include any damages for honest listings.
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
  wrapper: { gap: 20 },
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
  uploadingBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  uploadingText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  imagesContainer: { gap: 16 },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  imageCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ef4444',
    borderRadius: 50,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIndex: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: '#0f172a',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '700',
  },
  addButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  addButtonFull: {
    flex: 1,
  },
  addButtonText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '600',
  },
  photoCount: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
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
