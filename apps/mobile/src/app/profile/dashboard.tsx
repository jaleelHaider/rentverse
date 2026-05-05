import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useCurrentAuthProfile } from '../../hooks/useProfile';
import { useMyListings } from '../../hooks/useListings';
import { useMyOrders } from '../../hooks/useOrders';
import { useProfileSummary } from '../../hooks/useProfile';

export default function ProfileDashboardScreen() {
  const router = useRouter();
  const profileQuery = useCurrentAuthProfile();
  const listingsQuery = useMyListings();
  const ordersQuery = useMyOrders();
  const [refreshing, setRefreshing] = useState(false);

  const profile = profileQuery.data?.user;
  const listings = listingsQuery.data || [];
  const ordersData = ordersQuery.data;
  const orders = Array.isArray(ordersData) 
    ? ordersData 
    : ordersData 
      ? [...(ordersData.buyingOrders || []), ...(ordersData.sellingOrders || []), ...(ordersData.rentingOrders || [])]
      : [];

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([
      profileQuery.refetch(),
      listingsQuery.refetch(),
      ordersQuery.refetch(),
    ]).finally(() => setRefreshing(false));
  }, [profileQuery, listingsQuery, ordersQuery]);

  const stats = {
    activeListings: listings.filter((l) => l.status === 'active').length,
    totalListings: listings.length,
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => o.status === 'pending').length,
    completedOrders: orders.filter((o) => o.status === 'completed').length,
    totalViews: listings.reduce((sum, l) => sum + (l.views || 0), 0),
    totalSaves: listings.reduce((sum, l) => sum + (l.saves || 0), 0),
  };

  if (profileQuery.isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Welcome back, {String(profile?.user_metadata?.full_name || 'User').split(' ')[0]}!</Text>
      </View>

      {/* Main Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          icon={<MaterialIcons name="inventory" size={24} color="#3b82f6" />}
          label="Active Listings"
          value={stats.activeListings.toString()}
          bgColor="#eff6ff"
          onPress={() => router.push('./my-listings')}
        />
        <StatCard
          icon={<MaterialIcons name="shopping-bag" size={24} color="#10b981" />}
          label="Total Orders"
          value={stats.totalOrders.toString()}
          bgColor="#ecfdf5"
          onPress={() => router.push('./my-bookings')}
        />
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          icon={<MaterialIcons name="trending-up" size={24} color="#f59e0b" />}
          label="Total Views"
          value={stats.totalViews.toString()}
          bgColor="#fffbeb"
          onPress={() => {}}
        />
        <StatCard
          icon={<MaterialIcons name="star" size={24} color="#ec4899" />}
          label="Total Saves"
          value={stats.totalSaves.toString()}
          bgColor="#fdf2f8"
          onPress={() => {}}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <ActionButton
            label="Create Listing"
            onPress={() => router.push('/create')}
            color="#3b82f6"
          />
          <ActionButton
            label="My Listings"
            onPress={() => router.push('./my-listings')}
            color="#10b981"
          />
          <ActionButton
            label="Bookings"
            onPress={() => router.push('./my-bookings')}
            color="#f59e0b"
          />
          <ActionButton
            label="Reviews"
            onPress={() => router.push('./reviews')}
            color="#8b5cf6"
          />
        </View>
      </View>

      {/* Recent Orders Summary */}
      {stats.pendingOrders > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Approvals</Text>
            <Pressable onPress={() => router.push('./my-bookings')}>
              <Text style={styles.viewAllLink}>View All →</Text>
            </Pressable>
          </View>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Waiting for your response</Text>
              <Text style={styles.summaryValue}>{stats.pendingOrders}</Text>
            </View>
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={() => router.push('./my-bookings')}
            >
              <Text style={styles.primaryButtonText}>Review Requests</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Statistics Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance</Text>
        <View style={styles.card}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Listings</Text>
              <Text style={styles.statValue}>{stats.totalListings}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Views</Text>
              <Text style={styles.statValue}>{stats.totalViews}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Saves</Text>
              <Text style={styles.statValue}>{stats.totalSaves}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Profile Completion */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Strength</Text>
        <View style={styles.card}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '60%' }]} />
            </View>
            <Text style={styles.progressText}>60% Complete</Text>
          </View>
          <Pressable
            style={[styles.button, styles.outlineButton]}
            onPress={() => router.push('/profile/settings')}
          >
            <Text style={styles.outlineButtonText}>Complete Profile</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({ icon, label, value, bgColor, onPress }) {
  return (
    <Pressable style={[styles.statCard, { backgroundColor: bgColor }]} onPress={onPress}>
      <View style={styles.statCardIcon}>{icon}</View>
      <View style={styles.statCardContent}>
        <Text style={styles.statCardValue}>{value}</Text>
        <Text style={styles.statCardLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

function ActionButton({ label, onPress, color }) {
  return (
    <Pressable
      style={[
        styles.actionButton,
        {
          backgroundColor: `${color}15`,
          borderColor: color,
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.actionButtonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  headerSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  statCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardContent: {
    flex: 1,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  statCardLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  viewAllLink: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '48%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f59e0b',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 12,
  },
  outlineButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  progressText: {
    fontSize: 13,
    color: '#64748b',
  },
});
