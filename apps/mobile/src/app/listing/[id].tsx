import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Alert, Dimensions, Image, Linking, Pressable, ScrollView,
  StyleSheet, Text, View, ActivityIndicator, Platform, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useListingDetail, useReportListingMutation, useSaveListingMutation, useSavedListingIds } from '../../hooks/useMarketplace';
import { useAuth } from '../../hooks/useAuth';
import { useStartConversationMutation } from '../../hooks/useChat';

const { width: SCREEN_W } = Dimensions.get('window');

const AVATAR_COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444'];
function avatarColor(name = '') {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const fmt = (n: number) => `PKR ${Number(n).toLocaleString()}`;

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  const listingQuery = useListingDetail(String(id || ''));
  const savedIdsQuery = useSavedListingIds();
  const saveMutation = useSaveListingMutation();
  const reportMutation = useReportListingMutation();
  const startConversation = useStartConversationMutation();

  const [imgIdx, setImgIdx] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);

  const listing = listingQuery.data;
  const isSaved = useMemo(() => Boolean(listing && savedIdsQuery.data?.includes(listing.id)), [listing, savedIdsQuery.data]);
  const isOwner = listing?.seller?.id === currentUser?.id;

  const promptAuth = () => Alert.alert('Login required', 'Sign in to use this feature.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Login', onPress: () => router.push('/(auth)/login') },
  ]);

  const handleSave = () => {
    if (!currentUser?.id) { promptAuth(); return; }
    saveMutation.mutate(listing!.id);
  };

  const handleContactSeller = async () => {
    if (!currentUser?.id) { promptAuth(); return; }
    if (isOwner) { Alert.alert('Notice', 'This is your own listing.'); return; }
    try {
      const result = await startConversation.mutateAsync({ listingId: listing!.id, sellerId: listing!.seller.id });
      router.push({ pathname: '/messages/[id]', params: { id: result.id, listingContextId: listing!.id } } as any);
    } catch { Alert.alert('Error', 'Could not start conversation'); }
  };

  const handleBuy = () => {
    if (!currentUser?.id) { promptAuth(); return; }
    if (isOwner) { Alert.alert('Notice', 'You cannot buy your own listing.'); return; }
    router.push({ pathname: '/checkout/[listingId]', params: { listingId: listing!.id, orderType: 'buy' } } as any);
  };

  const handleRent = () => {
    if (!currentUser?.id) { promptAuth(); return; }
    if (isOwner) { Alert.alert('Notice', 'You cannot rent your own listing.'); return; }
    router.push({ pathname: '/checkout/[listingId]', params: { listingId: listing!.id, orderType: 'rent' } } as any);
  };

  const handleReport = () => {
    if (!currentUser?.id) { promptAuth(); return; }
    Alert.alert('Report listing', 'Choose a reason', [
      { text: 'Fake listing', onPress: () => reportMutation.mutate({ listingId: listing!.id, reasonCode: 'fake_listing' }) },
      { text: 'Spam or scam', onPress: () => reportMutation.mutate({ listingId: listing!.id, reasonCode: 'spam_or_scam' }) },
      { text: 'Prohibited item', onPress: () => reportMutation.mutate({ listingId: listing!.id, reasonCode: 'prohibited_item' }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onImageScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setImgIdx(idx);
  };

  if (listingQuery.isLoading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );

  if (!listing) return (
    <View style={styles.center}>
      <MaterialIcons name="error-outline" size={48} color="#94a3b8" />
      <Text style={styles.notFoundText}>Listing not found</Text>
      <Pressable onPress={() => router.back()} style={styles.backFallback}>
        <Text style={styles.backFallbackText}>Go back</Text>
      </Pressable>
    </View>
  );

  const canBuy = (listing.type === 'buy' || listing.type === 'both') && listing.price?.buy;
  const canRent = (listing.type === 'rent' || listing.type === 'both') && listing.price?.rent?.daily;
  const hasBothActions = canBuy && canRent;

  const descFull = listing.description || '';
  const descShort = descFull.slice(0, 160);
  const descTruncated = descFull.length > 160 && !descExpanded;

  return (
    <View style={styles.root}>
      {/* ── SCROLLABLE CONTENT ── */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── IMAGE CAROUSEL ── */}
        <View style={styles.imageSection}>
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onScroll={onImageScroll} scrollEventThrottle={16}
          >
            {listing.images?.length ? listing.images.map((img, i) => (
              <Image key={i} source={{ uri: img }} style={styles.heroImage} />
            )) : (
              <View style={[styles.heroImage, styles.heroFallback]}>
                <MaterialIcons name="image-not-supported" size={56} color="#cbd5e1" />
                <Text style={styles.heroFallbackText}>No photos</Text>
              </View>
            )}
          </ScrollView>

          {/* Back button */}
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
          </Pressable>

          {/* Save button */}
          <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saveMutation.isPending} hitSlop={8}>
            <MaterialIcons name={isSaved ? 'favorite' : 'favorite-border'} size={22} color={isSaved ? '#ef4444' : '#0f172a'} />
          </Pressable>

          {/* Image indicators */}
          {listing.images?.length > 1 && (
            <View style={styles.indicators}>
              {listing.images.map((_, i) => (
                <View key={i} style={[styles.dot, i === imgIdx && styles.dotActive]} />
              ))}
            </View>
          )}

          {/* Type badge */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{listing.type?.toUpperCase()}</Text>
          </View>
        </View>

        {/* ── MAIN CARD ── */}
        <View style={styles.card}>

          {/* Title + Category */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{listing.title}</Text>
              <View style={styles.metaPills}>
                <View style={styles.pill}>
                  <MaterialIcons name="category" size={12} color="#64748b" />
                  <Text style={styles.pillText}>{listing.category}</Text>
                </View>
                <View style={styles.pill}>
                  <MaterialIcons name="auto-awesome" size={12} color="#64748b" />
                  <Text style={styles.pillText}>{(listing.condition || '').replace('_', ' ')}</Text>
                </View>
                {listing.views > 0 && (
                  <View style={styles.pill}>
                    <MaterialIcons name="visibility" size={12} color="#64748b" />
                    <Text style={styles.pillText}>{listing.views} views</Text>
                  </View>
                )}
              </View>
            </View>
            {/* Rating */}
            <View style={styles.ratingBadge}>
              <MaterialIcons name="star" size={16} color="#f59e0b" />
              <Text style={styles.ratingText}>{listing.seller?.rating?.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({listing.seller?.totalReviews})</Text>
            </View>
          </View>

          {/* Price block */}
          <View style={styles.priceBlock}>
            {canBuy && (
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>Buy Price</Text>
                <Text style={styles.priceValue}>{fmt(listing.price.buy!)}</Text>
              </View>
            )}
            {canRent && (
              <View style={[styles.priceItem, canBuy && styles.priceItemBorder]}>
                <Text style={styles.priceLabel}>Rent / Day</Text>
                <Text style={[styles.priceValue, { color: '#059669' }]}>{fmt(listing.price.rent!.daily!)}</Text>
                {listing.price.rent?.weekly && <Text style={styles.priceSub}>{fmt(listing.price.rent.weekly)}/wk</Text>}
                {listing.price.rent?.monthly && <Text style={styles.priceSub}>{fmt(listing.price.rent.monthly)}/mo</Text>}
              </View>
            )}
          </View>

          {/* ── ACTION BUTTONS ── */}
          {!isOwner && (
            <View style={styles.actionSection}>
              {/* Buy / Rent row */}
              {(canBuy || canRent) && (
                <View style={[styles.btnRow, { marginBottom: 10 }]}>
                  {canBuy && (
                    <Pressable style={[styles.primaryBtn, hasBothActions && { flex: 1 }]} onPress={handleBuy}>
                      <MaterialIcons name="shopping-cart" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>Buy Now</Text>
                    </Pressable>
                  )}
                  {canRent && (
                    <Pressable style={[styles.rentBtn, hasBothActions && { flex: 1 }]} onPress={handleRent}>
                      <MaterialIcons name="event" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>Rent Now</Text>
                    </Pressable>
                  )}
                </View>
              )}
              {/* Message seller – full width secondary */}
              <Pressable style={styles.secondaryBtn} onPress={handleContactSeller} disabled={startConversation.isPending}>
                {startConversation.isPending
                  ? <ActivityIndicator size="small" color="#3b82f6" />
                  : <>
                    <MaterialIcons name="chat-bubble-outline" size={18} color="#3b82f6" />
                    <Text style={styles.secondaryBtnText}>Message Seller</Text>
                  </>
                }
              </Pressable>
            </View>
          )}

          {/* ── LOCATION ── */}
          <Pressable
            style={styles.locationCard}
            onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(`${listing.location?.city} ${listing.location?.area}`)}`)}
          >
            <View style={styles.locationIcon}>
              <MaterialIcons name="place" size={22} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationCity}>{listing.location?.city}</Text>
              <Text style={styles.locationArea}>{listing.location?.area}{listing.location?.address ? ` · ${listing.location.address}` : ''}</Text>
            </View>
            <View style={styles.mapBtn}>
              <Text style={styles.mapBtnText}>Map</Text>
              <MaterialIcons name="open-in-new" size={14} color="#3b82f6" />
            </View>
          </Pressable>

          {/* ── DESCRIPTION ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{descTruncated ? descShort + '…' : descFull}</Text>
            {descFull.length > 160 && (
              <Pressable onPress={() => setDescExpanded(!descExpanded)} style={styles.readMore}>
                <Text style={styles.readMoreText}>{descExpanded ? 'Show less' : 'Read more'}</Text>
                <MaterialIcons name={descExpanded ? 'expand-less' : 'expand-more'} size={16} color="#3b82f6" />
              </Pressable>
            )}
          </View>

          {/* ── FEATURES ── */}
          {listing.features?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Features</Text>
              <View style={styles.chipRow}>
                {listing.features.map((f: string) => (
                  <View key={f} style={styles.chip}>
                    <MaterialIcons name="check-circle" size={13} color="#3b82f6" />
                    <Text style={styles.chipText}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── SPECIFICATIONS ── */}
          {listing.specifications && Object.keys(listing.specifications).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specifications</Text>
              <View style={styles.specGrid}>
                {Object.entries(listing.specifications).map(([k, v]) => (
                  <View key={k} style={styles.specItem}>
                    <Text style={styles.specKey}>{k}</Text>
                    <Text style={styles.specVal}>{String(v ?? '—')}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── SELLER ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seller</Text>
            <Pressable
              style={styles.sellerCard}
              onPress={() => router.push({ pathname: '/user/[id]', params: { id: listing.seller.id } } as any)}
            >
              <View style={[styles.sellerAvatar, { backgroundColor: avatarColor(listing.seller.name) }]}>
                <Text style={styles.sellerAvatarText}>{listing.seller.name?.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.sellerNameRow}>
                  <Text style={styles.sellerName}>{listing.seller.name}</Text>
                  {listing.seller.verified && (
                    <View style={styles.verifiedBadge}>
                      <MaterialIcons name="verified" size={14} color="#fff" />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sellerMeta}>{listing.seller.totalReviews} reviews · ⭐ {listing.seller.rating?.toFixed(1)}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
            </Pressable>
          </View>

          {/* ── REPORT ── */}
          <Pressable style={styles.reportBtn} onPress={handleReport} disabled={reportMutation.isPending}>
            <MaterialIcons name="flag" size={16} color="#94a3b8" />
            <Text style={styles.reportText}>{reportMutation.isPending ? 'Reporting…' : 'Report this listing'}</Text>
          </Pressable>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', gap: 12 },
  notFoundText: { fontSize: 17, fontWeight: '700', color: '#334155' },
  backFallback: { marginTop: 8, backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backFallbackText: { color: '#fff', fontWeight: '700' },

  /* Image */
  imageSection: { position: 'relative', height: 320, backgroundColor: '#e2e8f0' },
  heroImage: { width: SCREEN_W, height: 320, resizeMode: 'cover' },
  heroFallback: { justifyContent: 'center', alignItems: 'center', gap: 8 },
  heroFallbackText: { color: '#94a3b8', fontSize: 14 },
  backBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 54 : 36, left: 16,
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 4,
  },
  saveBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 54 : 36, right: 16,
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 4,
  },
  indicators: { position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 18, backgroundColor: '#fff' },
  typeBadge: {
    position: 'absolute', bottom: 14, left: 16,
    backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  typeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  /* Card */
  card: {
    marginTop: -24, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 6,
  },

  /* Title */
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', lineHeight: 30, marginBottom: 8 },
  metaPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  pillText: { fontSize: 11, color: '#64748b', fontWeight: '600', textTransform: 'capitalize' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 3, borderWidth: 1, borderColor: '#fde68a' },
  ratingText: { fontSize: 14, fontWeight: '800', color: '#92400e' },
  ratingCount: { fontSize: 11, color: '#b45309' },

  /* Price */
  priceBlock: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  priceItem: { flex: 1, paddingHorizontal: 8 },
  priceItemBorder: { borderLeftWidth: 1, borderLeftColor: '#e2e8f0' },
  priceLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  priceValue: { fontSize: 22, fontWeight: '900', color: '#1e40af' },
  priceSub: { fontSize: 12, color: '#64748b', marginTop: 2 },

  /* Actions */
  actionSection: { marginBottom: 20 },
  btnRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1d4ed8', borderRadius: 16, paddingVertical: 15,
    shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  rentBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#059669', borderRadius: 16, paddingVertical: 15,
    shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: '#3b82f6', borderRadius: 16, paddingVertical: 14,
    backgroundColor: '#eff6ff',
  },
  secondaryBtnText: { color: '#1d4ed8', fontWeight: '800', fontSize: 15 },

  /* Location */
  locationCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc',
    borderRadius: 16, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0',
  },
  locationIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  locationCity: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  locationArea: { fontSize: 13, color: '#64748b', marginTop: 2 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  mapBtnText: { fontSize: 13, color: '#3b82f6', fontWeight: '700' },

  /* Sections */
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  description: { fontSize: 15, color: '#475569', lineHeight: 24 },
  readMore: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 2 },
  readMoreText: { color: '#3b82f6', fontWeight: '700', fontSize: 14 },

  /* Features */
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#bfdbfe' },
  chipText: { color: '#1e40af', fontWeight: '600', fontSize: 13 },

  /* Specs */
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  specItem: { width: '48%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  specKey: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textTransform: 'capitalize', marginBottom: 4 },
  specVal: { fontSize: 15, fontWeight: '700', color: '#0f172a' },

  /* Seller */
  sellerCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sellerAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  sellerAvatarText: { color: '#fff', fontWeight: '800', fontSize: 20 },
  sellerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sellerName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#10b981', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  verifiedText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  sellerMeta: { fontSize: 13, color: '#64748b' },

  /* Report */
  reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, marginTop: 8, marginBottom: 8 },
  reportText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
});
