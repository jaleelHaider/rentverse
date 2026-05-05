import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useMyOrders } from '../../hooks/useOrders';

interface Order {
  id: string;
  listingTitle: string;
  sellerName?: string;
  buyerName?: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  rentalStartDate?: string;
  rentalEndDate?: string;
}

export default function MyOrdersScreen() {
  const router = useRouter();
  const { data: orders, isLoading, refetch } = useMyOrders();
  const [activeTab, setActiveTab] = useState<'buying' | 'selling' | 'renting'>('buying');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(() => {
    void refetch();
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading && !orders) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Orders</Text>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      </View>
    );
  }

  const buyingOrders = orders?.buyingOrders || [];
  const sellingOrders = orders?.sellingOrders || [];
  const rentingOrders = orders?.rentingOrders || [];

  const activeOrders =
    activeTab === 'buying' ? buyingOrders : activeTab === 'selling' ? sellingOrders : rentingOrders;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'buying' && styles.tabActive]}
          onPress={() => setActiveTab('buying')}
        >
          <Text style={[styles.tabText, activeTab === 'buying' && styles.tabTextActive]}>
            Buying ({buyingOrders.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'selling' && styles.tabActive]}
          onPress={() => setActiveTab('selling')}
        >
          <Text style={[styles.tabText, activeTab === 'selling' && styles.tabTextActive]}>
            Selling ({sellingOrders.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'renting' && styles.tabActive]}
          onPress={() => setActiveTab('renting')}
        >
          <Text style={[styles.tabText, activeTab === 'renting' && styles.tabTextActive]}>
            Renting ({rentingOrders.length})
          </Text>
        </Pressable>
      </View>

      {activeOrders.length === 0 ? (
        <View style={styles.centerContent}>
          <MaterialIcons name="shopping-bag" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'buying'
              ? 'Orders you purchase will appear here'
              : activeTab === 'selling'
              ? 'Orders you receive will appear here'
              : 'Rental orders will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeOrders}
          renderItem={({ item }) => <OrderCard order={item} onPress={() => router.push(`/(tabs)/orders/${item.id}` as any)} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
}

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#fbbf24';
      case 'approved':
        return '#60a5fa';
      case 'in_transit':
        return '#06b6d4';
      case 'delivered':
      case 'completed':
        return '#10b981';
      case 'rejected':
      case 'cancelled':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>Order #{order.id.slice(0, 8)}</Text>
          <Text style={styles.orderTitle}>{order.listingTitle}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        {order.rentalStartDate && (
          <Text style={styles.rentalDates}>
            {formatDate(order.rentalStartDate)} - {formatDate(order.rentalEndDate!)}
          </Text>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Total Price</Text>
          <Text style={styles.price}>PKR {order.totalPrice.toLocaleString()}</Text>
        </View>
      </View>

      <Pressable style={styles.viewButton}>
        <Text style={styles.viewButtonText}>View Details</Text>
        <MaterialIcons name="arrow-forward" size={16} color="#1d4ed8" />
      </Pressable>
    </Pressable>
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
    paddingBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1d4ed8',
  },
  tabText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
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
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  orderTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  orderDate: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardContent: {
    gap: 8,
    marginBottom: 12,
  },
  rentalDates: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  price: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '700',
  },
  viewButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 6,
  },
  viewButtonText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
});
