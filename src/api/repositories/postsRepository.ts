/**
 * Posts repository.
 *
 * Only place that knows how to fetch/create/update/delete posts.
 * Consumers (store/views) depend on this interface, never on http internals.
 */
import { api } from '../http';
import { CreatePostInput, Post } from '../types';
import { incrementPostViewsOnServer, supabaseClient } from '../authClient';
import { useViewerLocation } from '../../store/useViewerLocation';
import { sortNearby } from '../../utils/geo';

function normalizePostCounts(post: Post): Post {
  return {
    ...post,
    likesCount: Number(post.likesCount) || 0,
    commentsCount: Number(post.commentsCount) || 0,
    viewsCount: Number(post.viewsCount) || 0,
  };
}

export const postsRepository = {
  /** GET /posts */
  list: async (): Promise<Post[]> => {
    try {
      const posts = await api.get<Post[]>('/posts');
      if (Array.isArray(posts) && posts.length > 0) {
        return posts.map(normalizePostCounts);
      }
    } catch (err) {
      console.warn('[postsRepository.list] Ahost posts fetch failed:', err);
    }
    const point = useViewerLocation.getState().point;
    const posts = await api.get<Post[]>('/posts', { order: 'created_at.desc' });
    return sortNearby(posts.map(normalizePostCounts), point);
  },

  /** GET /posts/:id */
  get: (id: string) => api.get<Post>(`/posts/${id}`),

  /** POST /posts */
  create: (input: CreatePostInput) => api.post<Post>('/posts', input),

  /** PATCH /posts/:id */
  update: (id: string, patch: Partial<Post>) => api.patch<Post>(`/posts/${id}`, patch),

  /** DELETE /posts/:id */
  remove: async (id: string): Promise<{ id: string }> => {
    if (!supabaseClient || import.meta.env.VITE_USE_MOCK_API === 'true') {
      return api.delete<{ id: string }>(`/posts/${id}`);
    }
    const { data, error } = await supabaseClient.from('posts').delete().eq('id', id).select('id').single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("E'lon o'chirilmadi");
    return data;
  },

  incrementViews: (id: string) => incrementPostViewsOnServer(id),
};
