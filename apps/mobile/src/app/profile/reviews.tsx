import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useProfileReviews } from '../../hooks/useProfile';
import { useAuth } from '../../hooks/useAuth';

export default function ReviewsScreen() {
  const { currentUser } = useAuth();
  const reviewsQuery = useProfileReviews(currentUser?.id || '');
  const [refreshing, setRefreshing] = useState(false);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const reviews = reviewsQuery.data || [];
  const isLoading = reviewsQuery.isLoading;

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    reviewsQuery.refetch().finally(() => setRefreshing(false));
  }, [reviewsQuery]);

  const filteredReviews = filterRating
    ? reviews.filter((r) => Math.round(r.rating) === filterRating)
    : reviews;

  const stats = {
    averageRating: reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0,
    totalReviews: reviews.length,
    fiveStars: reviews.filter((r) => r.rating >= 4.5).length,
    fourStars: reviews.filter((r) => r.rating >= 3.5 && r.rating < 4.5).length,
    threeStars: reviews.filter((r) => r.rating >= 2.5 && r.rating < 3.5).length,
    twoStars: reviews.filter((r) => r.rating >= 1.5 && r.rating < 2.5).length,
    oneStar: reviews.filter((r) => r.rating < 1.5).length,
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
        <Text style={styles.title}>Reviews & Ratings</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Rating Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.ratingDisplay}>
            <Text style={styles.ratingNumber}>{stats.averageRating}</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((i) => (
                <MaterialIcons
                  key={i}
                  name={i <= Math.round(Number(stats.averageRating)) ? "star" : "star-border"}
                  size={16}
                  color={i <= Math.round(Number(stats.averageRating)) ? '#fbbf24' : '#e5e7eb'}
                />
              ))}
            </View>
            <Text style={styles.totalReviews}>{stats.totalReviews} reviews</Text>
          </View>

          {/* Rating Distribution */}
          <View style={styles.ratingDistribution}>
            <RatingBar label="5 stars" count={stats.fiveStars} total={stats.totalReviews} />
            <RatingBar label="4 stars" count={stats.fourStars} total={stats.totalReviews} />
            <RatingBar label="3 stars" count={stats.threeStars} total={stats.totalReviews} />
            <RatingBar label="2 stars" count={stats.twoStars} total={stats.totalReviews} />
            <RatingBar label="1 star" count={stats.oneStar} total={stats.totalReviews} />
          </View>
        </View>

        {/* Filter Buttons */}
        {stats.totalReviews > 0 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Filter by Rating</Text>
            <View style={styles.filterButtons}>
              <Pressable
                style={[styles.filterButton, !filterRating && styles.filterButtonActive]}
                onPress={() => setFilterRating(null)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    !filterRating && styles.filterButtonTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {[5, 4, 3, 2, 1].map((rating) => (
                <Pressable
                  key={rating}
                  style={[
                    styles.filterButton,
                    filterRating === rating && styles.filterButtonActive,
                  ]}
                  onPress={() => setFilterRating(rating)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      filterRating === rating && styles.filterButtonTextActive,
                    ]}
                  >
                    {rating}★
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Reviews List */}
        {filteredReviews.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="trending-up" size={48} color="#cbd5e1" />
            <Text style={styles.emptyStateTitle}>No reviews yet</Text>
            <Text style={styles.emptyStateText}>
              {stats.totalReviews === 0
                ? 'Complete your first booking to receive reviews'
                : 'No reviews match your filter'}
            </Text>
          </View>
        ) : (
          <View style={styles.reviewsList}>
            {filteredReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function RatingBar({ label, count, total }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <View style={styles.ratingBarItem}>
      <Text style={styles.ratingBarLabel}>{label}</Text>
      <View style={styles.ratingBarTrack}>
        <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
      </View>
      <Text style={styles.ratingBarCount}>{count}</Text>
    </View>
  );
}

function ReviewCard({ review }) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View>
          <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
          <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
        </View>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((i) => (
            <MaterialIcons
              key={i}
              name={i <= Math.round(review.rating) ? "star" : "star-border"}
              size={14}
              color={i <= Math.round(review.rating) ? '#fbbf24' : '#e5e7eb'}
            />
          ))}
        </View>
      </View>

      {review.title && <Text style={styles.reviewTitle}>{review.title}</Text>}

      {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}

      {review.tags && review.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {review.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ratingDisplay: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  ratingNumber: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1e293b',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: 8,
  },
  totalReviews: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
  },
  ratingDistribution: {
    gap: 8,
  },
  ratingBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBarLabel: {
    fontSize: 12,
    color: '#64748b',
    width: 50,
  },
  ratingBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
  },
  ratingBarCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    width: 30,
    textAlign: 'right',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  filterButtonActive: {
    borderColor: '#fbbf24',
    backgroundColor: '#fffbeb',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: '#f59e0b',
  },
  reviewsList: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  reviewDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  reviewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#64748b',
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
});
