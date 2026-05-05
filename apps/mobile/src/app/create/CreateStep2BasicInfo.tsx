import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../constants/theme';
import { predictCategory } from '../../api/listings.api';

interface BasicInfoProps {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
  canGoBack: boolean;
}

// Product categories with better organization
const PRODUCT_CATEGORIES = [
  {
    id: 'electronics',
    label: 'Electronics',
    icon: 'devices',
    subcategories: ['Phones', 'Laptops', 'Cameras', 'Tablets', 'Headphones'],
    path: 'Electronics',
  },
  {
    id: 'vehicles',
    label: 'Vehicles',
    icon: 'motorcycle',
    subcategories: ['Cars', 'Bikes', 'Scooters', 'Auto Parts'],
    path: 'Vehicles',
  },
  {
    id: 'furniture',
    label: 'Furniture',
    icon: 'chair-rolling',
    subcategories: ['Sofas', 'Tables', 'Beds', 'Chairs', 'Cabinets'],
    path: 'Furniture & Home',
  },
  {
    id: 'appliances',
    label: 'Appliances',
    icon: 'washing-machine',
    subcategories: ['Washing Machine', 'Refrigerator', 'Microwave', 'AC', 'Heater'],
    path: 'Home & Garden > Home Appliances',
  },
  {
    id: 'fashion',
    label: 'Fashion',
    icon: 'hanger',
    subcategories: ['Clothing', 'Shoes', 'Accessories', 'Bags', 'Watches'],
    path: 'Apparel & Accessories',
  },
  {
    id: 'sports',
    label: 'Sports',
    icon: 'basketball',
    subcategories: ['Equipment', 'Outdoor Gear', 'Fitness', 'Gaming'],
    path: 'Sports & Outdoors',
  },
  {
    id: 'books',
    label: 'Books & Media',
    icon: 'library-shelves',
    subcategories: ['Books', 'Comics', 'Movies', 'Music'],
    path: 'Books & Media',
  },
  {
    id: 'toys',
    label: 'Toys & Games',
    icon: 'puzzle',
    subcategories: ['Toys', 'Board Games', 'LEGO', 'Action Figures'],
    path: 'Toys & Games',
  },
];

const CONDITIONS = [
  { id: 'like-new', label: 'Like New', description: 'Unused or in excellent condition' },
  { id: 'good', label: 'Good', description: 'Minor wear, fully functional' },
  { id: 'fair', label: 'Fair', description: 'Noticeable wear, works fine' },
  { id: 'needs-work', label: 'Needs Work', description: 'Has issues, needs repair' },
];

interface SpecRow {
  key: string;
  value: string;
}

