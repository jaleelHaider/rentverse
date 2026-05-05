import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useOrderDetails, useCancelOrderMutation, useConfirmDeliveryMutation } from '../../hooks/useOrders';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { data: order, isLoading } = useOrderDetails(id as string);
  const cancelMutation = useCancelOrderMutation();
  const confirmMutation = useConfirmDeliveryMutation();

  if (isLoading || !order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.title}>Order Details</Text>
        </View>
        {isLoading && (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#1d4ed8" />
          </View>
        )}
      </View>
    );
  }

  const isBuyer = currentUser?.id === order.buyerId;
  const isSeller = currentUser?.id === order.sellerId;
  const canCancel = isBuyer && order.status === 'pending_seller_approval';
  const canConfirmDelivery = isBuyer && (order.status === 'handover_otp_pending' || order.status === 'in_use');

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelMutation.mutateAsync({ orderId: order.id });
              Alert.alert('Success', 'Order cancelled.');
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to cancel';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const handleConfirmDelivery = () => {
    Alert.alert(
      'Confirm Delivery',
      'Please confirm that you have received the item.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'default',
          onPress: async () => {
            try {
              await confirmMutation.mutateAsync(order.id);
              Alert.alert('Success', 'Delivery confirmed!');
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to confirm';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending_seller_approval':
      case 'pending':
        return '#fbbf24';
      case 'approved':
        return '#60a5fa';
      case 'handover_otp_pending':
      case 'in_use':
      case 'return_otp_pending':
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Order Details</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
        {/* Status Section */}
        <View style={styles.section}>
          <View style={styles.statusHeader}>
            <Text style={styles.sectionTitle}>Order Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>
                {order.status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
              </Text>
            </View>
          </View>

          {/* Status Timeline */}
          <View style={styles.timeline}>
            <TimelineItem
              step={1}
              title="Order Placed"
              completed={true}
              date={formatDate(order.createdAt)}
            />
            <TimelineItem
              step={2}
              title={isSeller ? 'Approve Order' : 'Order Approved'}
              completed={order.status !== 'pending_seller_approval'}
              date={order.status !== 'pending_seller_approval' ? 'Processing' : 'Pending'}
            />
            <TimelineItem
              step={3}
              title="In Transit"
              completed={order.status === 'handover_otp_pending' || order.status === 'in_use' || order.status === 'return_otp_pending' || order.status === 'completed'}
              date={order.status === 'handover_otp_pending' || order.status === 'in_use' || order.status === 'return_otp_pending' || order.status === 'completed' ? 'On the way' : 'Pending'}
            />
            <TimelineItem
              step={4}
              title="Delivered"
              completed={order.status === 'completed'}
              date={order.completedAt ? formatDate(order.completedAt) : 'Pending'}
            />
          </View>
        </View>

        {/* Order Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order ID</Text>
            <Text style={styles.infoValue}>{order.id}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Item</Text>
            <Text style={styles.infoValue}>{order.listingTitle}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{isSeller ? 'Buyer' : 'Seller'}</Text>
            <Text style={styles.infoValue}>{isSeller ? order.fullName : currentUser?.id === order.buyerId ? 'Seller assigned' : `User ${order.sellerId.slice(0, 8)}`}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Type</Text>
            <Text style={styles.infoValue}>
              {order.mode === 'buy' ? 'Purchase' : 'Rental'}
            </Text>
          </View>

          {order.mode === 'rent' && order.durationCount && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rental Period</Text>
              <Text style={styles.infoValue}>
                {order.durationCount} {order.durationUnit || 'day'}(s)
              </Text>
            </View>
          )}

          {order.mode === 'buy' && order.quantity ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Quantity</Text>
              <Text style={styles.infoValue}>{order.quantity}</Text>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Customer</Text>
            <Text style={styles.infoValue}>{order.fullName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{order.phone}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>City</Text>
            <Text style={styles.infoValue}>{order.city}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{order.deliveryAddress}</Text>
          </View>

          {order.specialInstructions ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Notes</Text>
              <Text style={styles.infoValue}>{order.specialInstructions}</Text>
            </View>
          ) : null}
        </View>

        {/* Price Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Total Amount</Text>
            <Text style={styles.priceValue}>PKR {order.totalDue.toLocaleString()}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Platform Fee</Text>
            <Text style={styles.priceValue}>PKR {order.platformFee.toLocaleString()}</Text>
          </View>

          {order.mode === 'rent' ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Security Deposit</Text>
              <Text style={styles.priceValue}>PKR {order.securityDeposit.toLocaleString()}</Text>
            </View>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {canCancel && (
            <Pressable
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={cancelMutation.isPending}
            >
              <MaterialIcons name="close" size={18} color="#ef4444" />
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            </Pressable>
          )}

          {canConfirmDelivery && (
            <Pressable
              style={[styles.actionButton, styles.confirmButton]}
              onPress={handleConfirmDelivery}
              disabled={confirmMutation.isPending}
            >
              <MaterialIcons name="check-circle" size={18} color="#fff" />
              <Text style={styles.confirmButtonText}>Confirm Delivery</Text>
            </Pressable>
          )}

          {!canCancel && !canConfirmDelivery && (
            <View style={styles.completedBox}>
              <MaterialIcons name="check-circle" size={24} color="#10b981" />
              <Text style={styles.completedText}>Order Completed</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function TimelineItem({
  step,
  title,
  completed,
  date,
}: {
  step: number;
  title: string;
  completed: boolean;
  date: string;
}) {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineCircle, completed && styles.timelineCircleActive]}>
          {completed && <MaterialIcons name="check" size={16} color="#fff" />}
          {!completed && <Text style={styles.timelineStep}>{step}</Text>}
        </View>
        <View style={[styles.timelineLine, !completed && styles.timelineLineInactive]} />
      </View>
      <View style={styles.timelineRight}>
        <Text style={styles.timelineTitle}>{title}</Text>
        <Text style={styles.timelineDate}>{date}</Text>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  timeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 40,
  },
  timelineCircle: {
    width: 32,
    height: 32,
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineCircleActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  timelineStep: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  timelineLineInactive: {
    backgroundColor: '#cbd5e1',
  },
  timelineRight: {
    flex: 1,
    paddingTop: 4,
  },
  timelineTitle: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  timelineDate: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  infoValue: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  priceLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  priceValue: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '700',
  },
  actionsSection: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: '#1d4ed8',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  completedBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  completedText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
  },
});
