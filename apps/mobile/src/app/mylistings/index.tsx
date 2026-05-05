import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View, RefreshControl, Image } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useMyListings, useDeleteListingMutation } from '../../hooks/useListings';

export default function MyListingsScreen() {
  const router = useRouter();
  const { data: myListings, isLoading, refetch } = useMyListings();
  const deleteMutation = useDeleteListingMutation();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(() => {
    void refetch();
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete Listing',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(id);
              Alert.alert('Success', 'Listing deleted successfully.');
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to delete listing';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  if (isLoading && !myListings) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Listings</Text>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      </View>
    );
  }

  const listings = (Array.isArray(myListings) ? myListings : []) as any[];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Listings</Text>
        <View style={styles.headerStats}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{listings.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>
      </View>

      {listings.length === 0 ? (
        <View style={styles.centerContent}>
          <MaterialIcons name="shopping-bag" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No listings yet</Text>
          <Text style={styles.emptySubtext}>Create your first listing to get started</Text>
          <Pressable style={styles.createButton} onPress={() => router.push('/create' as any)}>
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Create Listing</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={listings}
          renderItem={({ item }) => (
            <View style={styles.listingWrapper}>
              <View style={styles.itemCard}>
                {item.images && item.images[0] && (
                  <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.itemPrice}>PKR {((item.price as any)?.buy || 0).toLocaleString()}</Text>
                  <Text style={styles.itemLocation}>{item.location?.city}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => router.back()}
                >
                  <MaterialIcons name="edit" size={16} color="#1d4ed8" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(item.id, item.title)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <>
                      <MaterialIcons name="delete" size={16} color="#ef4444" />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}

      {listings.length > 0 && (
        <Pressable style={styles.floatingButton} onPress={() => router.push('/create' as any)}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </Pressable>
      )}
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
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 12,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statValue: {
    color: '#1d4ed8',
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  columnWrapper: {
    gap: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  listingWrapper: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#f1f5f9',
  },
  itemInfo: {
    padding: 10,
  },
  itemTitle: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  itemPrice: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  itemLocation: {
    color: '#64748b',
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#1d4ed8',
  },
  editButtonText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 50,
    backgroundColor: '#1d4ed8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
