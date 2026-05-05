import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { MarketplaceListing } from '../../api/marketplace.api';
import theme from '../../constants/theme';

interface ListingCardProps {
  listing: MarketplaceListing;
  onPress?: () => void;
  compact?: boolean;
  showRank?: boolean;
}

const formatPrice = (listing: MarketplaceListing) => {
  if (listing.type === 'buy' || listing.type === 'both') {
    return listing.price.buy ? `PKR ${Number(listing.price.buy).toLocaleString()}` : 'Price on request';
  }

  if (listing.price.rent?.daily) {
    return `PKR ${Number(listing.price.rent.daily).toLocaleString()}/day`;
  }

  return 'Rent on request';
};

export function ListingCard({ listing, onPress, compact = false, showRank = false }: ListingCardProps) {
  const imageUrl = listing.images[0];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, compact && styles.cardCompact, pressed && styles.pressed]}>
      <View style={[styles.imageWrap, compact && styles.imageWrapCompact]}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} /> : <View style={styles.imageFallback} />}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{listing.type.toUpperCase()}</Text>
          </View>
          {showRank && listing.rankPosition ? (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{listing.rankPosition}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.title}>
          {listing.title}
        </Text>
        <Text numberOfLines={1} style={styles.location}>
          {listing.location.city} • {listing.location.area}
        </Text>
        <Text numberOfLines={compact ? 1 : 2} style={styles.description}>
          {listing.description}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.price}>{formatPrice(listing)}</Text>
          <View style={styles.metaPill}>
            <MaterialIcons name="favorite-border" size={14} color={theme.colors.text.primary} />
            <Text style={styles.metaText}>{listing.saves}</Text>
          </View>
        </View>

        <View style={styles.sellerRow}>
          <Text numberOfLines={1} style={styles.sellerName}>
            {listing.seller.name}
          </Text>
          <View style={styles.ratingPill}>
            <MaterialIcons name="star" size={14} color={theme.colors.status.warning} />
            <Text style={styles.ratingText}>{listing.seller.rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background.surface,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardCompact: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  imageWrap: {
    aspectRatio: 1,
    backgroundColor: theme.colors.neutral.veryLightGray,
  },
  imageWrapCompact: {
    aspectRatio: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.neutral.mediumGray,
  },
  badgeRow: {
    position: 'absolute',
    left: 12,
    top: 12,
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    backgroundColor: 'rgba(29, 78, 216, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    color: theme.colors.text.inverse,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  rankBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  rankText: {
    color: theme.colors.text.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  location: {
    marginTop: 4,
    color: theme.colors.text.secondary,
    fontSize: 12,
  },
  description: {
    marginTop: 8,
    color: theme.colors.text.secondary,
    fontSize: 12,
    lineHeight: 17,
  },
  metaRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.neutral.veryLightGray,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  metaText: {
    color: theme.colors.text.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  sellerRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sellerName: {
    flex: 1,
    color: theme.colors.secondary.darkSlate,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fffbeb',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ratingText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '700',
  },
});
