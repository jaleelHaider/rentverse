import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { ListingCard } from '../../components/listings/ListingCard';
import { MarketplaceListing, MarketplaceSearchFilters } from '../../api/marketplace.api';
import { useMarketplaceListings, useMarketplaceSearch } from '../../hooks/useMarketplace';
import theme from '../../constants/theme';

const defaultFilters: MarketplaceSearchFilters = {
  category: [],
  condition: [],
  type: [],
  sellerVerified: false,
  ratingMin: 0,
  minPrice: null,
  maxPrice: null,
};

const listingTypes = ['buy', 'rent', 'both'] as const;

const categories = [
  { id: 'electronics', label: 'Electronics', icon: 'devices' as const },
  { id: 'vehicles', label: 'Vehicles', icon: 'directions-car' as const },
  { id: 'home', label: 'Home & Garden', icon: 'chair' as const },
  { id: 'entertainment', label: 'Entertainment', icon: 'theaters' as const },
  { id: 'music', label: 'Music', icon: 'music-note' as const },
  { id: 'sports', label: 'Sports', icon: 'sports-soccer' as const },
  { id: 'tools', label: 'Tools', icon: 'handyman' as const },
  { id: 'other', label: 'Other', icon: 'more-horiz' as const },
];

const conditions = [
  { id: 'new', label: 'New / Like New' },
  { id: 'good', label: 'Good' },
  { id: 'fair', label: 'Fair' },
  { id: 'needs_work', label: 'Needs Work' },
];

