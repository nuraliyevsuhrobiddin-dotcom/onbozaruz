/**
 * User interaction repository.
 *
 * Provides a small wrapper around saved post and liked post operations.
 */
import { api } from '../http';

export interface UserPostInteractionRow {
  userId: string;
  postId: string;
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
};
