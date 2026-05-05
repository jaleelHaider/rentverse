import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import {
  useConversationMessages,
  useSendMessageMutation,
  useMarkMessagesAsReadMutation,
  useConversations,
} from '../../hooks/useChat';
import { useState, useEffect, useRef } from 'react';
import theme from '../../constants/theme';
import { format } from 'date-fns';
import { useListingDetail } from '../../hooks/useMarketplace';

// Consistent avatar color per name
const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#6366f1',
];
function getAvatarColor(name: string = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ChatScreen() {
  const router = useRouter();
  const { id, listingContextId } = useLocalSearchParams<{ id: string; listingContextId?: string }>();
  const { currentUser } = useAuth();

  const [messageText, setMessageText] = useState('');
  const [pendingListingContext, setPendingListingContext] = useState<string | undefined>(
    listingContextId ? String(listingContextId) : undefined
  );

  const { data: messages, isLoading } = useConversationMessages(id as string);
  const { data: conversations } = useConversations();
  const sendMessageMutation = useSendMessageMutation();
  const markReadMutation = useMarkMessagesAsReadMutation();

  const flatListRef = useRef<FlatList>(null);

  const conversation = conversations?.find(c => c.id === id);
  const otherUser = {
    name: conversation?.counterpartName || 'User',
    avatar: (conversation as any)?.counterpartAvatar || null,
    online: conversation?.counterpartOnline || false,
  };

  // Fetch listing context details if we have a listingContextId
  const listingContextIdToFetch = pendingListingContext || conversation?.listing?.id;
  const { data: listingContext } = useListingDetail(listingContextIdToFetch || '');

  useEffect(() => {
    if (id && messages?.some(m => !(m as any).isRead && m.senderId !== currentUser?.id)) {
      markReadMutation.mutate(id);
    }
  }, [id, messages, currentUser?.id]);

  const sendMessage = () => {
    if (!messageText.trim() || !currentUser?.id) return;

    sendMessageMutation.mutate({
      conversationId: id as string,
      senderId: currentUser.id,
      content: messageText.trim(),
      listingContextId: pendingListingContext,
    });

    setMessageText('');
    // Clear the listing context after first message (web behaviour)
    setPendingListingContext(undefined);
  };

  const avatarColor = getAvatarColor(otherUser.name);
  const initial = otherUser.name.slice(0, 1).toUpperCase();

  const renderMessage = ({ item, index }: any) => {
    const isOwn = item.senderId === currentUser?.id;
    const timeString = item.createdAt ? format(new Date(item.createdAt), 'h:mm a') : '';
    const prevItem = messages?.[index - 1];
    const showAvatar = !isOwn && (!prevItem || prevItem.senderId !== item.senderId);

    return (
      <View style={[styles.messageRow, isOwn ? styles.ownMessageRow : styles.otherMessageRow]}>
        {/* Other user avatar placeholder for spacing */}
        {!isOwn && (
          <View style={styles.messageAvatarArea}>
            {showAvatar ? (
              otherUser.avatar ? (
                <Image source={{ uri: otherUser.avatar }} style={styles.messageAvatar} />
              ) : (
                <View style={[styles.messageAvatar, { backgroundColor: avatarColor }]}>
                  <Text style={styles.messageAvatarText}>{initial}</Text>
                </View>
              )
            ) : (
              <View style={styles.messageAvatarPlaceholder} />
            )}
          </View>
        )}

        <View style={[styles.bubbleColumn, isOwn && styles.bubbleColumnOwn]}>
          <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
            <Text style={[styles.bubbleText, isOwn && styles.ownBubbleText]}>
              {item.content}
            </Text>
          </View>
          <View style={[styles.timeRow, isOwn && styles.timeRowOwn]}>
            <Text style={styles.timeText}>{timeString}</Text>
            {isOwn && (
              <MaterialIcons
                name={(item as any).isRead ? 'done-all' : 'check'}
                size={14}
                color={(item as any).isRead ? theme.colors.primary.blue : '#94a3b8'}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>

        <View style={styles.headerAvatarWrapper}>
          {otherUser.avatar ? (
            <Image source={{ uri: otherUser.avatar }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Text style={styles.headerAvatarText}>{initial}</Text>
            </View>
          )}
          {otherUser.online && <View style={styles.headerOnlineDot} />}
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{otherUser.name}</Text>
          <Text style={styles.headerSub}>
            {otherUser.online ? '🟢 Online now' : conversation?.listing?.title || 'RentVerse'}
          </Text>
        </View>

        <Pressable style={styles.headerAction} hitSlop={8}>
          <MaterialIcons name="more-vert" size={22} color="rgba(255,255,255,0.9)" />
        </Pressable>
      </View>

      {/* Listing Context Banner */}
      {(pendingListingContext || conversation?.listing) && listingContext && (
        <View style={styles.listingBanner}>
          {listingContext.images?.[0] ? (
            <Image source={{ uri: listingContext.images[0] }} style={styles.listingBannerImg} />
          ) : (
            <View style={[styles.listingBannerImg, styles.listingBannerImgFallback]}>
              <MaterialIcons name="storefront" size={18} color={theme.colors.primary.blue} />
            </View>
          )}
          <View style={styles.listingBannerText}>
            <Text style={styles.listingBannerLabel}>Chatting about</Text>
            <Text style={styles.listingBannerTitle} numberOfLines={1}>{listingContext.title}</Text>
            {listingContext.price?.buy && (
              <Text style={styles.listingBannerPrice}>
                PKR {Number(listingContext.price.buy).toLocaleString()}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.listingBannerLink}
            onPress={() => router.push(`/listing/${listingContextIdToFetch}` as any)}
          >
            <MaterialIcons name="open-in-new" size={18} color={theme.colors.primary.blue} />
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.blue} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages || []}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <MaterialIcons name="waving-hand" size={32} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>Say hello! 👋</Text>
              <Text style={styles.emptyText}>Start the conversation with {otherUser.name}</Text>
            </View>
          }
        />
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        {/* Listing context chip if pending */}
        {pendingListingContext && listingContext && (
          <View style={styles.contextChip}>
            <MaterialIcons name="attach-file" size={14} color={theme.colors.primary.blue} />
            <Text style={styles.contextChipText} numberOfLines={1}>
              {listingContext.title}
            </Text>
            <TouchableOpacity onPress={() => setPendingListingContext(undefined)} hitSlop={8}>
              <MaterialIcons name="close" size={14} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor="#94a3b8"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            style={[
              styles.sendButton,
              messageText.trim() ? styles.sendButtonActive : styles.sendButtonDisabled,
            ]}
            activeOpacity={0.8}
          >
            {sendMessageMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    backgroundColor: theme.colors.primary.blue,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerAvatarWrapper: {
    position: 'relative',
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  headerOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#4ade80',
    borderWidth: 2,
    borderColor: theme.colors.primary.blue,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  headerAction: {
    padding: 4,
  },
  listingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  listingBannerImg: {
    width: 48,
    height: 48,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  listingBannerImgFallback: {
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingBannerText: {
    flex: 1,
  },
  listingBannerLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listingBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1,
  },
  listingBannerPrice: {
    fontSize: 13,
    color: theme.colors.primary.blue,
    fontWeight: '600',
    marginTop: 2,
  },
  listingBannerLink: {
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 2,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-end',
  },
  ownMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  messageAvatarArea: {
    width: 34,
    marginRight: 8,
    alignItems: 'center',
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  messageAvatarPlaceholder: {
    width: 30,
    height: 30,
  },
  bubbleColumn: {
    maxWidth: '72%',
  },
  bubbleColumnOwn: {
    alignItems: 'flex-end',
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ownBubble: {
    backgroundColor: theme.colors.primary.blue,
    borderBottomRightRadius: 4,
    shadowColor: theme.colors.primary.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  bubbleText: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 22,
  },
  ownBubbleText: {
    color: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
    paddingHorizontal: 4,
  },
  timeRowOwn: {
    justifyContent: 'flex-end',
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  contextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  contextChipText: {
    fontSize: 12,
    color: theme.colors.primary.blue,
    fontWeight: '600',
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 15,
    color: '#0f172a',
    maxHeight: 110,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: theme.colors.primary.blue,
    shadowColor: theme.colors.primary.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
});
