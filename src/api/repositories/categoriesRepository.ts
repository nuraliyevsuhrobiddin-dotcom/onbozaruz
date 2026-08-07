/**
 * Categories repository.
 *
 * Only place that knows how to fetch categories.
 * Consumers (store/views) depend on this interface, never on http internals.
 */
import { api } from '../http';
import { Category } from '../types';

export const categoriesRepository = {
  /** GET /categories */
  list: () => api.get<Category[]>('/categories'),

  /** GET /categories/:id */
  get: (id: string) => api.get<Category>(`/categories/${id}`),
};
