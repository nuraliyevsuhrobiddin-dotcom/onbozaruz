/**
 * Posts repository.
 *
 * Only place that knows how to fetch/create/update/delete posts.
 * Consumers (store/views) depend on this interface, never on http internals.
 */
import { api } from '../http';
import { CreatePostInput, Post } from '../types';
import { incrementPostViewsOnServer } from '../authClient';

export const postsRepository = {
  /** GET /posts */
  list: () => api.get<Post[]>('/posts'),

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
