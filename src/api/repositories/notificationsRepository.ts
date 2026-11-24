/**
 * Notifications repository.
 *
 * Rows are only ever inserted by server-side triggers (public/api/_lib/policies.php);
 * the client only reads them and marks them as read.
 */
import { api } from '../http';
import { Notification } from '../types';

export const notificationsRepository = {
  // Keep this bounded: the drawer needs recent activity, not an unbounded
  // history request on every sign-in.
  list: () => api.get<Notification[]>('/notifications', { order: 'created_at.desc', limit: 100 }),

  markRead: (id: string) => api.patch<Notification>(`/notifications/${id}`, { isRead: true }),

  markAllRead: () =>
    api.patch<Notification[]>('/notifications', { isRead: true }, { params: { isRead: 'eq.false' } }),
};
