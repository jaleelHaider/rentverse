import React, { useState } from 'react';
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
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useMyOrders, useApproveOrderMutation, useRejectOrderMutation, useCreateDisputeMutation, useUploadDisputeEvidenceMutation } from '../../hooks/useOrders';
import { useAuth } from '../../hooks/useAuth';
import { convertFileToBase64 } from '../../utils/imageConverter';
import type { CreateMarketplaceOrderDisputeInput, DisputeEvidenceUploadFileInput, MarketplaceDisputeEvidenceItem, MarketplaceDisputePriority, MarketplaceDisputeReasonCode } from '@rentverse/shared';

export default function MyBookingsScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const ordersQuery = useMyOrders();
  const approveOrderMutation = useApproveOrderMutation();
  const rejectOrderMutation = useRejectOrderMutation();
  const uploadEvidenceMutation = useUploadDisputeEvidenceMutation();
  const [refreshing, setRefreshing] = useState(false);
  const [tabFilter, setTabFilter] = useState<'incoming' | 'outgoing' | 'completed'>('incoming');
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeOrder, setDisputeOrder] = useState<any | null>(null);
  const [disputeTitle, setDisputeTitle] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeReason, setDisputeReason] = useState<MarketplaceDisputeReasonCode>('item_not_as_described');
  const [disputeRequestedResolution, setDisputeRequestedResolution] = useState('');
  const [disputePriority, setDisputePriority] = useState<MarketplaceDisputePriority>('medium');
  const [draftEvidence, setDraftEvidence] = useState<MarketplaceDisputeEvidenceItem[]>([]);

  const ordersData = ordersQuery.data;
  const orders = Array.isArray(ordersData)
    ? ordersData
    : ordersData
      ? [...(ordersData.buyingOrders || []), ...(ordersData.sellingOrders || []), ...(ordersData.rentingOrders || [])]
      : [];
  const isLoading = ordersQuery.isLoading;

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    ordersQuery.refetch().finally(() => setRefreshing(false));
  }, [ordersQuery]);

  // Filter orders based on role and status
  // Keep approved/in-progress orders visible in incoming/outgoing (don't hide after approval)
  const incomingOrders = orders.filter((o) => o.sellerId === currentUser?.id && o.status !== 'completed');
  const outgoingOrders = orders.filter((o) => o.buyerId === currentUser?.id && o.status !== 'completed');
  const completedOrders = orders.filter((o) => o.status === 'completed');

  const activeOrders =
    tabFilter === 'incoming'
      ? incomingOrders
      : tabFilter === 'outgoing'
        ? outgoingOrders
        : completedOrders;

  const handleApprove = (orderId: string) => {
    Alert.alert('Approve Order', 'Approve this booking request?', [
      { text: 'Cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await approveOrderMutation.mutateAsync(orderId);
            Alert.alert('Success', 'Booking approved');
          } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to approve');
          }
        },
      },
    ]);
  };

  const handleReject = (orderId: string) => {
    Alert.alert('Reject Order', 'Reject this booking request?', [
      { text: 'Cancel' },
      {
        text: 'Reject',
        onPress: async () => {
          try {
            await rejectOrderMutation.mutateAsync({ orderId });
            Alert.alert('Success', 'Booking rejected');
          } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to reject');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const createDisputeMutation = useCreateDisputeMutation();

  const openDisputeModal = (order: any) => {
    setDisputeOrder(order);
    setDisputeTitle(`Dispute: ${order.listingTitle || 'Order'}`);
    setDisputeDescription('');
    setDisputeReason('item_not_as_described');
    setDisputeRequestedResolution('');
    setDisputePriority('medium');
    setDraftEvidence([]);
    setShowDisputeModal(true);
  };

  const handlePickDisputeEvidence = async () => {
    if (!disputeOrder) {
      Alert.alert('Select an order first', 'Open the dispute form again for the booking you want to attach evidence to.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
        type: ['image/*', 'application/pdf', 'text/plain', 'video/*'] as any,
      } as any);

      if (result.canceled) {
        return;
      }

      const assets = result.assets || [];
      if (!assets.length) {
        return;
      }

      const files = await Promise.all(
        assets.map(async (asset) => ({
          name: asset.name || `evidence-${Date.now()}`,
          type: asset.mimeType || 'application/octet-stream',
          base64: await convertFileToBase64(asset.uri),
        }))
      );

      const uploaded = await uploadEvidenceMutation.mutateAsync({
        orderId: disputeOrder.id,
        files,
      });

      setDraftEvidence((prev) => [...prev, ...uploaded]);
      Alert.alert('Evidence added', `${uploaded.length} file(s) uploaded successfully.`);
    } catch (error) {
      Alert.alert('Evidence upload failed', error instanceof Error ? error.message : 'Failed to choose evidence');
    }
  };

  const submitDispute = async () => {
    if (!disputeOrder) return;
    if (!disputeTitle || disputeTitle.length < 5) {
      Alert.alert('Validation', 'Please enter a dispute title (min 5 chars).');
      return;
    }
    if (!disputeDescription || disputeDescription.length < 20) {
      Alert.alert('Validation', 'Please enter a detailed description (min 20 chars).');
      return;
    }

    try {
      const response = await createDisputeMutation.mutateAsync({
        orderId: disputeOrder.id,
        payload: {
          title: disputeTitle,
          description: disputeDescription,
          reasonCode: disputeReason,
          requestedResolution: disputeRequestedResolution || undefined,
          priority: disputePriority,
          evidence: draftEvidence,
        } satisfies CreateMarketplaceOrderDisputeInput,
      });

      Alert.alert('Dispute opened', 'Your dispute has been submitted and sent to support.');
      setShowDisputeModal(false);
      setDisputeOrder(null);
      void ordersQuery.refetch();
      if (response?.dispute?.orderId && response?.dispute?.id) {
        router.push(`/disputes/${response.dispute.orderId}/${response.dispute.id}` as never);
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to open dispute');
    }
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
        <Text style={styles.title}>My Bookings</Text>
        <Text style={styles.subtitle}>{activeOrders.length} {tabFilter}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TabButton
          label="Incoming"
          count={incomingOrders.length}
          isActive={tabFilter === 'incoming'}
          onPress={() => setTabFilter('incoming')}
        />
        <TabButton
          label="Outgoing"
          count={outgoingOrders.length}
          isActive={tabFilter === 'outgoing'}
          onPress={() => setTabFilter('outgoing')}
        />
        <TabButton
          label="Completed"
          count={completedOrders.length}
          isActive={tabFilter === 'completed'}
          onPress={() => setTabFilter('completed')}
        />
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.ordersContainer}
        contentContainerStyle={styles.ordersContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="schedule" size={48} color="#cbd5e1" />
            <Text style={styles.emptyStateTitle}>No {tabFilter} bookings</Text>
            <Text style={styles.emptyStateText}>
              {tabFilter === 'incoming'
                ? 'No pending requests from buyers'
                : tabFilter === 'outgoing'
                  ? 'No pending requests from sellers'
                  : 'No completed bookings yet'}
            </Text>
          </View>
          ) : (
          activeOrders.map((order) => (
            <BookingCard
              key={order.id}
              order={order}
              onApprove={() => handleApprove(order.id)}
              onReject={() => handleReject(order.id)}
              onRaiseDispute={() => openDisputeModal(order)}
              onViewDispute={() => {
                if (order.latestDisputeId) {
                  router.push(`/disputes/${order.id}/${order.latestDisputeId}` as never);
                }
              }}
              isApproving={approveOrderMutation.isPending}
              isRejecting={rejectOrderMutation.isPending}
              tabFilter={tabFilter}
            />
          ))
        )}
      </ScrollView>
      <DisputeModal
        visible={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        title={disputeTitle}
        setTitle={setDisputeTitle}
        description={disputeDescription}
        setDescription={setDisputeDescription}
        reason={disputeReason}
        setReason={setDisputeReason}
        priority={disputePriority}
        setPriority={setDisputePriority}
        requestedResolution={disputeRequestedResolution}
        setRequestedResolution={setDisputeRequestedResolution}
        evidenceCount={draftEvidence.length}
        onAddEvidence={handlePickDisputeEvidence}
        onSubmit={submitDispute}
        submitting={createDisputeMutation.isLoading || uploadEvidenceMutation.isPending}
      />
    </View>
  );
}

function TabButton({ label, count, isActive, onPress }) {
  return (
    <Pressable
      style={[styles.tab, isActive && styles.tabActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
      <View
        style={[
          styles.tabBadge,
          isActive && styles.tabBadgeActive,
        ]}
      >
        <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

function BookingCard({ order, onApprove, onReject, onRaiseDispute, onViewDispute, isApproving, isRejecting, tabFilter }) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return `Rs. ${price.toLocaleString()}`;
  };

  return (
    <View style={styles.bookingCard}>
      {/* Header */}
      <View style={styles.bookingHeader}>
        <View style={styles.bookingTitleContainer}>
          <Text style={styles.bookingListingTitle} numberOfLines={2}>
            {order.listingTitle || 'Listing'}
          </Text>
          <View style={styles.bookingMeta}>
            <MaterialIcons name="event" size={14} color="#64748b" />
            <Text style={styles.bookingMetaText}>{formatDate(order.createdAt)}</Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                order.status === 'pending'
                  ? '#fef08a'
                  : order.status === 'approved'
                    ? '#dbeafe'
                    : '#dcfce7',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  order.status === 'pending'
                    ? '#854d0e'
                    : order.status === 'approved'
                      ? '#1e40af'
                      : '#166534',
              },
            ]}
          >
            {order.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.bookingDetails}>
        <View style={styles.detail}>
          <MaterialIcons name="person" size={16} color="#64748b" />
          <View>
            <Text style={styles.detailLabel}>
              {tabFilter === 'incoming' ? 'Buyer' : 'Seller'}
            </Text>
            <Text style={styles.detailValue}>
              {tabFilter === 'incoming' ? order.buyerName : order.sellerName}
            </Text>
          </View>
        </View>

        {order.orderType === 'rent' && order.durationCount ? (
          <View style={styles.detail}>
            <MaterialIcons name="event" size={16} color="#64748b" />
            <View>
              <Text style={styles.detailLabel}>Rental Period</Text>
              <Text style={styles.detailValue}>
                {order.durationCount} {order.durationUnit || 'day'}(s)
              </Text>
            </View>
          </View>
        ) : null}

        {order.orderType === 'buy' && (
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>{order.quantity || 1}</Text>
          </View>
        )}

        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Total Price</Text>
          <Text style={[styles.detailValue, styles.priceText]}>
            {formatPrice(order.totalPrice)}
          </Text>
        </View>
      </View>

      {/* Actions */}
      {tabFilter === 'incoming' && order.status === 'pending' && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.rejectButton]}
            onPress={onReject}
            disabled={isRejecting}
          >
            <MaterialIcons name="cancel" size={18} color="#ef4444" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.approveButton]}
            onPress={onApprove}
            disabled={isApproving}
          >
            <MaterialIcons name="check-circle" size={18} color="#10b981" />
            <Text style={styles.approveButtonText}>Approve</Text>
          </Pressable>
        </View>
      )}

      {tabFilter === 'outgoing' && order.status === 'pending' && (
        <Pressable style={[styles.button, styles.cancelButton]}>
          <Text style={styles.cancelButtonText}>Cancel Request</Text>
        </Pressable>
      )}

      {/* Raise dispute - visible for buyer or seller on non-completed orders when there is no active dispute */}
      {order.disputeStatus !== 'open' && order.status !== 'completed' && (
        <Pressable style={[styles.button, styles.disputeButton]} onPress={onRaiseDispute}>
          <Text style={styles.disputeButtonText}>Raise Dispute</Text>
        </Pressable>
      )}

      {order.latestDisputeId ? (
        <Pressable style={[styles.button, styles.viewDisputeButton]} onPress={onViewDispute}>
          <Text style={styles.viewDisputeButtonText}>View Dispute</Text>
        </Pressable>
      ) : null}

      {order.status === 'completed' && (
        <Pressable style={[styles.button, styles.reviewButton]}>
          <Text style={styles.reviewButtonText}>Leave Review</Text>
        </Pressable>
      )}
    </View>
  );
}

