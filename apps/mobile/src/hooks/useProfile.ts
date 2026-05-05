import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCurrentAuthProfile,
  fetchProfileListings,
  fetchProfileReviews,
  fetchProfileSummary,
  reportUser,
  updateCurrentEmail,
  updateCurrentProfile,
} from '../api/profile.api';

export function useCurrentAuthProfile() {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: fetchCurrentAuthProfile,
  });
}

export function useProfileSummary(userId: string) {
  return useQuery({
    queryKey: ['profile', userId, 'summary'],
    queryFn: () => fetchProfileSummary(userId),
    enabled: !!userId,
  });
}

export function useProfileListings(userId: string) {
  return useQuery({
    queryKey: ['profile', userId, 'listings'],
    queryFn: () => fetchProfileListings(userId),
    enabled: !!userId,
  });
}

export function useProfileReviews(userId: string) {
  return useQuery({
    queryKey: ['profile', userId, 'reviews'],
    queryFn: () => fetchProfileReviews(userId),
    enabled: !!userId,
  });
}

export function useUpdateCurrentProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCurrentProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    },
  });
}

export function useUpdateCurrentEmail() {
  return useMutation({
    mutationFn: updateCurrentEmail,
  });
}

export function useReportUserMutation() {
  return useMutation({
    mutationFn: reportUser,
  });
}
