import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../../hooks/useAuth';
import { useDisputeDetail, useOrderDetails, usePostDisputeMessageMutation, useUploadDisputeEvidenceMutation } from '../../../../hooks/useOrders';
import { convertFileToBase64 } from '../../../../utils/imageConverter';
import { colors, spacing, borderRadius, typography } from '../../../../constants/theme';
import type { MarketplaceDisputeEvidenceItem, MarketplaceDisputePriority, MarketplaceDisputeReasonCode } from '@rentverse/shared';

const fmt = (value: string | null | undefined) => (value ? new Date(value).toLocaleString() : 'N/A');

export default function DisputeThreadScreen() {
  const { orderId, disputeId } = useLocalSearchParams<{ orderId: string; disputeId: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { data: order, isLoading: orderLoading } = useOrderDetails(orderId as string);
  const { data, isLoading: disputeLoading, refetch } = useDisputeDetail(orderId as string, disputeId as string);
  const postMessageMutation = usePostDisputeMessageMutation();
  const uploadEvidenceMutation = useUploadDisputeEvidenceMutation();

  const [messageDraft, setMessageDraft] = useState('');
  const [replyReason, setReplyReason] = useState<MarketplaceDisputeReasonCode>(dispute?.reasonCode || 'other');
  const [replyPriority, setReplyPriority] = useState<MarketplaceDisputePriority>(dispute?.priority || 'medium');
  const [requestedResolution, setRequestedResolution] = useState('');
  const [pendingEvidence, setPendingEvidence] = useState<MarketplaceDisputeEvidenceItem[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const dispute = data?.dispute || null;
  const messages = data?.messages || [];

  useEffect(() => {
    if (dispute) {
      setReplyReason(dispute.reasonCode);
      setReplyPriority(dispute.priority);
      setRequestedResolution(dispute.requestedResolution || '');
    }
  }, [dispute]);

  const canParticipate = useMemo(() => {
    if (!order || !currentUser?.id) return false;
    return currentUser.id === order.buyerId || currentUser.id === order.sellerId;
  }, [currentUser?.id, order]);

  const handleOpenEvidence = async (item: MarketplaceDisputeEvidenceItem) => {
    const url = item.signedUrl || item.url;
    if (!url) return;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open file', 'This attachment could not be opened on your device.');
    }
  };

  const handleUploadEvidence = async () => {
    if (!orderId) return;

    try {
      setUploadingEvidence(true);
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

      const files = [] as Array<{ name: string; type: string; base64: string }>;
      for (const asset of assets) {
        const base64 = await convertFileToBase64(asset.uri);
        files.push({
          name: asset.name || `evidence-${Date.now()}`,
          type: asset.mimeType || 'application/octet-stream',
          base64,
        });
      }

      const uploaded = await uploadEvidenceMutation.mutateAsync({ orderId: orderId as string, files });
      setPendingEvidence((prev) => [...prev, ...uploaded]);
      Alert.alert('Evidence added', `${uploaded.length} file(s) attached to the next message.`);
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Failed to upload evidence');
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleSendMessage = async () => {
    if (!orderId || !disputeId || !dispute) return;

    const body = messageDraft.trim();
    if (body.length < 3) {
      Alert.alert('Message required', 'Write at least 3 characters before sending.');
      return;
    }

    try {
      await postMessageMutation.mutateAsync({
        orderId: orderId as string,
        disputeId: disputeId as string,
        body: `Resolution: ${requestedResolution || 'No new resolution requested'}\n\n${body}`,
        attachments: pendingEvidence,
      });
      setMessageDraft('');
      setPendingEvidence([]);
      await refetch();
      Alert.alert('Sent', 'Your message was posted to the dispute thread.');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send message');
    }
  };

  if (orderLoading || disputeLoading || !order || !dispute) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary.blue} />
        <Text style={styles.loadingText}>Loading dispute...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={colors.neutral.white} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Dispute Detail</Text>
          <Text style={styles.headerSub}>Order #{order.id.slice(0, 8)} • {dispute.status.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.statusPill, statusColor(dispute.status)]}>
              <Text style={styles.statusPillText}>{dispute.status.replace(/_/g, ' ').toUpperCase()}</Text>
            </View>
            <View style={[styles.priorityPill, priorityColor(dispute.priority)]}>
              <Text style={styles.priorityPillText}>{dispute.priority.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.title}>{dispute.title}</Text>
          <Text style={styles.description}>{dispute.description}</Text>
          <Text style={styles.meta}>Reason: {dispute.reasonCode.replace(/_/g, ' ')}</Text>
          <Text style={styles.meta}>Opened by: {dispute.openedByRole}</Text>
          <Text style={styles.meta}>Created: {fmt(dispute.createdAt)}</Text>
          {dispute.requestedResolution ? <Text style={styles.meta}>Requested resolution: {dispute.requestedResolution}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Snapshot</Text>
          <InfoRow label="Listing" value={order.listingTitle} />
          <InfoRow label="Mode" value={order.mode === 'buy' ? 'Purchase' : 'Rental'} />
          <InfoRow label="Buyer" value={order.fullName} />
          <InfoRow label="City" value={order.city} />
          <InfoRow label="Address" value={order.deliveryAddress} />
          <InfoRow label="Current Order Status" value={order.status.replace(/_/g, ' ')} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Evidence</Text>
          {dispute.evidence?.length ? (
            <View style={styles.evidenceList}>
              {dispute.evidence.map((item, index) => (
                <Pressable key={`${item.url || item.name || index}-${index}`} style={styles.evidenceItem} onPress={() => void handleOpenEvidence(item)}>
                  <MaterialIcons name={item.type === 'image' ? 'image' : 'attach-file'} size={18} color={colors.primary.blue} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.evidenceName}>{item.name || `Attachment ${index + 1}`}</Text>
                    <Text style={styles.evidenceMeta}>{item.mimeType || item.type || 'file'}</Text>
                  </View>
                  <MaterialIcons name="open-in-new" size={18} color={colors.text.secondary} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No evidence attached to this dispute yet.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thread</Text>
          {messages.length ? (
            <View style={styles.messageList}>
              {messages.map((message) => {
                const mine = message.authorUserId === currentUser?.id;
                return (
                  <View key={message.id} style={[styles.messageBubble, mine ? styles.messageMine : styles.messageTheirs]}>
                    <View style={styles.messageHeader}>
                      <Text style={styles.messageAuthor}>{message.authorType.toUpperCase()}</Text>
                      <Text style={styles.messageTime}>{fmt(message.createdAt)}</Text>
                    </View>
                    <Text style={styles.messageBody}>{message.body}</Text>
                    {message.attachments?.length ? (
                      <View style={styles.inlineEvidenceList}>
                        {message.attachments.map((item, index) => (
                          <Pressable key={`${message.id}-${index}`} style={styles.inlineEvidenceChip} onPress={() => void handleOpenEvidence(item)}>
                            <MaterialIcons name="attach-file" size={14} color={colors.primary.blue} />
                            <Text style={styles.inlineEvidenceText}>{item.name || `Attachment ${index + 1}`}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyText}>No thread messages yet.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Reply</Text>
          <Text style={styles.helperText}>
            {canParticipate ? 'You can reply and add evidence. Files will be uploaded first and included in your next message.' : 'Only the buyer or seller can reply to this dispute.'}
          </Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaField}>
              <Text style={styles.metaLabel}>Reason</Text>
              <View style={styles.selectBox}>
                <Text style={styles.selectValue}>{replyReason.replace(/_/g, ' ')}</Text>
              </View>
            </View>
            <View style={styles.metaField}>
              <Text style={styles.metaLabel}>Priority</Text>
              <View style={styles.selectBox}>
                <Text style={styles.selectValue}>{replyPriority}</Text>
              </View>
            </View>
          </View>

          <View style={styles.metaField}>
            <Text style={styles.metaLabel}>Requested Resolution</Text>
            <TextInput
              value={requestedResolution}
              onChangeText={setRequestedResolution}
              placeholder="What outcome are you requesting?"
              placeholderTextColor={colors.text.secondary}
              style={styles.inlineInput}
            />
          </View>

          <TextInput
            value={messageDraft}
            onChangeText={setMessageDraft}
            placeholder="Write a message..."
            placeholderTextColor={colors.text.secondary}
            multiline
            style={styles.input}
            textAlignVertical="top"
          />

          <View style={styles.actionRow}>
            <Pressable style={[styles.secondaryBtn, uploadingEvidence && styles.disabledBtn]} onPress={handleUploadEvidence} disabled={uploadingEvidence || !canParticipate}>
              {uploadingEvidence ? (
                <ActivityIndicator size="small" color={colors.primary.blue} />
              ) : (
                <>
                  <MaterialIcons name="attach-file" size={18} color={colors.primary.blue} />
                  <Text style={styles.secondaryBtnText}>Add Evidence</Text>
                </>
              )}
            </Pressable>

            <Pressable style={[styles.primaryBtn, postMessageMutation.isPending && styles.disabledBtn]} onPress={handleSendMessage} disabled={postMessageMutation.isPending || !canParticipate}>
              <Text style={styles.primaryBtnText}>{postMessageMutation.isPending ? 'Sending...' : 'Send Message'}</Text>
            </Pressable>
          </View>

          {pendingEvidence.length ? (
            <View style={styles.pendingEvidenceBox}>
              <Text style={styles.pendingEvidenceTitle}>Pending attachments for next reply</Text>
              {pendingEvidence.map((item, index) => (
                <Text key={`${item.url || item.name || index}-${index}`} style={styles.pendingEvidenceText} numberOfLines={1}>
                  • {item.name || item.url || `Attachment ${index + 1}`}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function statusColor(status: string) {
  switch (status) {
    case 'open':
      return { backgroundColor: '#fee2e2' };
    case 'under_review':
      return { backgroundColor: '#fef3c7' };
    case 'awaiting_parties':
      return { backgroundColor: '#e0f2fe' };
    case 'resolved':
      return { backgroundColor: '#dcfce7' };
    case 'closed':
      return { backgroundColor: '#e2e8f0' };
    default:
      return { backgroundColor: colors.secondary.slate };
  }
}

function priorityColor(priority: string) {
  switch (priority) {
    case 'urgent':
      return { backgroundColor: '#7f1d1d' };
    case 'high':
      return { backgroundColor: '#b45309' };
    case 'medium':
      return { backgroundColor: '#0369a1' };
    case 'low':
      return { backgroundColor: '#475569' };
    default:
      return { backgroundColor: colors.secondary.darkSlate };
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.primary },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.primary, gap: spacing.md },
  loadingText: { color: colors.text.secondary, fontSize: typography.fontSize.base, fontWeight: '700' },
  header: {
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.primary.blue,
  },
  headerTitle: { color: colors.neutral.white, fontSize: 20, fontWeight: '900' },
  headerSub: { color: '#dbeafe', fontSize: 12, marginTop: 2, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollPad: { padding: 16, paddingBottom: 36 },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusPillText: { color: colors.text.primary, fontWeight: '900', fontSize: 11 },
  priorityPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  priorityPillText: { color: colors.neutral.white, fontWeight: '900', fontSize: 11 },
  title: { fontSize: 20, fontWeight: '900', color: colors.text.primary, marginBottom: 8 },
  description: { color: colors.secondary.darkSlate, fontSize: 14, lineHeight: 21, marginBottom: 10 },
  meta: { color: colors.text.secondary, fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: colors.text.primary, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7 },
  infoLabel: { color: colors.text.secondary, fontSize: 12, fontWeight: '700', flex: 1 },
  infoValue: { color: colors.text.primary, fontSize: 12, fontWeight: '800', flex: 1, textAlign: 'right' },
  evidenceList: { gap: 10 },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: colors.primary[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  evidenceName: { color: colors.text.primary, fontWeight: '800', fontSize: 13 },
  evidenceMeta: { color: colors.text.secondary, fontSize: 11, marginTop: 2 },
  emptyText: { color: colors.text.secondary, fontSize: 13, lineHeight: 19 },
  messageList: { gap: 12 },
  messageBubble: { borderRadius: 16, padding: 14, borderWidth: 1 },
  messageMine: { backgroundColor: colors.primary[50], borderColor: colors.primary[100], marginLeft: 28 },
  messageTheirs: { backgroundColor: colors.neutral.white, borderColor: colors.border.light, marginRight: 28 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 12 },
  messageAuthor: { color: colors.primary.blue, fontSize: 11, fontWeight: '900' },
  messageTime: { color: colors.text.secondary, fontSize: 11, fontWeight: '700' },
  messageBody: { color: colors.text.primary, fontSize: 13, lineHeight: 20 },
  inlineEvidenceList: { marginTop: 10, gap: 8, flexDirection: 'row', flexWrap: 'wrap' },
  inlineEvidenceChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.neutral.white, borderWidth: 1, borderColor: colors.primary[100] },
  inlineEvidenceText: { color: colors.primary.blue, fontSize: 11, fontWeight: '800' },
  helperText: { color: colors.text.secondary, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  metaGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  metaField: { flex: 1, marginBottom: 12 },
  metaLabel: { color: colors.secondary.darkSlate, fontSize: 12, fontWeight: '800', marginBottom: 6 },
  selectBox: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral.veryLightGray,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectValue: { color: colors.text.primary, fontSize: typography.fontSize.base, fontWeight: '700' },
  inlineInput: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral.veryLightGray,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
  },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral.veryLightGray,
    padding: 14,
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    marginBottom: 12,
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: { flex: 1, backgroundColor: colors.primary.blue, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  primaryBtnText: { color: colors.neutral.white, fontWeight: '900', fontSize: 14 },
  secondaryBtn: { flex: 1, backgroundColor: colors.primary[50], paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.primary[100], flexDirection: 'row', justifyContent: 'center', gap: 8 },
  secondaryBtnText: { color: colors.primary.blue, fontWeight: '900', fontSize: 14 },
  disabledBtn: { opacity: 0.6 },
  pendingEvidenceBox: { marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: colors.border.light },
  pendingEvidenceTitle: { color: colors.text.primary, fontWeight: '900', fontSize: 12, marginBottom: 6 },
  pendingEvidenceText: { color: colors.text.secondary, fontSize: 12, marginTop: 2 },
});
