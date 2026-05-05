import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useMyListings } from '../../hooks/useListings';
import { ListingCard } from '../../components/listings/ListingCard';
import theme from '../../constants/theme';

export default function CreateScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { data: listings, isLoading, refetch } = useMyListings();

  if (!currentUser?.id) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Create & Manage</Text>
        </View>

        <View style={styles.authState}>
          <View style={styles.lockIconContainer}>
            <MaterialIcons name="lock-outline" size={48} color={theme.colors.primary.blue} />
          </View>
          <Text style={styles.authTitle}>Sign in to post</Text>
          <Text style={styles.authText}>You need an account to create listings, message sellers, and manage your rentals.</Text>
          <View style={styles.authActions}>
            <TouchableOpacity style={styles.authPrimary} onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.authPrimaryText}>Log in</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.authSecondary} onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.authSecondaryText}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Create & Manage</Text>
        <Text style={styles.pageSubtitle}>Turn your unused items into extra income</Text>
      </View>

      <FlatList
        key={2}
        data={listings || []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.rowWrapper}
        refreshing={isLoading}
        onRefresh={refetch}
        ListHeaderComponent={
          <View style={styles.headerComponent}>
            {/* Create Button */}
            <TouchableOpacity
              style={styles.createCard}
              onPress={() => router.push('/create')}
              activeOpacity={0.8}
            >
              <View style={styles.createCardContent}>
                <View style={styles.createIconWrapper}>
                  <MaterialIcons name="add-circle" size={40} color="#fff" />
                </View>
                <View style={styles.createTextWrapper}>
                  <Text style={styles.createTitle}>Post a New Listing</Text>
                  <Text style={styles.createSubtitle}>It only takes a few minutes to get started</Text>
                </View>
                <MaterialIcons name="chevron-right" size={28} color="rgba(255,255,255,0.6)" />
              </View>
            </TouchableOpacity>

            {/* Quick Tips */}
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Quick Tips for Success</Text>
              <View style={styles.tipsGrid}>
                <View style={styles.tipItem}>
                  <MaterialIcons name="photo-camera" size={20} color={theme.colors.primary.blue} />
                  <Text style={styles.tipText}>Use bright, clear photos</Text>
                </View>
                <View style={styles.tipItem}>
                  <MaterialIcons name="description" size={20} color={theme.colors.status.warning} />
                  <Text style={styles.tipText}>Write a detailed description</Text>
                </View>
                <View style={styles.tipItem}>
                  <MaterialIcons name="local-offer" size={20} color={theme.colors.status.success} />
                  <Text style={styles.tipText}>Set a competitive price</Text>
                </View>
              </View>
            </View>

            {/* Section Title */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Listings</Text>
              {listings && listings.length > 0 && (
                <Text style={styles.sectionBadge}>{listings.length}</Text>
              )}
            </View>

            {isLoading && !listings ? (
              <ActivityIndicator size="large" color={theme.colors.primary.blue} style={styles.loader} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBg}>
                <MaterialIcons name="storefront" size={48} color={theme.colors.neutral.mediumGray} />
              </View>
              <Text style={styles.emptyTitle}>Your shop is empty</Text>
              <Text style={styles.emptyText}>Tap the button above to create your first listing and start reaching buyers and renters.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <ListingCard 
              listing={item} 
              onPress={() => router.push(`/listing/${item.id}`)}
              compact={true}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: theme.colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text.primary,
  },
  pageSubtitle: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 40,
  },
  headerComponent: {
    paddingBottom: 16,
  },
  createCard: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 24,
    backgroundColor: theme.colors.primary.blue,
    borderRadius: 20,
    padding: 20,
    shadowColor: theme.colors.primary.blue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  createCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  createIconWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 16,
  },
  createTextWrapper: {
    flex: 1,
  },
  createTitle: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 4,
  },
  createSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    lineHeight: 18,
  },
  tipsContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: theme.colors.background.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  tipsGrid: {
    gap: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text.primary,
  },
  sectionBadge: {
    backgroundColor: theme.colors.primary.blue,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  rowWrapper: {
    paddingHorizontal: 10,
    justifyContent: 'space-between',
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 6,
    maxWidth: '50%',
  },
  loader: {
    marginTop: 32,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  emptyText: {
    marginTop: 10,
    textAlign: 'center',
    color: theme.colors.text.secondary,
    lineHeight: 22,
    fontSize: 15,
  },
  authState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  lockIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text.primary,
  },
  authText: {
    marginTop: 12,
    fontSize: 15,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  authActions: {
    marginTop: 32,
    flexDirection: 'row',
    gap: 12,
  },
  authPrimary: {
    backgroundColor: theme.colors.primary.blue,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  authPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  authSecondary: {
    backgroundColor: theme.colors.neutral.lightBorder,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  authSecondaryText: {
    color: theme.colors.text.primary,
    fontWeight: '700',
    fontSize: 16,
  },
});