const sortOptions = [
  { value: 'relevant', label: 'Most Relevant' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
];

const matchesLocalFilters = (listing: MarketplaceListing, filters: MarketplaceSearchFilters) => {
  if (filters.category?.length && !filters.category.some((item) => listing.category.toLowerCase().includes(item.toLowerCase()))) {
    return false;
  }

  if (filters.condition?.length && !filters.condition.some((item) => listing.condition.toLowerCase().includes(item.toLowerCase()))) {
    return false;
  }

  if (filters.type?.length && !filters.type.includes(listing.type)) {
    return false;
  }

  if (filters.sellerVerified && !listing.seller.verified) {
    return false;
  }

  if (filters.ratingMin && listing.seller.rating < filters.ratingMin) {
    return false;
  }

  const price = listing.price.buy || listing.price.rent?.daily || 0;
  if (filters.minPrice !== null && price && price < filters.minPrice) {
    return false;
  }

  if (filters.maxPrice !== null && price && price > filters.maxPrice) {
    return false;
  }

  return true;
};

export default function SearchScreen() {
  const router = useRouter();
  const marketplaceQuery = useMarketplaceListings();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<MarketplaceSearchFilters>(defaultFilters);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<MarketplaceSearchFilters>(defaultFilters);
  const [sortBy, setSortBy] = useState('relevant');
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const [categorySearch, setCategorySearch] = useState('');

  const searchQuery = useMarketplaceSearch(searchText.trim(), filters, sortBy);

  useEffect(() => {
    setDraftFilters(filters);
    // Count active filters
    const count = (filters.category?.length || 0) + (filters.condition?.length || 0) + (filters.type?.length || 0) + 
      (filters.sellerVerified ? 1 : 0) + (filters.ratingMin > 0 ? 1 : 0) + 
      (filters.minPrice !== null ? 1 : 0) + (filters.maxPrice !== null ? 1 : 0);
    setActiveFilterCount(count);
  }, [filterModalOpen, filters]);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    return categories.filter(cat => 
      cat.label.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categorySearch]);

  const searchResults = useMemo(() => searchQuery.data?.pages.flatMap((page) => page.results) || [], [searchQuery.data]);
  const browseResults = useMemo(() => (marketplaceQuery.data || []).filter((item) => matchesLocalFilters(item, filters)), [filters, marketplaceQuery.data]);
  const displayingSearch = searchText.trim().length >= 2;
  const visibleListings = displayingSearch ? searchResults : browseResults;

  const applyFilters = () => {
    setFilters(draftFilters);
    setFilterModalOpen(false);
  };

  const clearFilters = () => {
    setDraftFilters(defaultFilters);
    setFilters(defaultFilters);
    setSearchText('');
    setSortBy('relevant');
    setCategorySearch('');
  };

  // Group listings into pairs for 2-column grid
  const listingPairs = useMemo(() => {
    const pairs: MarketplaceListing[][] = [];
    for (let i = 0; i < visibleListings.length; i += 2) {
      pairs.push(visibleListings.slice(i, i + 2));
    }
    return pairs;
  }, [visibleListings]);

  const renderGridRow = ({ item }: { item: MarketplaceListing[] }) => (
    <View style={styles.gridRow}>
      {item.map((listing) => (
        <View key={listing.id} style={styles.gridCell}>
          <ListingCard
            listing={listing}
            compact
            onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
          />
        </View>
      ))}
      {item.length === 1 ? <View style={styles.gridCell} /> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Browse</Text>
          <Text style={styles.subtitle}>Discover verified listings nearby</Text>

          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color={theme.colors.secondary.slate} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search listings, sellers..."
              placeholderTextColor={theme.colors.secondary.slate}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <Pressable onPress={() => setSearchText('')}>
                <MaterialIcons name="close" size={18} color={theme.colors.secondary.slate} />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Simple Toolbar */}
      <View style={styles.toolbar}>
        <Pressable 
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]} 
          onPress={() => setFilterModalOpen(true)}
        >
          <MaterialIcons 
            name="tune" 
            size={20} 
            color={activeFilterCount > 0 ? theme.colors.primary.blue : theme.colors.text.primary} 
          />
          <Text style={[styles.filterText, activeFilterCount > 0 && styles.filterTextActive]}>Filters</Text>
          {activeFilterCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>

        <Pressable style={styles.filterButton} onPress={() => setSortModalOpen(true)}>
          <MaterialIcons name="sort" size={20} color={theme.colors.text.primary} />
          <Text style={styles.filterText}>Sort</Text>
        </Pressable>

        {activeFilterCount > 0 && (
          <Pressable onPress={clearFilters} style={{ marginLeft: 'auto' }}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </View>

      {/* Results or Empty State */}
      {displayingSearch && searchQuery.isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary.blue} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : visibleListings.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyStateContainer}>
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={56} color={theme.colors.neutral.mediumGray} />
            <Text style={styles.emptyTitle}>No listings found</Text>
            <Text style={styles.emptyText}>
              {activeFilterCount > 0
                ? 'Try adjusting your filters to see more results.'
                : 'Try searching for a specific item or category.'}
            </Text>
            {activeFilterCount > 0 && (
              <Pressable style={styles.emptyButton} onPress={clearFilters}>
                <Text style={styles.emptyButtonText}>Clear Filters</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.listingsWrapper}>
          <View style={styles.resultCountView}>
            <Text style={styles.resultCount}>{visibleListings.length} listings</Text>
          </View>
          <FlatList
            data={listingPairs}
            keyExtractor={(_, index) => `pair-${index}`}
            renderItem={renderGridRow}
            contentContainerStyle={styles.gridContainer}
            scrollEnabled={true}
            refreshControl={
              <RefreshControl
                refreshing={marketplaceQuery.isRefetching || searchQuery.isRefetching}
                onRefresh={() => (displayingSearch ? searchQuery.refetch() : marketplaceQuery.refetch())}
                tintColor={theme.colors.primary.blue}
              />
            }
          />
        </View>
      )}

      {/* Filters Modal */}
      <Modal visible={filterModalOpen} animationType="slide" transparent onRequestClose={() => setFilterModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <Pressable onPress={() => setFilterModalOpen(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Category Search & Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Category</Text>
                <TextInput
                  style={styles.categorySearchInput}
                  placeholder="Search categories..."
                  placeholderTextColor={theme.colors.secondary.slate}
                  value={categorySearch}
                  onChangeText={setCategorySearch}
                />
                <View style={styles.categoryChipGroup}>
                  {filteredCategories.map((cat) => {
                    const selected = (draftFilters.category || []).includes(cat.label);
                    return (
                      <Pressable
                        key={cat.id}
                        style={[styles.filterChip, selected && styles.filterChipActive]}
                        onPress={() =>
                          setDraftFilters((current) => {
                            const isActive = (current.category || []).includes(cat.label);
                            const nextCategories = isActive
                              ? current.category!.filter((c) => c !== cat.label)
                              : [...(current.category || []), cat.label];
                            return { ...current, category: nextCategories };
                          })
                        }
                      >
                        <MaterialIcons
                          name={cat.icon}
                          size={16}
                          color={selected ? theme.colors.primary.blue : theme.colors.secondary.slate}
                        />
                        <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                          {cat.label}
                        </Text>
                        {selected && <MaterialIcons name="check" size={16} color={theme.colors.primary.blue} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Condition Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Condition</Text>
                <View style={styles.conditionChipGroup}>
                  {conditions.map((cond) => {
                    const selected = (draftFilters.condition || []).includes(cond.label);
                    return (
                      <Pressable
                        key={cond.id}
                        style={[styles.conditionChip, selected && styles.conditionChipActive]}
                        onPress={() =>
                          setDraftFilters((current) => {
                            const isActive = (current.condition || []).includes(cond.label);
                            const nextConditions = isActive
                              ? current.condition!.filter((c) => c !== cond.label)
                              : [...(current.condition || []), cond.label];
                            return { ...current, condition: nextConditions };
                          })
                        }
                      >
                        <Text style={[styles.conditionChipText, selected && styles.conditionChipTextActive]}>
                          {cond.label}
                        </Text>
                        {selected && <MaterialIcons name="check" size={14} color={theme.colors.primary.blue} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Price Range */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Price Range (PKR)</Text>
                <View style={styles.priceInputRow}>
                  <TextInput
                    style={styles.priceInput}
                    value={draftFilters.minPrice === null ? '' : String(draftFilters.minPrice)}
                    onChangeText={(value) =>
                      setDraftFilters((current) => ({
                        ...current,
                        minPrice: value ? Number(value) : null,
                      }))
                    }
                    placeholder="Min"
                    placeholderTextColor={theme.colors.secondary.slate}
                    keyboardType="numeric"
                  />
                  <Text style={styles.priceDash}>—</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={draftFilters.maxPrice === null ? '' : String(draftFilters.maxPrice)}
                    onChangeText={(value) =>
                      setDraftFilters((current) => ({
                        ...current,
                        maxPrice: value ? Number(value) : null,
                      }))
                    }
                    placeholder="Max"
                    placeholderTextColor={theme.colors.secondary.slate}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Listing Type */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Listing Type</Text>
                <View style={styles.typeChipGroup}>
                  {listingTypes.map((type) => {
                    const selected = (draftFilters.type || []).includes(type);
                    return (
                      <Pressable
                        key={type}
                        style={[styles.filterChip, selected && styles.filterChipActive]}
                        onPress={() =>
                          setDraftFilters((current) => {
                            const nextTypes = selected
                              ? (current.type || []).filter((t) => t !== type)
                              : [...(current.type || []), type];
                            return { ...current, type: nextTypes };
                          })
                        }
                      >
                        <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                          {type.toUpperCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Seller Rating */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Minimum Seller Rating</Text>
                <View style={styles.ratingChipGroup}>
                  {[0, 3, 4, 4.5].map((rating) => (
                    <Pressable
                      key={rating}
                      style={[styles.ratingChip, draftFilters.ratingMin === rating && styles.ratingChipActive]}
                      onPress={() =>
                        setDraftFilters((current) => ({
                          ...current,
                          ratingMin: current.ratingMin === rating ? 0 : rating,
                        }))
                      }
                    >
                      <MaterialIcons
                        name="star"
                        size={14}
                        color={draftFilters.ratingMin === rating ? theme.colors.primary.blue : theme.colors.secondary.slate}
                      />
                      <Text style={[styles.ratingChipText, draftFilters.ratingMin === rating && styles.ratingChipTextActive]}>
                        {rating === 0 ? 'Any' : `${rating}+`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Verified Sellers */}
              <View style={styles.filterSection}>
                <View style={styles.verifiedRow}>
                  <View>
                    <Text style={styles.verifiedTitle}>Verified Sellers</Text>
                    <Text style={styles.verifiedSubtitle}>Only show trusted sellers</Text>
                  </View>
                  <Switch
                    value={Boolean(draftFilters.sellerVerified)}
                    onValueChange={(value) =>
                      setDraftFilters((current) => ({ ...current, sellerVerified: value }))
                    }
                    trackColor={{ false: theme.colors.border.light, true: theme.colors.primary.blue }}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.secondaryButton} onPress={() => setFilterModalOpen(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={applyFilters}>
                <Text style={styles.primaryButtonText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal visible={sortModalOpen} animationType="slide" transparent onRequestClose={() => setSortModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <Pressable onPress={() => setSortModalOpen(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {sortOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[styles.sortOption, sortBy === option.value && styles.sortOptionActive]}
                  onPress={() => {
                    setSortBy(option.value);
                    setSortModalOpen(false);
                  }}
                >
                  <View style={[styles.radioButton, sortBy === option.value && styles.radioButtonActive]}>
                    {sortBy === option.value && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.sortOptionText, sortBy === option.value && styles.sortOptionTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.primaryButton} onPress={() => setSortModalOpen(false)}>
                <Text style={styles.primaryButtonText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  headerContainer: {
    backgroundColor: theme.colors.background.surface,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  headerContent: {
    paddingHorizontal: 16,
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral.veryLightGray,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text.primary,
    fontWeight: '500',
    fontSize: 14,
  },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
    gap: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.colors.neutral.veryLightGray,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary.blue,
    borderColor: theme.colors.primary.blue,
  },
  filterText: {
    color: theme.colors.text.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  filterTextActive: {
    color: theme.colors.text.inverse,
  },
  badge: {
    backgroundColor: theme.colors.status.warning,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: theme.colors.text.inverse,
    fontSize: 11,
    fontWeight: '800',
  },
  clearText: {
    color: theme.colors.primary.blue,
    fontWeight: '700',
    fontSize: 12,
  },

  // Grid Layout
  listingsWrapper: {
    flex: 1,
  },
  resultCountView: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultCount: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  gridContainer: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: 32,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },

  // Loading and Empty States
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: theme.colors.text.secondary,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyStateContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    color: theme.colors.text.primary,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary.blue,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: theme.colors.text.inverse,
    fontWeight: '700',
    fontSize: 13,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.background.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  modalTitle: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },

  // Filter Sections
  filterSection: {
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  filterSectionTitle: {
    color: theme.colors.text.primary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },

  // Category Search
  categorySearchInput: {
    backgroundColor: theme.colors.neutral.veryLightGray,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text.primary,
    fontWeight: '500',
    fontSize: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  categoryChipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // Filter Chips
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.neutral.veryLightGray,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  filterChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: theme.colors.primary.blue,
  },
  filterChipText: {
    color: theme.colors.text.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  filterChipTextActive: {
    color: theme.colors.primary.blue,
  },

  // Condition Chips
  conditionChipGroup: {
    gap: 8,
  },
  conditionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.neutral.veryLightGray,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  conditionChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: theme.colors.primary.blue,
  },
  conditionChipText: {
    color: theme.colors.text.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  conditionChipTextActive: {
    color: theme.colors.primary.blue,
  },

  // Price Inputs
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.neutral.veryLightGray,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    color: theme.colors.text.primary,
    fontWeight: '500',
    fontSize: 13,
  },
  priceDash: {
    color: theme.colors.text.secondary,
    fontWeight: '600',
    fontSize: 14,
  },

  // Type Chips
  typeChipGroup: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },

  // Rating Chips
  ratingChipGroup: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: theme.colors.neutral.veryLightGray,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  ratingChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: theme.colors.primary.blue,
  },
  ratingChipText: {
    color: theme.colors.text.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  ratingChipTextActive: {
    color: theme.colors.primary.blue,
  },

  // Verified Row
  verifiedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  verifiedTitle: {
    color: theme.colors.text.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  verifiedSubtitle: {
    color: theme.colors.text.secondary,
    fontWeight: '500',
    fontSize: 12,
    marginTop: 2,
  },

  // Sort Options
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.neutral.veryLightGray,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  sortOptionActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: theme.colors.primary.blue,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonActive: {
    borderColor: theme.colors.primary.blue,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary.blue,
  },
  sortOptionText: {
    color: theme.colors.text.primary,
    fontWeight: '600',
    fontSize: 14,
    flex: 1,
  },
  sortOptionTextActive: {
    color: theme.colors.primary.blue,
    fontWeight: '700',
  },

  // Buttons
  secondaryButton: {
    flex: 1,
    paddingVertical: 11,
    backgroundColor: theme.colors.neutral.veryLightGray,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.text.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 11,
    backgroundColor: theme.colors.primary.blue,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.colors.text.inverse,
    fontWeight: '800',
    fontSize: 14,
  },
});
