import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Image, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useConversations } from '../../hooks/useChat';
import { useState, useMemo } from 'react';
import theme from '../../constants/theme';
import { formatDistanceToNow } from 'date-fns';

// Generate a consistent color from a string
const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#6366f1',
];
function getAvatarColor(name: string = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function MessagesScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: conversations, isLoading, refetch } = useConversations();

  if (!currentUser?.id) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Messages</Text>
        </View>
        <View style={styles.authState}>
          <View style={styles.authIconBg}>
            <MaterialIcons name="chat-bubble-outline" size={44} color={theme.colors.primary.blue} />
          </View>
          <Text style={styles.authTitle}>Your inbox awaits</Text>
          <Text style={styles.authText}>Sign in to chat with sellers and buyers, manage bookings, and track your orders.</Text>
          <TouchableOpacity style={styles.authPrimary} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.authPrimaryText}>Log in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.authSecondary} onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.authSecondaryText}>Create an account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    return conversations.filter(conv =>
      conv.counterpartName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.listing?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  const totalUnread = useMemo(() =>
    conversations?.reduce((sum, c) => sum + (c.unreadCount || 0), 0) || 0,
    [conversations]
  );

  const renderConversation = ({ item }: any) => {
    const timeAgo = item.lastMessageAt
      ? formatDistanceToNow(new Date(item.lastMessageAt), { addSuffix: true })
      : '';
    const avatarColor = getAvatarColor(item.counterpartName);
    const initial = (item.counterpartName || '?').slice(0, 1).toUpperCase();
    const isUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={[styles.conversationCard, isUnread && styles.conversationCardUnread]}
        onPress={() => router.push({ pathname: '/messages/[id]', params: { id: item.id } } as any)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          {item.counterpartAvatar ? (
            <Image source={{ uri: item.counterpartAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarColored, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          {item.counterpartOnline && <View style={styles.onlineDot} />}
          {isUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.conversationContent}>
          <View style={styles.conversationRow}>
            <Text style={[styles.conversationName, isUnread && styles.conversationNameUnread]} numberOfLines={1}>
              {item.counterpartName}
            </Text>
            <Text style={styles.conversationTime}>{timeAgo}</Text>
          </View>

          {item.listing?.title && (
            <View style={styles.listingTag}>
              <MaterialIcons name="storefront" size={11} color={theme.colors.primary.blue} />
              <Text style={styles.listingTagText} numberOfLines={1}>{item.listing.title}</Text>
            </View>
          )}

          <Text
            style={[styles.lastMessage, isUnread && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {item.lastMessage || 'No messages yet'}
          </Text>
        </View>

        <MaterialIcons name="chevron-right" size={20} color="#cbd5e1" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Messages</Text>
          {totalUnread > 0 && (
            <Text style={styles.unreadSummary}>{totalUnread} unread</Text>
          )}
        </View>
        <View style={styles.headerBadge}>
          <MaterialIcons name="inbox" size={20} color={theme.colors.primary.blue} />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {isLoading && !conversations ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.blue} />
          <Text style={styles.loaderText}>Loading conversations…</Text>
        </View>
      ) : filteredConversations.length > 0 ? (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          refreshing={isLoading}
          onRefresh={refetch}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBg}>
            <MaterialIcons name="mail-outline" size={48} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No results found' : 'No messages yet'}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery
              ? `Try searching for a different name or listing`
              : 'Browse listings and tap "Message Seller" to start a conversation'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity style={styles.browseButton} onPress={() => router.push('/(tabs)')}>
              <Text style={styles.browseButtonText}>Browse Listings</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  unreadSummary: {
    fontSize: 13,
    color: theme.colors.primary.blue,
    fontWeight: '600',
    marginTop: 2,
  },
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
  },
  listContent: {
    paddingBottom: 32,
    paddingTop: 4,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 18,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  conversationCardUnread: {
    borderColor: '#dbeafe',
    backgroundColor: '#fafcff',
    shadowOpacity: 0.08,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarColored: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.primary.blue,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  conversationContent: {
    flex: 1,
    gap: 3,
  },
  conversationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
    marginRight: 8,
  },
  conversationNameUnread: {
    fontWeight: '800',
    color: '#0f172a',
  },
  conversationTime: {
    fontSize: 11,
    color: '#94a3b8',
    flexShrink: 0,
  },
  listingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  listingTagText: {
    fontSize: 11,
    color: theme.colors.primary.blue,
    fontWeight: '600',
    maxWidth: 160,
  },
  lastMessage: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  lastMessageUnread: {
    color: '#334155',
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    color: '#94a3b8',
    fontSize: 15,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    lineHeight: 22,
    fontSize: 15,
  },
  browseButton: {
    marginTop: 24,
    backgroundColor: theme.colors.primary.blue,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  browseButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  authState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  authIconBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  authText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  authPrimary: {
    backgroundColor: theme.colors.primary.blue,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  authPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  authSecondary: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary.blue,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  authSecondaryText: {
    color: theme.colors.primary.blue,
    fontWeight: '700',
    fontSize: 16,
  },
});
