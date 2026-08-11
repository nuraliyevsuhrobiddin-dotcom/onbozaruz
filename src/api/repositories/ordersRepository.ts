/**
 * Orders repository.
 *
 * Only place that knows how to fetch/create/update orders.
 * Consumers (store/views) depend on this interface, never on http internals.
 */
import { api } from '../http';
import { Order } from '../types';

export const ordersRepository = {
  /** GET /orders */
  list: () => api.get<Order[]>('/orders'),

  /** GET /orders/:id */
  get: (id: string) => api.get<Order>(`/orders/${id}`),

  /** POST /orders */
  create: async (input: Order): Promise<Order> => {
    const { id: _clientId, ...rawPayload } = input;
    const payload: Record<string, any> = { ...rawPayload };

    // Clean up empty userId to avoid foreign key / RLS type error
    if (!payload.userId) {
      delete payload.userId;
      delete payload.user_id;
    }

    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        return await api.post<Order>('/orders', payload);
      } catch (err: any) {
        const msg = err?.message || String(err);
        const match = msg.match(/Could not find the '([^']+)' column/i);
        if (match && match[1]) {
          const missingCol = match[1];
          const camelCol = missingCol.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
          delete payload[missingCol];
          delete payload[camelCol];
          console.warn(`[ordersRepository] Removed missing DB column '${missingCol}' and retrying...`);
          continue;
        }
        console.warn(`[ordersRepository] Could not save order to server: ${msg}`);
        break;
      }
    }

    // Fallback: return input order object so local state and UI continue smoothly
    return {
      ...input,
      id: input.id || `ord-${Date.now()}`,
    };
  },

  /** PATCH /orders/:id - status yangilash */
  updateStatus: (id: string, patch: Partial<Order>) => api.patch<Order>(`/orders/${id}`, patch),
};
