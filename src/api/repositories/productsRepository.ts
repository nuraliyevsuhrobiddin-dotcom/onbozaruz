/**
 * Products repository.
 *
 * Only place that knows how to fetch/create/update/delete products.
 * Consumers (store/views) depend on this interface, never on http internals.
 */
import { api } from '../http';
import { CreateProductInput, Product } from '../types';

export const productsRepository = {
  /** GET /products */
  list: () => api.get<Product[]>('/products'),

  /** GET /products/:id */
  get: (id: string) => api.get<Product>(`/products/${id}`),

  /** POST /products */
  create: (input: CreateProductInput) => api.post<Product>('/products', input),

  /** PATCH /products/:id */
  update: (id: string, patch: Partial<Product>) => api.patch<Product>(`/products/${id}`, patch),

  /** DELETE /products/:id */
  remove: (id: string) => api.delete<{ id: string }>(`/products/${id}`),
};
