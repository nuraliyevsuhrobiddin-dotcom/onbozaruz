/**
 * Posts repository.
 *
 * Only place that knows how to fetch/create/update/delete posts.
 * Consumers (store/views) depend on this interface, never on http internals.
 */
import { api, normalizeApiRow } from '../http';
import { CreatePostInput, Post } from '../types';
import { incrementPostViewsOnServer, supabaseClient } from '../authClient';
import { useViewerLocation } from '../../store/useViewerLocation';
import { sortNearby } from '../../utils/geo';

export const postsRepository = {
  /** GET /posts */
  list: async (): Promise<Post[]> => {
    const point = useViewerLocation.getState().point;
    if (point && supabaseClient && import.meta.env.VITE_USE_MOCK_API !== 'true') {
      const { data, error } = await supabaseClient.rpc('nearby_posts', { p_lat: point.latitude, p_lng: point.longitude, p_limit: 300 });
      if (error) throw new Error(error.message);
      // Nearby paging must not remove the owner's pending or distant listings from their profile.
      const { data: session } = await supabaseClient.auth.getSession();
      let ownRows: unknown[] = [];
      if (session.session?.user.id) {
        const own = await supabaseClient.from('posts').select('*').eq('user_id', session.session.user.id).order('created_at', { ascending: false });
        if (own.error) throw new Error(own.error.message);
        ownRows = own.data || [];
      }
      const rows = normalizeApiRow<Post[]>([...(data || []), ...ownRows]);
      return [...new Map(rows.map(post => [post.id, post])).values()];
    }
    return sortNearby(await api.get<Post[]>('/posts', { order: 'created_at.desc' }), point);
  },

  /** GET /posts/:id */
  get: (id: string) => api.get<Post>(`/posts/${id}`),

  /** POST /posts */
  create: (input: CreatePostInput) => api.post<Post>('/posts', input),

  /** PATCH /posts/:id */
  update: (id: string, patch: Partial<Post>) => api.patch<Post>(`/posts/${id}`, patch),

  /** DELETE /posts/:id */
  remove: (id: string) => api.delete<{ id: string }>(`/posts/${id}`),

  incrementViews: (id: string) => incrementPostViewsOnServer(id),
};
