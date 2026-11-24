/**
 * Posts repository.
 *
 * Only place that knows how to fetch/create/update/delete posts.
 * Consumers (store/views) depend on this interface, never on http internals.
 */
import { api, normalizeApiRow } from '../http';
import { CreatePostInput, Post } from '../types';
import { incrementPostViewsOnServer, apiClient } from '../authClient';
import { useViewerLocation } from '../../store/useViewerLocation';
import { sortNearby } from '../../utils/geo';

/** Counters can arrive as null for legacy rows; the feed must never crash on them. */
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
    const point = useViewerLocation.getState().point;
    if (point) {
      const { data, error } = await apiClient.rpc('nearby_posts', { p_lat: point.latitude, p_lng: point.longitude, p_limit: 300 });
      if (error) throw new Error(error.message);
      // Nearby paging must not remove the owner's pending or distant listings from their profile.
      const { data: session } = await apiClient.auth.getSession();
      let ownRows: unknown[] = [];
      if (session.session?.user.id) {
        const own = await apiClient.from('posts').select('*').eq('user_id', session.session.user.id).order('created_at', { ascending: false });
        if (own.error) throw new Error(own.error.message);
        ownRows = own.data || [];
      }
      const rows = normalizeApiRow<Post[]>([...(data || []), ...ownRows]).map(normalizePostCounts);
      return [...new Map(rows.map(post => [post.id, post])).values()];
    }
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
    const { data, error } = await apiClient.from('posts').delete().eq('id', id).select('id').single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("E'lon o'chirilmadi");
    return data;
  },

  incrementViews: (id: string) => incrementPostViewsOnServer(id),
};