// Dispute modal rendered at the screen level
function DisputeModal({
  visible,
  onClose,
  title,
  setTitle,
  description,
  setDescription,
  reason,
  setReason,
  priority,
  setPriority,
  requestedResolution,
  setRequestedResolution,
  evidenceCount,
  onAddEvidence,
  onSubmit,
  submitting,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  reason: MarketplaceDisputeReasonCode;
  setReason: (value: MarketplaceDisputeReasonCode) => void;
  priority: MarketplaceDisputePriority;
  setPriority: (value: MarketplaceDisputePriority) => void;
  requestedResolution: string;
  setRequestedResolution: (value: string) => void;
  evidenceCount: number;
  onAddEvidence: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Raise Dispute</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Short title" style={styles.modalInput} />
          <View style={styles.modalRow}>
            <View style={styles.modalHalf}>
              <Text style={styles.modalLabel}>Reason</Text>
              <View style={styles.modalSelect}><Text style={styles.modalSelectText}>{reason.replace(/_/g, ' ')}</Text></View>
            </View>
            <View style={styles.modalHalf}>
              <Text style={styles.modalLabel}>Priority</Text>
              <View style={styles.modalSelect}><Text style={styles.modalSelectText}>{priority}</Text></View>
            </View>
          </View>
          <TextInput
            value={requestedResolution}
            onChangeText={setRequestedResolution}
            placeholder="Requested resolution"
            style={styles.modalInput}
          />
          <TextInput value={description} onChangeText={setDescription} placeholder="Describe the issue" style={[styles.modalInput, { minHeight: 100 }]} multiline />
          <Pressable style={styles.evidenceBtn} onPress={onAddEvidence}>
            <Text style={styles.evidenceBtnText}>Attach Evidence {evidenceCount > 0 ? `(${evidenceCount})` : ''}</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={styles.modalSecondaryBtn} onPress={onClose} disabled={submitting}><Text>Cancel</Text></Pressable>
            <Pressable style={styles.modalPrimaryBtn} onPress={onSubmit} disabled={submitting}><Text style={{ color: '#fff' }}>{submitting ? 'Submitting...' : 'Submit Dispute'}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    gap: 6,
  },
  tabActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  tabBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  tabBadgeActive: {
    backgroundColor: '#3b82f6',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBadgeTextActive: {
    color: '#fff',
  },
  ordersContainer: {
    flex: 1,
  },
  ordersContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  bookingTitleContainer: {
    flex: 1,
  },
  bookingListingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  bookingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingMetaText: {
    fontSize: 12,
    color: '#64748b',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bookingDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 2,
  },
  priceText: {
    color: '#059669',
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  approveButton: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  approveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  rejectButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  reviewButton: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  reviewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  disputeButton: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
    marginTop: 8,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  disputeButtonText: {
    color: '#c2410c',
    fontWeight: '700',
  },
  viewDisputeButton: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    marginTop: 8,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewDisputeButtonText: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalHalf: {
    flex: 1,
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
  },
  modalSelect: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
  },
  modalSelectText: {
    color: '#0f172a',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  evidenceBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  evidenceBtnText: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  modalPrimaryBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  modalSecondaryBtn: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flex: 1,
  },
});
