import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { ListingCard } from '../listings/ListingCard';
import { useAuth } from '../../hooks/useAuth';
import { useCurrentAuthProfile, useProfileListings, useProfileReviews, useProfileSummary, useReportUserMutation } from '../../hooks/useProfile';
import { getPreferences, setPreferences } from '../../utils/preferencesStorage';

interface ProfileViewProps {
  userId: string;
  mode: 'own' | 'other';
}

export function ProfileView({ userId, mode }: ProfileViewProps) {
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'about' | 'listings'>('about');
  const [preferences, setLocalPreferences] = useState({ notificationsEnabled: true, darkMode: false, language: 'en' as 'en' | 'ne' });

  const authProfile = useCurrentAuthProfile();
  const summary = useProfileSummary(userId);
  const listings = useProfileListings(userId);
  const reviews = useProfileReviews(userId);
  const reportMutation = useReportUserMutation();

  useEffect(() => {
    void (async () => {
      const storedPreferences = await getPreferences();
      setLocalPreferences({
        notificationsEnabled: storedPreferences.notificationsEnabled,
        darkMode: storedPreferences.darkMode,
        language: storedPreferences.language,
      });
    })();
  }, []);

  const profileName = mode === 'own'
    ? authProfile.data?.profile.name || currentUser?.user_metadata?.full_name || currentUser?.email || 'Your profile'
    : summary.data?.profile.name || 'Profile';

  const profileCity = summary.data?.profile.city || authProfile.data?.profile.city || '';
  const profileDescription = summary.data?.profile.description || currentUser?.user_metadata?.description || 'No description added yet.';
  const stats = summary.data?.stats;
  const displayedReviews = reviews.data || [];
  const displayedListings = listings.data || [];

  const avatarLabel = useMemo(() => {
    const source = profileName.trim() || 'U';
    return source
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [profileName]);

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleReportUser = () => {
    Alert.alert('Report user', 'Choose a reason', [
      { text: 'Fraud or scam', onPress: () => reportMutation.mutate({ userId, reasonCode: 'fraud_or_scam' }) },
      { text: 'Harassment', onPress: () => reportMutation.mutate({ userId, reasonCode: 'harassment' }) },
      { text: 'Abusive behavior', onPress: () => reportMutation.mutate({ userId, reasonCode: 'abusive_behavior' }) },
      { text: 'Other', onPress: () => reportMutation.mutate({ userId, reasonCode: 'other' }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const togglePreference = async (key: 'notificationsEnabled' | 'darkMode') => {
    const nextPreferences = { ...preferences, [key]: !preferences[key] };
    setLocalPreferences(nextPreferences);
    await setPreferences(nextPreferences);
  };

  const renderReview = ({ item }: { item: (typeof displayedReviews)[number] }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewTitle}>{item.title || 'Review'}</Text>
        <View style={styles.reviewRating}>
          <MaterialIcons name="star" size={14} color="#eab308" />
          <Text style={styles.reviewRatingText}>{item.rating.toFixed(1)}</Text>
        </View>
      </View>
      <Text style={styles.reviewMeta}>{item.reviewerName} on {item.listingTitle}</Text>
      {item.comment ? <Text style={styles.reviewComment}>{item.comment}</Text> : null}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={summary.isLoading || listings.isLoading} onRefresh={() => summary.refetch()} />}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarLabel}</Text>
        </View>
        <Text style={styles.name}>{profileName}</Text>
        <Text style={styles.email}>{mode === 'own' ? authProfile.data?.user.email || currentUser?.email : profileCity}</Text>
        {profileCity ? <Text style={styles.city}>{profileCity}</Text> : null}

        <View style={styles.badgesRow}>
          {summary.data?.profile.kycVerified ? (
            <View style={styles.badge}><Text style={styles.badgeText}>KYC verified</Text></View>
          ) : null}
          {summary.data?.profile.verifiedSeller ? (
            <View style={styles.badge}><Text style={styles.badgeText}>Verified seller</Text></View>
          ) : null}
        </View>

        <View style={styles.actionRow}>
          {mode === 'own' ? (
            <>
              <Pressable style={styles.primaryAction} onPress={() => router.push('/profile/edit')}>
                <Text style={styles.primaryActionText}>Edit profile</Text>
              </Pressable>
              <Pressable style={styles.secondaryAction} onPress={() => router.push('/profile/settings')}>
                <Text style={styles.secondaryActionText}>Settings</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.primaryAction} onPress={() => router.push('/messages')}>
                <Text style={styles.primaryActionText}>Message seller</Text>
              </Pressable>
              <Pressable style={styles.secondaryAction} onPress={handleReportUser} disabled={reportMutation.isPending}>
                <Text style={styles.secondaryActionText}>{reportMutation.isPending ? 'Reporting...' : 'Report user'}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {stats ? (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}><Text style={styles.statValue}>{stats.avgRating.toFixed(1)}</Text><Text style={styles.statLabel}>Rating</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{stats.totalReviews}</Text><Text style={styles.statLabel}>Reviews</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{stats.activeListings}</Text><Text style={styles.statLabel}>Active</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{stats.totalTransactions}</Text><Text style={styles.statLabel}>Deals</Text></View>
        </View>
      ) : null}

      <View style={styles.segmentRow}>
        <Pressable style={[styles.segment, activeTab === 'about' && styles.segmentActive]} onPress={() => setActiveTab('about')}>
          <Text style={[styles.segmentText, activeTab === 'about' && styles.segmentTextActive]}>About</Text>
        </Pressable>
        <Pressable style={[styles.segment, activeTab === 'listings' && styles.segmentActive]} onPress={() => setActiveTab('listings')}>
          <Text style={[styles.segmentText, activeTab === 'listings' && styles.segmentTextActive]}>Listings</Text>
        </Pressable>
      </View>

      {activeTab === 'about' ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.sectionBody}>{profileDescription}</Text>

          <View style={styles.infoRow}>
            <MaterialIcons name="calendar-today" size={18} color="#64748b" />
            <Text style={styles.infoText}>Member since {summary.data?.profile.memberSince ? new Date(summary.data.profile.memberSince).getFullYear() : '—'}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="verified" size={18} color="#64748b" />
            <Text style={styles.infoText}>{summary.data?.profile.kycVerified ? 'Identity verified' : 'Verification pending'}</Text>
          </View>

          <View style={styles.preferenceCard}>
            <Text style={styles.preferenceLabel}>Notifications</Text>
            <Switch value={preferences.notificationsEnabled} onValueChange={() => void togglePreference('notificationsEnabled')} />
          </View>

          <View style={styles.preferenceCard}>
            <Text style={styles.preferenceLabel}>Dark mode</Text>
            <Switch value={preferences.darkMode} onValueChange={() => void togglePreference('darkMode')} />
          </View>

          <View style={styles.preferenceCard}>
            <Text style={styles.preferenceLabel}>Language</Text>
            <Text style={styles.preferenceValue}>{preferences.language === 'en' ? 'English' : 'Nepali'}</Text>
          </View>

          {displayedReviews.length ? (
            <View style={styles.reviewsSection}>
              <Text style={styles.sectionTitle}>Recent reviews</Text>
              <FlatList data={displayedReviews.slice(0, 3)} renderItem={renderReview} keyExtractor={(item) => item.id} scrollEnabled={false} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} />
            </View>
          ) : null}

          {mode === 'own' ? (
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Sign out</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Listings</Text>
            <Text style={styles.sectionCount}>{displayedListings.length}</Text>
          </View>

          <FlatList
            data={displayedListings}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <ListingCard
                listing={{
                  id: item.id,
                  title: item.title,
                  description: item.title,
                  type: 'both',
                  category: 'General',
                  subCategory: '',
                  categoryNodeKey: '',
                  categoryPath: '',
                  condition: item.status || 'good',
                  price: {
                    buy: item.price?.buy,
                    rent: {
                      daily: item.price?.rentDaily,
                      weekly: item.price?.rentWeekly,
                      monthly: item.price?.rentMonthly,
                    },
                  },
                  images: item.imageUrl ? [item.imageUrl] : [],
                  location: {
                    city: item.location?.city || profileCity || 'Unknown',
                    area: item.location?.area || '',
                  },
                  specifications: {},
                  features: [],
                  sellerTerms: [],
                  seller: { id: userId, name: profileName, rating: stats?.avgRating || 0, verified: summary.data?.profile.verifiedSeller || false, trustScore: 0, totalReviews: stats?.totalReviews || 0 },
                  availability: { forRent: true, forSale: true, totalForRent: 0, availableForRent: 0, totalForSale: 0, availableForSale: 0 },
                  aiMetadata: { qualityScore: 0, priceFairness: 0, fraudRisk: 0, categoryConfidence: 0 },
                  views: 0,
                  saves: 0,
                  createdAt: item.createdAt,
                  updatedAt: item.createdAt,
                  status: 'active',
                }}
                onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}
                compact
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListEmptyComponent={<Text style={styles.emptyText}>No active listings yet.</Text>}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { paddingBottom: 40 },
  hero: { backgroundColor: '#0f172a', paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  avatar: { width: 86, height: 86, borderRadius: 24, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '900' },
  name: { color: '#fff', fontSize: 24, fontWeight: '900' },
  email: { marginTop: 4, color: '#cbd5e1', fontSize: 14 },
  city: { marginTop: 2, color: '#94a3b8', fontSize: 13 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  badge: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryAction: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  primaryActionText: { color: '#0f172a', fontWeight: '800' },
  secondaryAction: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  secondaryActionText: { color: '#fff', fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, marginTop: 14 },
  statCard: { width: '48%', backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  statValue: { color: '#0f172a', fontSize: 22, fontWeight: '900' },
  statLabel: { marginTop: 4, color: '#64748b', fontSize: 13 },
  segmentRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 18, backgroundColor: '#e2e8f0', borderRadius: 16, padding: 4 },
  segment: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  segmentActive: { backgroundColor: '#0f172a' },
  segmentText: { color: '#475569', fontWeight: '700' },
  segmentTextActive: { color: '#fff' },
  sectionCard: { backgroundColor: '#fff', marginHorizontal: 20, marginTop: 16, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  sectionBody: { color: '#475569', marginTop: 10, lineHeight: 22 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  infoText: { color: '#334155', fontWeight: '600' },
  preferenceCard: { marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  preferenceLabel: { color: '#0f172a', fontWeight: '700' },
  preferenceValue: { color: '#334155', fontWeight: '700' },
  reviewsSection: { marginTop: 18 },
  reviewCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewTitle: { color: '#0f172a', fontWeight: '800' },
  reviewRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewRatingText: { color: '#92400e', fontWeight: '800' },
  reviewMeta: { marginTop: 6, color: '#64748b', fontSize: 12 },
  reviewComment: { marginTop: 8, color: '#334155', lineHeight: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionCount: { color: '#64748b', fontWeight: '700' },
  emptyText: { color: '#64748b', paddingVertical: 16 },
  logoutButton: { marginTop: 18, backgroundColor: '#fee2e2', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: '#b91c1c', fontWeight: '800' },
});
