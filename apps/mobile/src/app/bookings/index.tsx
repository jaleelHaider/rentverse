import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View, Image, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useMyBookings, useApproveBookingMutation, useRejectBookingMutation } from '../../hooks/useListings';

interface Booking {
  id: string;
  listingTitle: string;
  buyerName: string;
  buyerImage?: string;
  requestDate: string;
  rentalStartDate?: string;
  rentalEndDate?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function MyBookingsScreen() {
  const { data: bookings, isLoading, refetch } = useMyBookings();
  const approveMutation = useApproveBookingMutation();
  const rejectMutation = useRejectBookingMutation();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(() => {
    void refetch();
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleApprove = (bookingId: string, buyerName: string) => {
    Alert.alert(
      'Approve Booking',
      `Approve booking from ${buyerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              await approveMutation.mutateAsync(bookingId);
              Alert.alert('Success', 'Booking approved!');
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to approve booking';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const handleReject = (bookingId: string, buyerName: string) => {
    Alert.alert(
      'Reject Booking',
      `Reject booking from ${buyerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectMutation.mutateAsync({ bookingId });
              Alert.alert('Success', 'Booking rejected.');
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to reject booking';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  if (isLoading && !bookings) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Booking Requests</Text>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      </View>
    );
  }

  const pendingBookings = ((bookings as any) || []).filter((b: any) => b.status === 'pending');
  const otherBookings = ((bookings as any) || []).filter((b: any) => b.status !== 'pending');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Booking Requests</Text>
        <View style={styles.headerStats}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{pendingBookings.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </View>

      {pendingBookings.length === 0 && otherBookings.length === 0 ? (
        <View style={styles.centerContent}>
          <MaterialIcons name="event-busy" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No booking requests yet</Text>
          <Text style={styles.emptySubtext}>
            Booking requests from renters will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...pendingBookings, ...otherBookings]}
          renderItem={({ item }) => <BookingCard booking={item} onApprove={handleApprove} onReject={handleReject} />}
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

function BookingCard({
  booking,
  onApprove,
  onReject,
}: {
  booking: Booking;
  onApprove: (id: string, name: string) => void;
  onReject: (id: string, name: string) => void;
}) {
  const isPending = booking.status === 'pending';

  return (
    <View style={[styles.card, !isPending && styles.cardInactive]}>
      <View style={styles.cardHeader}>
        <View style={styles.buyerInfo}>
          {booking.buyerImage && (
            <Image source={{ uri: booking.buyerImage }} style={styles.buyerImage} />
          )}
          {!booking.buyerImage && (
            <View style={styles.buyerImagePlaceholder}>
              <MaterialIcons name="person" size={20} color="#94a3b8" />
            </View>
          )}
          <View style={styles.buyerDetails}>
            <Text style={styles.buyerName}>{booking.buyerName}</Text>
            <Text style={styles.listingTitle}>{booking.listingTitle}</Text>
          </View>
        </View>
        <View style={[styles.badge, !isPending && styles.badgeInactive]}>
          <Text style={styles.badgeText}>
            {booking.status === 'approved' ? '✓ Approved' : booking.status === 'rejected' ? '✗ Rejected' : 'Pending'}
          </Text>
        </View>
      </View>

      {booking.rentalStartDate && (
        <View style={styles.cardContent}>
          <View style={styles.dateRow}>
            <MaterialIcons name="calendar-today" size={16} color="#64748b" />
            <Text style={styles.dateText}>
              {new Date(booking.rentalStartDate).toLocaleDateString()}
              {booking.rentalEndDate && ` - ${new Date(booking.rentalEndDate).toLocaleDateString()}`}
            </Text>
          </View>
        </View>
      )}

      {isPending && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => onReject(booking.id, booking.buyerName)}
          >
            <MaterialIcons name="close" size={16} color="#ef4444" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => onApprove(booking.id, booking.buyerName)}
          >
            <MaterialIcons name="check" size={16} color="#fff" />
            <Text style={styles.approveButtonText}>Approve</Text>
          </Pressable>
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
  cardInactive: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  buyerInfo: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  buyerImage: {
    width: 40,
    height: 40,
    borderRadius: 50,
  },
  buyerImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyerDetails: {
    flex: 1,
  },
  buyerName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  listingTitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeInactive: {
    backgroundColor: '#f1f5f9',
  },
  badgeText: {
    color: '#92400e',
    fontSize: 11,
    fontWeight: '700',
  },
  cardContent: {
    gap: 8,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  rejectButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  rejectButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  approveButton: {
    backgroundColor: '#1d4ed8',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
