/**
 * User interaction repository.
 *
 * Provides a small wrapper around saved posts, liked posts and followed sellers.
 */
import { api } from '../http';
import { apiClient } from '../authClient';

export interface UserPostInteractionRow {
  userId: string;
  postId: string;
  createdAt: string;
}

export interface SellerFollowRow {
  followerId: string;
  sellerId: string;
  createdAt: string;
}

export const userInteractionsRepository = {
  listSavedPostIds: async (userId: string): Promise<string[]> => {
    const rows = await api.get<UserPostInteractionRow[]>('/saved_posts', {
      params: { userId },
    });
    return rows.map((row) => row.postId);
  },

  addSavedPost: (userId: string, postId: string) =>
    api.post<UserPostInteractionRow>('/saved_posts', {
      userId,
      postId,
    }),

  removeSavedPost: (userId: string, postId: string) =>
    api.delete<void>('/saved_posts', {
      params: { userId, postId },
    }),

  listLikedPostIds: async (userId: string): Promise<string[]> => {
    const rows = await api.get<UserPostInteractionRow[]>('/liked_posts', {
      params: { userId },
    });
    return rows.map((row) => row.postId);
  },

  addLikedPost: (userId: string, postId: string) =>
    api.post<UserPostInteractionRow>('/liked_posts', {
      userId,
      postId,
    }),

  removeLikedPost: (userId: string, postId: string) =>
    api.delete<void>('/liked_posts', {
      params: { userId, postId },
    }),

  /** Sellers this user follows ("Obuna"), kept on the server so they survive a reload. */
  listFollowedSellerIds: async (userId: string): Promise<string[]> => {
    const rows = await api.get<SellerFollowRow[]>('/seller_follows', {
      params: { followerId: userId },
    });
    return rows.map((row) => row.sellerId);
  },

  followSeller: (userId: string, sellerId: string) =>
    api.post<SellerFollowRow>('/seller_follows', {
      followerId: userId,
      sellerId,
    }),

  unfollowSeller: (userId: string, sellerId: string) =>
    api.delete<void>('/seller_follows', {
      params: { followerId: userId, sellerId },
    }),

  /** How many people follow a seller (public number; the list itself stays private). */
  countSellerFollowers: async (sellerId: string): Promise<number> => {
    const { data, error } = await apiClient.rpc('seller_follower_count', { p_seller_id: sellerId });
    if (error) throw new Error(error.message);
    return Number(data) || 0;
  },
};
