import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useMyListings, useDeleteListingMutation } from '../../hooks/useListings';

export default function MyListingsScreen() {
  const router = useRouter();
  const listingsQuery = useMyListings();
  const deleteListingMutation = useDeleteListingMutation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const listings = listingsQuery.data || [];
  const isLoading = listingsQuery.isLoading;

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    listingsQuery.refetch().finally(() => setRefreshing(false));
  }, [listingsQuery]);

  const filteredListings = listings.filter((listing) => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || listing.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDeleteListing = (id: string, title: string) => {
    Alert.alert('Delete Listing', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await deleteListingMutation.mutateAsync(id);
            Alert.alert('Success', 'Listing deleted');
          } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete listing');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const stats = {
    total: listings.length,
    active: listings.filter((l) => l.status === 'active').length,
    views: listings.reduce((sum, l) => sum + (l.views || 0), 0),
    saves: listings.reduce((sum, l) => sum + (l.saves || 0), 0),
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Listings</Text>
          <Text style={styles.subtitle}>{listings.length} listings</Text>
        </View>
        <Pressable
          style={styles.createButton}
          onPress={() => router.push('/create')}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <StatBadge label="Active" value={stats.active} />
        <StatBadge label="Views" value={stats.views} />
        <StatBadge label="Saves" value={stats.saves} />
      </View>

      {/* Search & Filter */}
      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search listings..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#cbd5e1"
        />
      </View>

      {/* Status Filter */}
      <View style={styles.filterBar}>
        {['all', 'active', 'pending', 'sold', 'rented', 'paused'].map((status) => (
          <Pressable
            key={status}
            style={[styles.filterButton, statusFilter === status && styles.filterButtonActive]}
            onPress={() => setStatusFilter(status)}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusFilter === status && styles.filterButtonTextActive,
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Listings */}
      <ScrollView
        style={styles.listingsContainer}
        contentContainerStyle={styles.listingsContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredListings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No listings found</Text>
            <Text style={styles.emptyStateText}>
              {listings.length === 0
                ? 'Create your first listing to get started'
                : 'No listings match your filters'}
            </Text>
            {listings.length === 0 && (
              <Pressable
                style={[styles.button, styles.primaryButton]}
                onPress={() => router.push('/create')}
              >
                <MaterialIcons name="add" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Create Listing</Text>
              </Pressable>
            )}
          </View>
        ) : (
          filteredListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onEdit={() => router.push(`./edit?id=${listing.id}`)}
                onView={() => router.push(`/listing/${listing.id}`)}
                onDelete={() => handleDeleteListing(listing.id, listing.title)}
                isMenuExpanded={expandedMenu === listing.id}
                onMenuToggle={() => setExpandedMenu(expandedMenu === listing.id ? null : listing.id)}
                isDeleting={deleteListingMutation.isPending}
              />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function StatBadge({ label, value }) {
  return (
    <View style={styles.statBadge}>
      <Text style={styles.statBadgeLabel}>{label}</Text>
      <Text style={styles.statBadgeValue}>{value}</Text>
    </View>
  );
}

function ListingCard({
  listing,
  onEdit,
  onView,
  onDelete,
  isMenuExpanded,
  onMenuToggle,
  isDeleting,
}) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'sold':
        return '#3b82f6';
      case 'rented':
        return '#8b5cf6';
      case 'paused':
        return '#6b7280';
      default:
        return '#64748b';
    }
  };

  return (
    <View style={styles.listingCard}>
      <View style={styles.listingImageContainer}>
        {listing.images && listing.images.length > 0 ? (
          <Image source={{ uri: listing.images[0] }} style={styles.listingImage} />
        ) : (
          <View style={styles.listingImagePlaceholder}>
            <Text style={styles.placeholderText}>No image</Text>
          </View>
        )}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(listing.status) },
          ]}
        >
          <Text style={styles.statusText}>{listing.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.listingContent}>
        <Text style={styles.listingTitle} numberOfLines={2}>
          {listing.title}
        </Text>
        <Text style={styles.listingCategory}>{listing.categoryPath}</Text>

        <View style={styles.priceContainer}>
          {listing.price.buy && (
            <Text style={styles.price}>Buy: Rs. {listing.price.buy.toLocaleString()}</Text>
          )}
          {listing.price.rentDaily && (
            <Text style={styles.price}>Rent: Rs. {listing.price.rentDaily}/day</Text>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <MaterialIcons name="visibility" size={16} color="#64748b" />
            <Text style={styles.statText}>{listing.views || 0}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statText}>❤️ {listing.saves || 0}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <Pressable style={styles.iconButton} onPress={onView}>
          <MaterialIcons name="visibility" size={20} color="#3b82f6" />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={onEdit}>
          <MaterialIcons name="edit" size={20} color="#10b981" />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={onDelete} disabled={isDeleting}>
          <MaterialIcons name="delete" size={20} color="#ef4444" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f0f9ff',
  },
  statBadge: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
  },
  statBadgeLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  statBadgeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3b82f6',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1e293b',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  filterButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: '#3b82f6',
  },
  listingsContainer: {
    flex: 1,
  },
  listingsContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  listingImageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
    backgroundColor: '#f1f5f9',
  },
  listingImage: {
    width: '100%',
    height: '100%',
  },
  listingImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  listingContent: {
    padding: 12,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  listingCategory: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  priceContainer: {
    marginBottom: 8,
  },
  price: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#64748b',
  },
  actionButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  iconButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
});
