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
  create: async (input: CreateProductInput) => {
    const payload: Record<string, any> = { ...input };
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        return await api.post<Product>('/products', payload);
      } catch (err: any) {
        const msg = err?.message || String(err);
        const match = msg.match(/Could not find the '([^']+)' column/i);
        if (match && match[1]) {
          const missingCol = match[1];
          const camelCol = missingCol.replace(/_([a-z])/g, (_: string, l: string) => l.toUpperCase());
          delete payload[missingCol];
          delete payload[camelCol];
          console.warn(`[productsRepository] Removed missing DB column '${missingCol}' and retrying creation...`);
          continue;
        }
        throw err;
      }
    }
    return api.post<Product>('/products', payload);
  },

  /** PATCH /products/:id */
  update: async (id: string, patch: Partial<Product>) => {
    const payload: Record<string, any> = { ...patch };
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        return await api.patch<Product>(`/products/${id}`, payload);
      } catch (err: any) {
        const msg = err?.message || String(err);
        const match = msg.match(/Could not find the '([^']+)' column/i);
        if (match && match[1]) {
          const missingCol = match[1];
          const camelCol = missingCol.replace(/_([a-z])/g, (_: string, l: string) => l.toUpperCase());
          delete payload[missingCol];
          delete payload[camelCol];
          console.warn(`[productsRepository] Removed missing DB column '${missingCol}' and retrying update...`);
          continue;
        }
        throw err;
      }
    }
    return api.patch<Product>(`/products/${id}`, payload);
  },

  /** DELETE /products/:id */
  remove: (id: string) => api.delete<{ id: string }>(`/products/${id}`),
};
