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
  create: (input: Order) => {
    const { id: _clientId, ...payload } = input;
    return api.post<Order>('/orders', payload);
  },

  /** PATCH /orders/:id - status yangilash */
  updateStatus: (id: string, patch: Partial<Order>) => api.patch<Order>(`/orders/${id}`, patch),
};