export default function CreateStep2BasicInfo({
  data,
  onNext,
  onBack,
  canGoBack,
}: BasicInfoProps) {
  const [title, setTitle] = useState(data.title || '');
  const [description, setDescription] = useState(data.description || '');
  const [selectedCategory, setSelectedCategory] = useState(data.category || '');
  const [selectedSubCategory, setSelectedSubCategory] = useState(data.subCategory || '');
  const [condition, setCondition] = useState(data.condition || 'good');
  const [conditionNote, setConditionNote] = useState(data.conditionNote || '');
  const [features, setFeatures] = useState<string[]>(data.features || ['']);
  const [specs, setSpecs] = useState<SpecRow[]>([{ key: '', value: '' }]);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [suggestedCategoryNodeKey, setSuggestedCategoryNodeKey] = useState(data.categoryNodeKey || '');
  const [aiPredictions, setAiPredictions] = useState<Array<{
    nodeKey: string;
    fullPath: string;
    confidence: number;
    reason: string[];
  }>>([]);
  const [showingPredictions, setShowingPredictions] = useState(false);

  const filteredCategories = PRODUCT_CATEGORIES.filter((cat) =>
    cat.label.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  const selectedCategoryData = PRODUCT_CATEGORIES.find((c) => c.id === selectedCategory);

  const handleAddFeature = () => {
    setFeatures([...features, '']);
  };

  const handleRemoveFeature = (index: number) => {
    if (features.length > 1) {
      setFeatures(features.filter((_, i) => i !== index));
    }
  };

  const handleUpdateFeature = (index: number, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    setFeatures(newFeatures);
  };

  const handleAddSpec = () => {
    setSpecs([...specs, { key: '', value: '' }]);
  };

  const handleRemoveSpec = (index: number) => {
    if (specs.length > 1) {
      setSpecs(specs.filter((_, i) => i !== index));
    }
  };

  const handleOpenCategoryModal = async () => {
    setShowCategoryModal(true);
    setShowingPredictions(true);
    
    // Fetch AI predictions if title and description are sufficient
    if (title.trim().length >= 5 && description.trim().length >= 20) {
      setIsLoadingAI(true);
      try {
        const suggestions = await predictCategory(title.trim(), description.trim());
        setAiPredictions(suggestions);
      } catch (error: any) {
        console.log('Failed to get AI predictions:', error.message);
        setAiPredictions([]);
      } finally {
        setIsLoadingAI(false);
      }
    }
  };

  const handleSelectAIPrediction = (nodeKey: string, fullPath: string) => {
    setSuggestedCategoryNodeKey(nodeKey);
    // Extract category from path (first segment)
    const pathSegments = fullPath.split('>').map(s => s.trim());
    const category = pathSegments[0] || 'Other';
    setSelectedCategory(category);
    setShowCategoryModal(false);
  };

  const handleUpdateSpec = (index: number, field: keyof SpecRow, value: string) => {
    const newSpecs = [...specs];
    newSpecs[index] = { ...newSpecs[index], [field]: value };
    setSpecs(newSpecs);
  };

  const handleNext = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a product title');
      return;
    }
    if (title.trim().length < 5) {
      Alert.alert('Error', 'Title must be at least 5 characters');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (description.trim().length < 20) {
      Alert.alert('Error', 'Description must be at least 20 characters');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    // Use AI-predicted nodeKey if available, otherwise use fallback
    let categoryNodeKey = suggestedCategoryNodeKey;
    
    if (!categoryNodeKey && title.trim().length >= 5 && description.trim().length >= 20) {
      // Try to get AI suggestion as fallback
      try {
        const suggestions = await predictCategory(title.trim(), description.trim());
        if (suggestions.length > 0) {
          categoryNodeKey = suggestions[0].nodeKey;
        }
      } catch (error: any) {
        console.log('Failed to get AI prediction fallback:', error.message);
      }
    }

    const cleanedSpecs = specs
      .filter((s) => s.key.trim() && s.value.trim())
      .reduce((acc, row) => {
        acc[row.key.trim()] = row.value.trim();
        return acc;
      }, {} as Record<string, string>);

    const cleanedFeatures = features.filter((f) => f.trim());

    onNext({
      title: title.trim(),
      description: description.trim(),
      category: selectedCategoryData?.id || selectedCategory,
      subCategory: selectedSubCategory,
      categoryNodeKey: categoryNodeKey || selectedCategoryData?.id || selectedCategory,
      categoryPath: selectedCategoryData?.path || selectedCategory,
      categorySource: suggestedCategoryNodeKey ? 'ai' : 'manual',
      condition,
      conditionNote: conditionNote.trim(),
      conditionIssues: [],
      features: cleanedFeatures.length > 0 ? cleanedFeatures : [''],
      specifications: cleanedSpecs,
    });
  };

  return (
    <ScrollView style={styles.wrapper} showsVerticalScrollIndicator={false}>
      {/* Title Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="title" size={20} color={colors.primary.blue} />
          <Text style={styles.sectionTitle}>Product Title</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="E.g., iPhone 14 Pro Max, Barely Used"
          placeholderTextColor={colors.text.secondary}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
        <View style={styles.helperRow}>
          <Text style={styles.charCount}>{title.length}/100</Text>
          <Text style={styles.helperText}>Be specific and descriptive</Text>
        </View>
      </View>

      {/* Description Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="description" size={20} color={colors.primary.blue} />
          <Text style={styles.sectionTitle}>Description</Text>
        </View>
        <TextInput
          style={[styles.input, styles.largeInput]}
          placeholder="Describe the item, condition, features, and why you're listing it..."
          placeholderTextColor={colors.text.secondary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          maxLength={1000}
          textAlignVertical="top"
        />
        <View style={styles.helperRow}>
          <Text style={styles.charCount}>{description.length}/1000</Text>
          <Text style={styles.helperText}>More details = more buyers</Text>
        </View>
      </View>

      {/* Category Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="folder-multiple" size={20} color={colors.primary.blue} />
          <Text style={styles.sectionTitle}>Category</Text>
        </View>
        <Pressable
          style={styles.categorySelector}
          onPress={handleOpenCategoryModal}
        >
          {selectedCategoryData ? (
            <View style={styles.categorySelectorContent}>
              <MaterialCommunityIcons
                name={selectedCategoryData.icon as any}
                size={20}
                color={colors.primary.blue}
              />
              <View style={styles.categorySelectorText}>
                <Text style={styles.categorySelectorLabel}>{selectedCategoryData.label}</Text>
                {selectedSubCategory && (
                  <Text style={styles.categorySelectorSubLabel}>{selectedSubCategory}</Text>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.categorySelectorContent}>
              <MaterialIcons name="category" size={20} color={colors.text.secondary} />
              <Text style={styles.categorySelectorPlaceholder}>Select a category</Text>
            </View>
          )}
          <MaterialIcons name="expand-more" size={20} color={colors.text.secondary} />
        </Pressable>
      </View>

      {/* Condition Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="grade" size={20} color={colors.primary.blue} />
          <Text style={styles.sectionTitle}>Condition</Text>
        </View>
        <View style={styles.conditionsGrid}>
          {CONDITIONS.map((cond) => (
            <Pressable
              key={cond.id}
              style={[
                styles.conditionCard,
                condition === cond.id && styles.conditionCardActive,
              ]}
              onPress={() => setCondition(cond.id as any)}
            >
              <Text
                style={[
                  styles.conditionLabel,
                  condition === cond.id && styles.conditionLabelActive,
                ]}
              >
                {cond.label}
              </Text>
              <Text style={styles.conditionDescription}>{cond.description}</Text>
              {condition === cond.id && (
                <MaterialIcons
                  name="check-circle"
                  size={20}
                  color={colors.status.success}
                  style={styles.conditionCheck}
                />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* Condition Note */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Condition Note (Optional)</Text>
        <TextInput
          style={[styles.input, styles.mediumInput]}
          placeholder="E.g., Minor scratches on the back, battery health 95%"
          placeholderTextColor={colors.text.secondary}
          value={conditionNote}
          onChangeText={setConditionNote}
          maxLength={200}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Features Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="star" size={20} color={colors.primary.blue} />
          <Text style={styles.sectionTitle}>Key Features (Optional)</Text>
        </View>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureInput}>
            <TextInput
              style={styles.featureInputField}
              placeholder={`Feature ${index + 1}`}
              placeholderTextColor={colors.text.secondary}
              value={feature}
              onChangeText={(value) => handleUpdateFeature(index, value)}
              maxLength={50}
            />
            {features.length > 1 && (
              <Pressable
                style={styles.removeButton}
                onPress={() => handleRemoveFeature(index)}
              >
                <MaterialIcons name="close" size={18} color={colors.status.error} />
              </Pressable>
            )}
          </View>
        ))}
        <Pressable style={styles.addButton} onPress={handleAddFeature}>
          <MaterialIcons name="add" size={18} color={colors.primary.blue} />
          <Text style={styles.addButtonText}>Add Feature</Text>
        </Pressable>
      </View>

      {/* Specifications Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="tune" size={20} color={colors.primary.blue} />
          <Text style={styles.sectionTitle}>Specifications (Optional)</Text>
        </View>
        {specs.map((spec, index) => (
          <View key={index} style={styles.specRow}>
            <TextInput
              style={[styles.specInput, styles.specInputKey]}
              placeholder="E.g., Storage"
              placeholderTextColor={colors.text.secondary}
              value={spec.key}
              onChangeText={(value) => handleUpdateSpec(index, 'key', value)}
              maxLength={30}
            />
            <TextInput
              style={[styles.specInput, styles.specInputValue]}
              placeholder="E.g., 256GB"
              placeholderTextColor={colors.text.secondary}
              value={spec.value}
              onChangeText={(value) => handleUpdateSpec(index, 'value', value)}
              maxLength={50}
            />
            {specs.length > 1 && (
              <Pressable
                style={styles.removeButton}
                onPress={() => handleRemoveSpec(index)}
              >
                <MaterialIcons name="close" size={18} color={colors.status.error} />
              </Pressable>
            )}
          </View>
        ))}
        <Pressable style={styles.addButton} onPress={handleAddSpec}>
          <MaterialIcons name="add" size={18} color={colors.primary.blue} />
          <Text style={styles.addButtonText}>Add Specification</Text>
        </Pressable>
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

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <Pressable onPress={() => setShowCategoryModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.text.primary} />
              </Pressable>
            </View>

            {/* AI Predictions Section */}
            {aiPredictions.length > 0 && showingPredictions && (
              <View style={styles.predictionsSection}>
                <View style={styles.predictionHeader}>
                  <MaterialIcons name="lightbulb" size={18} color={colors.primary.blue} />
                  <Text style={styles.predictionTitle}>AI Suggestions</Text>
                </View>
                
                {isLoadingAI ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary.blue} />
                    <Text style={styles.loadingText}>Analyzing...</Text>
                  </View>
                ) : (
                  <View style={styles.predictionsList}>
                    {aiPredictions.map((suggestion, index) => (
                      <Pressable
                        key={index}
                        style={[
                          styles.predictionCard,
                          suggestedCategoryNodeKey === suggestion.nodeKey && styles.predictionCardSelected,
                        ]}
                        onPress={() => handleSelectAIPrediction(suggestion.nodeKey, suggestion.fullPath)}
                      >
                        <View style={styles.predictionCardContent}>
                          <View style={styles.predictionInfo}>
                            <Text style={styles.predictionPath} numberOfLines={1}>
                              {suggestion.fullPath}
                            </Text>
                            <View style={styles.confidenceBar}>
                              <View
                                style={[
                                  styles.confidenceFill,
                                  { width: `${(suggestion.confidence * 100).toFixed(0)}%` },
                                ]}
                              />
                            </View>
                            <Text style={styles.confidenceText}>
                              {(suggestion.confidence * 100).toFixed(0)}% confidence
                            </Text>
                          </View>
                          {suggestedCategoryNodeKey === suggestion.nodeKey && (
                            <MaterialIcons name="check-circle" size={24} color={colors.primary.blue} />
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                <Pressable
                  style={styles.togglePredictions}
                  onPress={() => setShowingPredictions(false)}
                >
                  <Text style={styles.togglePredictionsText}>Browse all categories</Text>
                  <MaterialIcons name="expand-more" size={20} color={colors.primary.blue} />
                </Pressable>
              </View>
            )}

            {/* Manual Category Selection */}
            {!showingPredictions && (
              <>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search categories..."
                  placeholderTextColor={colors.text.secondary}
                  value={categorySearchQuery}
                  onChangeText={setCategorySearchQuery}
                />

                <FlatList
                  data={filteredCategories}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[
                        styles.categoryItem,
                        selectedCategory === item.id && styles.categoryItemActive,
                      ]}
                      onPress={() => {
                        setSelectedCategory(item.id);
                        setSelectedSubCategory('');
                        setShowCategoryModal(false);
                      }}
                    >
                      <MaterialCommunityIcons
                        name={item.icon as any}
                        size={24}
                        color={selectedCategory === item.id ? colors.primary.blue : colors.text.secondary}
                      />
                      <View style={styles.categoryItemContent}>
                        <Text
                          style={[
                            styles.categoryItemTitle,
                            selectedCategory === item.id && styles.categoryItemTitleActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                        {item.subcategories.length > 0 && (
                          <Text style={styles.categoryItemSubtext}>
                            {item.subcategories.length} subcategories
                          </Text>
                        )}
                      </View>
                      {selectedCategory === item.id && (
                        <MaterialIcons name="check-circle" size={20} color={colors.primary.blue} />
                      )}
                    </Pressable>
                  )}
                  contentContainerStyle={styles.categoryList}
                  scrollEnabled={true}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
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

  // Section Styles
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
  },

  // Input Styles
  input: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
  },
  largeInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  mediumInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Helper Text
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  charCount: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  helperText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },

  // Category Selector
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  categorySelectorContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  categorySelectorText: {
    flex: 1,
  },
  categorySelectorLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.text.primary,
  },
  categorySelectorSubLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  categorySelectorPlaceholder: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    flex: 1,
  },

  // Condition Grid
  conditionsGrid: {
    gap: spacing.md,
  },
  conditionCard: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    position: 'relative',
  },
  conditionCardActive: {
    backgroundColor: colors.primary.blue + '10',
    borderColor: colors.primary.blue,
  },
  conditionLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  conditionLabelActive: {
    color: colors.primary.blue,
  },
  conditionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  conditionCheck: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },

  // Features
  featureInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  featureInputField: {
    flex: 1,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
  },

  // Specifications
  specRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  specInput: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
  },
  specInputKey: {
    flex: 1,
  },
  specInputValue: {
    flex: 1.2,
  },

  // Buttons
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.status.error + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
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
  addButtonText: {
    color: colors.primary.blue,
    fontWeight: '700',
    fontSize: typography.fontSize.base,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    marginTop: 40,
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    color: colors.text.primary,
  },

  // Search Input
  searchInput: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
  },

  // Category List
  categoryList: {
    paddingHorizontal: spacing.lg,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  categoryItemActive: {
    backgroundColor: colors.primary.blue + '10',
    borderColor: colors.primary.blue,
  },
  categoryItemContent: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  categoryItemTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.text.primary,
  },
  categoryItemTitleActive: {
    color: colors.primary.blue,
    fontWeight: '700',
  },
  categoryItemSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // AI Predictions Section
  predictionsSection: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary.blue + '05',
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  predictionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.primary.blue,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  predictionsList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  predictionCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  predictionCardSelected: {
    borderColor: colors.primary.blue,
    backgroundColor: colors.primary.blue + '08',
  },
  predictionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  predictionInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  predictionPath: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: colors.border.light,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: colors.primary.blue,
  },
  confidenceText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  togglePredictions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  togglePredictionsText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.blue,
    fontWeight: '600',
  },
});
