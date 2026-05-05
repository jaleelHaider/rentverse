import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useCurrentAuthProfile } from '../../hooks/useProfile';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const profileQuery = useCurrentAuthProfile();

  const profile = profileQuery.data?.user;

  if (profileQuery.isLoading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.screen}>
        <View style={styles.centeredState}>
          <Text style={styles.stateTitle}>Sign in to view your profile</Text>
          <Text style={styles.stateText}>Your account details, listings, and settings live here after login.</Text>
          <Pressable style={styles.signInButton} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.signInButtonText}>Go to login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.profilePicContainer}>
            {profile?.user_metadata?.avatar_url ? (
              <Image
                source={{ uri: profile.user_metadata.avatar_url }}
                style={styles.profilePic}
              />
            ) : (
              <View style={styles.profilePicPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {profile?.user_metadata?.full_name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.user_metadata?.full_name || 'User'}</Text>
            <Text style={styles.profileEmail}>{profile?.email}</Text>
            <View style={styles.profileStats}>
              <StatBadge label="Listings" value={0} />
              <StatBadge label="Reviews" value={0} />
              <StatBadge label="Saves" value={0} />
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <MenuItem
            icon={<MaterialIcons name="dashboard" size={20} color="#3b82f6" />}
            label="Dashboard"
            onPress={() => router.push('/profile/dashboard')}
          />
          <MenuItem
            icon={<MaterialIcons name="inventory" size={20} color="#10b981" />}
            label="My Listings"
            onPress={() => router.push('/profile/my-listings')}
          />
          <MenuItem
            icon={<MaterialIcons name="shopping-bag" size={20} color="#f59e0b" />}
            label="My Bookings"
            onPress={() => router.push('/profile/my-bookings')}
          />
          <MenuItem
            icon={<MaterialIcons name="attach-money" size={20} color="#16a34a" />}
            label="Earnings"
            onPress={() => router.push('/profile/earnings')}
          />
        </View>

        {/* Profile Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Management</Text>
          <MenuItem
            icon={<MaterialIcons name="settings" size={20} color="#64748b" />}
            label="Account Settings"
            onPress={() => router.push('/profile/settings')}
          />
          <MenuItem
            icon={<MaterialIcons name="star" size={20} color="#fbbf24" />}
            label="Reviews & Ratings"
            onPress={() => router.push('/profile/reviews')}
          />
          <MenuItem
            icon={<MaterialIcons name="favorite" size={20} color="#ec4899" />}
            label="Saved Items"
            onPress={() => router.push('/saved')}
          />
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Pressable
            style={[styles.menuItem, styles.logoutItem]}
            onPress={logout}
          >
            <View style={styles.menuItemContent}>
              <MaterialIcons name="logout" size={20} color="#ef4444" />
              <Text style={[styles.menuItemLabel, styles.logoutLabel]}>Logout</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#cbd5e1" />
          </Pressable>
        </View>

        {/* App Version */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>RentVerse v1.0.0</Text>
          <Text style={styles.footerText}>© 2024 All rights reserved</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function MenuItem({ icon, label, onPress, badge }: any) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemContent}>
        {icon}
        <Text style={styles.menuItemLabel}>{label}</Text>
        {badge && (
          <View style={styles.menuItemBadge}>
            <Text style={styles.menuItemBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#cbd5e1" />
    </Pressable>
  );
}

function StatBadge({ label, value }) {
  return (
    <View style={styles.statBadge}>
      <Text style={styles.statBadgeValue}>{value}</Text>
      <Text style={styles.statBadgeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingBottom: 40,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
    marginTop: 60,
  },
  stateTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  signInButton: {
    marginTop: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    gap: 16,
  },
  profilePicContainer: {
    marginRight: 4,
  },
  profilePic: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profilePicPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  profileStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statBadge: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statBadgeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  statBadgeLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  menuItemBadge: {
    marginLeft: 'auto',
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
  },
  menuItemBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutLabel: {
    color: '#ef4444',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 11,
    color: '#94a3b8',
  },
});
