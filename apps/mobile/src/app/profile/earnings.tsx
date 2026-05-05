import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMyListings } from '../../hooks/useListings';

export default function EarningsScreen() {
  const listingsQuery = useMyListings();
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');

  const listings = listingsQuery.data || [];
  const isLoading = listingsQuery.isLoading;

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    listingsQuery.refetch().finally(() => setRefreshing(false));
  }, [listingsQuery]);

  // Calculate earnings statistics
  const stats = {
    totalEarnings: listings.reduce((sum, l) => {
      // Calculate based on buy price or daily rent
      const buyEarnings = l.price?.buy ? l.price.buy * (l.views || 1) * 0.1 : 0; // Rough estimate
      const rentEarnings = l.price?.rentDaily ? l.price.rentDaily * 30 : 0; // Approximate
      return sum + Math.max(buyEarnings, rentEarnings);
    }, 0),
    currentMonth: 0, // Would come from backend
    pending: 0, // Would come from backend
    completed: 0, // Would come from backend
    paymentMethod: 'Bank Transfer',
    nextPayoutDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString(),
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
        <Text style={styles.title}>Earnings & Payouts</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Main Earnings Card */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsLeft}>
            <Text style={styles.earningsLabel}>Total Earnings</Text>
            <Text style={styles.earningsAmount}>
              Rs. {stats.totalEarnings.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.earningsSubtext}>
              From {listings.length} active listings
            </Text>
          </View>
          <View style={styles.earningsRight}>
            <MaterialIcons name="attach-money" size={48} color="#10b981" />
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            label="This Month"
            value={`Rs. ${stats.currentMonth.toLocaleString()}`}
            icon={<MaterialIcons name="event" size={20} color="#3b82f6" />}
            bgColor="#eff6ff"
          />
          <StatCard
            label="Pending"
            value={`Rs. ${stats.pending.toLocaleString()}`}
            icon={<MaterialIcons name="trending-up" size={20} color="#f59e0b" />}
            bgColor="#fffbeb"
          />
        </View>

        {/* Payout Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payout Information</Text>

          <View style={styles.infoCard}>
            <InfoRow label="Payout Method" value={stats.paymentMethod} />
            <InfoRow label="Next Payout" value={stats.nextPayoutDate} />
            <InfoRow label="Account Status" value="Active" />

            <Pressable style={[styles.button, styles.primaryButton]}>
              <MaterialIcons name="file-download" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Download Statement</Text>
            </Pressable>
          </View>
        </View>

        {/* Earnings Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings Breakdown</Text>

          <View style={styles.breakdownCard}>
            <BreakdownItem
              type="Sales"
              amount={stats.totalEarnings * 0.6}
              percentage={60}
              color="#10b981"
            />
            <BreakdownItem
              type="Rentals"
              amount={stats.totalEarnings * 0.35}
              percentage={35}
              color="#3b82f6"
            />
            <BreakdownItem
              type="Commissions"
              amount={stats.totalEarnings * 0.05}
              percentage={5}
              color="#ef4444"
            />
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <Pressable>
              <Text style={styles.viewAllLink}>View All →</Text>
            </Pressable>
          </View>

          <View style={styles.transactionsList}>
            {[
              { date: '2 days ago', type: 'Sale', amount: 4500, status: 'completed' },
              { date: '1 week ago', type: 'Rental', amount: 350, status: 'completed' },
              { date: '2 weeks ago', type: 'Sale', amount: 8900, status: 'pending' },
            ].map((tx, idx) => (
              <TransactionItem key={idx} transaction={tx} />
            ))}
          </View>
        </View>

        {/* Bank Account Management */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>Bank Account</Text>

          <View style={styles.bankCard}>
            <View style={styles.bankCardTop}>
              <View>
                <Text style={styles.bankCardLabel}>Primary Account</Text>
                <Text style={styles.bankCardNumber}>****2547</Text>
              </View>
              <View style={styles.bankCardBadge}>
                <Text style={styles.bankCardBadgeText}>Active</Text>
              </View>
            </View>
            <View style={styles.bankCardFooter}>
              <Text style={styles.bankCardBank}>HBL - Habib Bank Limited</Text>
              <Pressable>
                <Text style={styles.editLink}>Edit</Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={[styles.button, styles.outlineButton]}>
            <Text style={styles.outlineButtonText}>Add Bank Account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, icon, bgColor }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <View>
        <Text style={styles.statCardLabel}>{label}</Text>
        <Text style={styles.statCardValue}>{value}</Text>
      </View>
      <View style={styles.statCardIcon}>{icon}</View>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function BreakdownItem({ type, amount, percentage, color }) {
  return (
    <View style={styles.breakdownItem}>
      <View style={styles.breakdownLeft}>
        <View style={[styles.breakdownColor, { backgroundColor: color }]} />
        <View>
          <Text style={styles.breakdownType}>{type}</Text>
          <Text style={styles.breakdownAmount}>Rs. {amount.toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.breakdownPercentage}>
        <Text style={styles.breakdownPercentageText}>{percentage}%</Text>
      </View>
    </View>
  );
}

function TransactionItem({ transaction }) {
  return (
    <View style={styles.transactionItem}>
      <View>
        <Text style={styles.transactionType}>{transaction.type}</Text>
        <Text style={styles.transactionDate}>{transaction.date}</Text>
      </View>
      <View style={styles.transactionRight}>
        <Text style={styles.transactionAmount}>+Rs. {transaction.amount.toLocaleString()}</Text>
        <View
          style={[
            styles.transactionStatus,
            {
              backgroundColor:
                transaction.status === 'completed' ? '#ecfdf5' : '#fef3c7',
            },
          ]}
        >
          <Text
            style={[
              styles.transactionStatusText,
              {
                color:
                  transaction.status === 'completed' ? '#10b981' : '#f59e0b',
              },
            ]}
          >
            {transaction.status === 'completed' ? 'Completed' : 'Pending'}
          </Text>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  earningsCard: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLeft: {
    flex: 1,
  },
  earningsLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginVertical: 8,
  },
  earningsSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  earningsRight: {
    opacity: 0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCardLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  statCardIcon: {},
  section: {
    marginBottom: 20,
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
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
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
    marginTop: 0,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    marginTop: 12,
  },
  outlineButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  breakdownColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  breakdownType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  breakdownAmount: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  breakdownPercentage: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
  },
  breakdownPercentageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  transactionsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  transactionType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  transactionDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  transactionAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
  },
  transactionStatus: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  transactionStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  bankCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  bankCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  bankCardLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  bankCardNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
  bankCardBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#ecfdf5',
    borderRadius: 4,
  },
  bankCardBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  bankCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankCardBank: {
    fontSize: 12,
    color: '#64748b',
  },
  editLink: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
});
