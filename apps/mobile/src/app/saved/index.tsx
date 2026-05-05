import { View, Text, ScrollView, StyleSheet, Pressable, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { ListingCard } from '../../components/listings/ListingCard';

// Mock saved listings
const mockSavedListings = [
  {
    id: 'listing001',
    title: 'iPhone 13 Pro',
    category: 'Electronics',
    price: { buy: 45000, rent: { daily: 500, weekly: 2500, monthly: 8000 } },
    images: [],
    seller: { id: 'user123', name: 'Ahmed Hassan', avatar: null },
    rating: 4.8,
    isFeatured: true,
  },
  {
    id: 'listing002',
    title: 'Mountain Bike',
    category: 'Sports',
    price: { buy: 15000, rent: { daily: 300, weekly: 1500, monthly: 5000 } },
    images: [],
    seller: { id: 'user456', name: 'Ali Khan', avatar: null },
    rating: 4.5,
    isFeatured: false,
  },
  {
    id: 'listing003',
    title: 'Gaming Laptop',
    category: 'Electronics',
    price: { buy: 80000, rent: { daily: 800, weekly: 4000, monthly: 12000 } },
    images: [],
    seller: { id: 'user789', name: 'Sara Malik', avatar: null },
    rating: 4.9,
    isFeatured: true,
  },
];

export default function SavedListingsScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();

  if (!currentUser?.id) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.pageTitle}>Saved Items</Text>
        </View>
        <View style={styles.emptyState}>
          <MaterialIcons name="favorite-outline" size={56} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Login to save items</Text>
          <Text style={styles.emptyText}>Bookmark listings to view them later</Text>
          <Pressable style={styles.loginButton} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginButtonText}>Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

const renderListing = ({ item }: any) => (
    <Pressable onPress={() => router.push({pathname:'/listing/[id]', params:{id:item.id}} as any)}>
      <ListingCard listing={item} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.pageTitle}>Saved Items</Text>
      </View>

      {/* Listings Grid */}
      {mockSavedListings.length > 0 ? (
        <FlatList
          data={mockSavedListings}
          renderItem={renderListing}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          scrollEnabled
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons name="favorite-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No saved items</Text>
          <Text style={styles.emptyText}>Browse and save listings to bookmark them</Text>
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  loginButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
