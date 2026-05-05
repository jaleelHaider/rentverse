import { View, Text, ScrollView, StyleSheet, Pressable, FlatList, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useState } from 'react';

// Mock notifications
const mockNotifications = [
  {
    id: '1',
    type: 'order_approved',
    title: 'Order Approved',
    message: 'Ahmed Hassan approved your rental request for iPhone 13 Pro',
    timestamp: '5 mins ago',
    icon: 'check-circle',
    iconColor: '#10b981',
    isRead: false,
    actionUrl: '/orders/order1',
  },
  {
    id: '2',
    type: 'message',
    title: 'New Message',
    message: 'Fatima Khan sent you a message',
    timestamp: '2 hours ago',
    icon: 'mail',
    iconColor: '#1d4ed8',
    isRead: false,
    actionUrl: '/messages/user456',
  },
  {
    id: '3',
    type: 'listing_saved',
    title: 'Saved Item Alert',
    message: 'Gaming Laptop was just listed - similar to your saved items',
    timestamp: 'yesterday',
    icon: 'favorite',
    iconColor: '#ef4444',
    isRead: true,
    actionUrl: '/listing/listing003',
  },
  {
    id: '4',
    type: 'order_placed',
    title: 'Order Placed',
    message: 'Your order for Mountain Bike has been confirmed',
    timestamp: '3 days ago',
    icon: 'shopping-cart',
    iconColor: '#f59e0b',
    isRead: true,
    actionUrl: '/orders/order2',
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState(mockNotifications);

  if (!currentUser?.id) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Notifications</Text>
        </View>
        <View style={styles.emptyState}>
          <MaterialIcons name="notifications-off" size={56} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Login to see notifications</Text>
          <Text style={styles.emptyText}>Updates about your orders, messages, and more</Text>
          <Pressable style={styles.loginButton} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginButtonText}>Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const renderNotification = ({ item }: any) => (
    <Pressable
      style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
      onPress={() => {
        markAsRead(item.id);
        router.push(item.actionUrl);
      }}
    >
      <View style={styles.notificationIcon}>
        <MaterialIcons name={item.icon as any} size={24} color={item.iconColor} />
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, !item.isRead && styles.unreadTitle]}>
            {item.title}
          </Text>
          <Text style={styles.notificationTime}>{item.timestamp}</Text>
        </View>
        <Text style={[styles.notificationMessage, !item.isRead && styles.unreadMessage]}>
          {item.message}
        </Text>
      </View>

      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          deleteNotification(item.id);
        }}
      >
        <MaterialIcons name="close" size={20} color="#cbd5e1" />
      </Pressable>
    </Pressable>
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          scrollEnabled
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons name="inbox" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyText}>You\'re all caught up!</Text>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  notificationCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  unreadCard: {
    backgroundColor: '#eff6ff',
    borderLeftColor: '#1d4ed8',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  unreadTitle: {
    color: '#1d4ed8',
  },
  notificationTime: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  unreadMessage: {
    color: '#0f172a',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  loginButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
