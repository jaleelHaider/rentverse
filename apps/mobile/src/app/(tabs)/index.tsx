import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ListingCard } from '../../components/listings/ListingCard';
import type { MarketplaceListing } from '../../api/marketplace.api';
import { useMarketplaceListings } from '../../hooks/useMarketplace';
import theme from '../../constants/theme';

const categoryPills = [
  { label: 'Electronics', icon: 'devices' as const },
  { label: 'Vehicles', icon: 'directions-car' as const },
  { label: 'Home', icon: 'chair' as const },
  { label: 'Fashion', icon: 'checkroom' as const },
  { label: 'Tools', icon: 'handyman' as const },
  { label: 'Services', icon: 'miscellaneous-services' as const },
];

const trustHighlights = [
  { icon: 'verified-user', title: 'Escrow Protected', subtitle: 'Safer transactions' },
  { icon: 'trending-up', title: 'AI Smart Match', subtitle: 'Better recommendations' },
  { icon: 'schedule', title: 'Short Rentals', subtitle: 'Hourly to monthly' },
];

const featuredBatchSize = 28;
const featuredLoadStep = 14;

const formatCompactPrice = (listing: MarketplaceListing) => {
  if (listing.type === 'buy' || listing.type === 'both') {
    return listing.price.buy ? `PKR ${Number(listing.price.buy).toLocaleString()}` : 'Price on request';
  }

  if (listing.price.rent?.daily) {
    return `PKR ${Number(listing.price.rent.daily).toLocaleString()}/day`;
  }

  return 'Rent on request';
};

