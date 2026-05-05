import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Step1Props {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
}

const COMMON_CATEGORIES = [
  { key: 'Electronics', label: '📱 Electronics', path: 'Electronics' },
  { key: 'Furniture', label: '🛋️ Furniture', path: 'Furniture' },
  { key: 'Appliances', label: '🧺 Appliances', path: 'Home & Garden > Home Appliances' },
  { key: 'Sports', label: '⚽ Sports', path: 'Sports & Outdoors' },
  { key: 'Clothing', label: '👕 Clothing', path: 'Apparel & Accessories' },
  { key: 'Books', label: '📚 Books', path: 'Books & Media' },
];

const CONDITIONS = ['Like New', 'Good', 'Fair', 'Used'];

export default function CreateStep1BasicInfo({ data, onNext, onBack }: Step1Props) {
  const [title, setTitle] = useState(data.title);
  const [description, setDescription] = useState(data.description);
  const [selectedCategory, setSelectedCategory] = useState(data.categoryNodeKey);
  const [listingType, setListingType] = useState(data.listingType);
  const [condition, setCondition] = useState(data.condition);

  const handleNext = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description.');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category.');
      return;
    }

    const selectedCat = COMMON_CATEGORIES.find((c) => c.key === selectedCategory);
    onNext({
      title: title.trim(),
      description: description.trim(),
      categoryNodeKey: selectedCategory,
      categoryPath: selectedCat?.path || selectedCategory,
      listingType,
      condition,
    });
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Listing Title</Text>
        <TextInput
          style={styles.input}
          placeholder="E.g., iPhone 14 Pro Max, Barely Used"
          placeholderTextColor="#94a3b8"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
        <Text style={styles.inputHint}>{title.length}/100</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <TextInput
          style={[styles.input, styles.largeInput]}
          placeholder="Describe the item, condition, features, and why you're listing it..."
          placeholderTextColor="#94a3b8"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          maxLength={500}
        />
        <Text style={styles.inputHint}>{description.length}/500</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.categoryGrid}>
          {COMMON_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.key}
              style={[
                styles.categoryButton,
                selectedCategory === cat.key && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text style={styles.categoryButtonText}>{cat.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Listing Type</Text>
        <View style={styles.typeRow}>
          {(['buy', 'rent', 'both'] as const).map((type) => (
            <Pressable
              key={type}
              style={[
                styles.typeButton,
                listingType === type && styles.typeButtonActive,
              ]}
              onPress={() => setListingType(type)}
            >
              <Text style={[styles.typeButtonText, listingType === type && styles.typeButtonTextActive]}>
                {type === 'buy' ? 'Sell' : type === 'rent' ? 'Rent' : 'Both'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Condition</Text>
        <View style={styles.typeRow}>
          {CONDITIONS.map((cond) => (
            <Pressable
              key={cond}
              style={[
                styles.typeButton,
                condition === cond.toLowerCase() && styles.typeButtonActive,
              ]}
              onPress={() => setCondition(cond.toLowerCase())}
            >
              <Text style={[styles.typeButtonText, condition === cond.toLowerCase() && styles.typeButtonTextActive]}>
                {cond}
              </Text>
            </Pressable>
          ))}
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
  section: { gap: 12 },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0f172a',
    fontSize: 14,
  },
  largeInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputHint: {
    color: '#94a3b8',
    fontSize: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    flex: 1,
    minWidth: '48%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#1d4ed8',
  },
  categoryButtonText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typeButtonActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  typeButtonText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
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