export default function HomeScreen() {
  const router = useRouter();
  const marketplaceQuery = useMarketplaceListings();
  const listings = marketplaceQuery.data || [];

  const recommendedListings = useMemo(() => listings.slice(0, 2), [listings]);
  const featuredSourceListings = useMemo(() => listings.slice(2), [listings]);
  const [visibleFeaturedCount, setVisibleFeaturedCount] = useState(featuredBatchSize);

  useEffect(() => {
    setVisibleFeaturedCount(featuredBatchSize);
  }, [featuredSourceListings.length]);

  const featuredListings = useMemo(
    () => featuredSourceListings.slice(0, Math.min(visibleFeaturedCount, featuredSourceListings.length)),
    [featuredSourceListings, visibleFeaturedCount],
  );

  const featuredRows = useMemo(() => {
    const rows: typeof featuredListings[] = [];
    for (let index = 0; index < featuredListings.length; index += 2) {
      rows.push(featuredListings.slice(index, index + 2));
    }
    return rows;
  }, [featuredListings]);

  const refreshControl = (
    <RefreshControl refreshing={marketplaceQuery.isRefetching} onRefresh={() => marketplaceQuery.refetch()} tintColor={theme.colors.primary.blue} />
  );

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);

    if (distanceFromBottom < 900 && visibleFeaturedCount < featuredSourceListings.length) {
      setVisibleFeaturedCount((current) => Math.min(current + featuredLoadStep, featuredSourceListings.length));
    }
  };

  return (
    <ScrollView
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.screenContent}
      scrollEventThrottle={16}
      onScroll={handleScroll}
    >
      <StatusBar style="light" />

      <View style={styles.container}>
        <LinearGradient colors={[theme.colors.primary.darkBlue, '#2563eb', '#60a5fa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroBadge}>
            <MaterialIcons name="auto-awesome" size={14} color={theme.colors.primary.blue} />
            <Text style={styles.heroBadgeText}>Pakistan's trusted rental marketplace</Text>
          </View>

          <Text style={styles.title}>Rent, buy, or sell anything nearby.</Text>
          <Text style={styles.subtitle}>Discover verified listings, AI recommendations, and safer transactions powered by RentVerse.</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>50K+</Text>
              <Text style={styles.heroStatLabel}>Users</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>200K+</Text>
              <Text style={styles.heroStatLabel}>Listings</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>98%</Text>
              <Text style={styles.heroStatLabel}>Satisfaction</Text>
            </View>
          </View>

          <Pressable style={styles.searchBar} onPress={() => router.push('/search')}>
            <MaterialIcons name="search" size={20} color={theme.colors.neutral.mediumGray} />
            <Text style={styles.searchPlaceholder}>Search listings, categories, or sellers</Text>
            <MaterialIcons name="tune" size={18} color={theme.colors.secondary.slate} />
          </Pressable>

        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          <Pressable onPress={() => router.push('/search')}>
            <Text style={styles.sectionLink}>View all</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScrollContent}>
          {categoryPills.map((category) => (
            <Pressable
              key={category.label}
              style={styles.categoryPill}
              onPress={() => router.push({ pathname: '/search', params: { category: category.label } })}
            >
              <View style={styles.categoryIconWrap}>
                <MaterialIcons name={category.icon} size={20} color={theme.colors.primary.blue} />
              </View>
              <Text style={styles.categoryPillLabel}>{category.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended For You (AI)</Text>
          <Text style={styles.sectionMetaText}>{recommendedListings.length} picks</Text>
        </View>

        {marketplaceQuery.isLoading ? (
          <View style={styles.loadingWrap}><ActivityIndicator size="large" color={theme.colors.primary.blue} /></View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContent}>
            {recommendedListings.map((item) => (
              <Pressable
                key={item.id}
                style={styles.carouselCard}
                onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}
              >
                <Image source={{ uri: item.images[0] }} style={styles.carouselImage} />
                <LinearGradient colors={['transparent', 'rgba(15,23,42,0.92)']} style={styles.carouselOverlay}>
                  <Text numberOfLines={1} style={styles.carouselTitle}>{item.title}</Text>
                  <Text numberOfLines={1} style={styles.carouselMeta}>{formatCompactPrice(item)} • {item.location.city}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Why Choose RentVerse</Text>
          <Pressable onPress={() => router.push('/search')}>
            <Text style={styles.sectionLink}>View all</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.benefitsContent}>
          {trustHighlights.map((benefit) => (
            <View key={benefit.title} style={styles.benefitCard}>
              <View style={styles.benefitIconWrap}>
                <MaterialIcons name={benefit.icon as never} size={20} color={theme.colors.primary.blue} />
              </View>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitSubtitle}>{benefit.subtitle}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Listings</Text>
          <Text style={styles.sectionMetaText}>{featuredListings.length} shown</Text>
        </View>

        {marketplaceQuery.isLoading ? (
          <View style={styles.loadingWrap}><ActivityIndicator size="large" color={theme.colors.primary.blue} /></View>
        ) : (
          featuredRows.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.gridRow}>
              {row.map((item) => (
                <View key={item.id} style={styles.gridItemWrap}>
                  <ListingCard listing={item} compact onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })} />
                </View>
              ))}
              {row.length === 1 ? <View style={styles.gridItemWrap} /> : null}
            </View>
          ))
        )}

        {!marketplaceQuery.isLoading && listings.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="storefront" size={44} color={theme.colors.neutral.mediumGray} />
            <Text style={styles.emptyTitle}>No active listings yet</Text>
            <Text style={styles.emptyText}>Check back later or add some items from the web dashboard.</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: 36, backgroundColor: theme.colors.background.primary },
  container: { paddingTop: 18 },
  hero: {
    marginHorizontal: 16,
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: { color: theme.colors.primary.darkBlue, fontSize: 11, fontWeight: '800' },
  title: { color: theme.colors.text.inverse, fontSize: 29, fontWeight: '900', lineHeight: 34, marginTop: 12 },
  subtitle: { color: '#dbeafe', marginTop: 8, lineHeight: 20, fontSize: 13.5 },
  heroStatsRow: { marginTop: 14, flexDirection: 'row', gap: 8 },
  heroStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  heroStatValue: { color: theme.colors.text.inverse, fontSize: 15, fontWeight: '900' },
  heroStatLabel: { color: '#bfdbfe', marginTop: 2, fontSize: 11, fontWeight: '700' },
  searchBar: {
    marginTop: 14,
    backgroundColor: theme.colors.background.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchPlaceholder: { color: theme.colors.secondary.slate, fontWeight: '600', flex: 1 },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { color: theme.colors.text.primary, fontSize: 19, fontWeight: '900' },
  sectionLink: { color: theme.colors.primary.blue, fontWeight: '800' },
  sectionMetaText: { color: theme.colors.secondary.slate, fontWeight: '700', fontSize: 12 },
  categoriesScrollContent: { paddingHorizontal: 16, gap: 10, paddingBottom: 2 },
  categoryPill: {
    backgroundColor: theme.colors.background.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillLabel: { color: theme.colors.secondary.darkSlate, fontSize: 12, fontWeight: '800' },
  carouselContent: { paddingHorizontal: 16, gap: 12 },
  carouselCard: {
    width: 278,
    height: 190,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  carouselImage: { width: '100%', height: '100%' },
  carouselOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    padding: 12,
  },
  carouselTitle: { color: theme.colors.text.inverse, fontSize: 16, fontWeight: '900' },
  carouselMeta: { color: '#cbd5e1', marginTop: 4, fontWeight: '700', fontSize: 12 },
  gridRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginTop: 6 },
  gridItemWrap: { flex: 1 },
  loadingWrap: { paddingVertical: 24 },
  benefitsContent: { paddingHorizontal: 16, gap: 10 },
  benefitCard: {
    width: 170,
    backgroundColor: theme.colors.background.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    padding: 14,
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  benefitTitle: { color: theme.colors.text.primary, fontWeight: '800', fontSize: 14 },
  benefitSubtitle: { color: theme.colors.text.secondary, marginTop: 4, fontSize: 12, lineHeight: 17 },
  emptyState: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 36 },
  emptyTitle: { marginTop: 12, color: theme.colors.text.primary, fontSize: 18, fontWeight: '900' },
  emptyText: { marginTop: 8, color: theme.colors.text.secondary, textAlign: 'center', lineHeight: 20 },
});
