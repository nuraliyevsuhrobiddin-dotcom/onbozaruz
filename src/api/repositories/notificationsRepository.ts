/**
 * Notifications repository.
 *
 * Rows are only ever inserted by Supabase trigger functions (see
 * supabase_schema.sql, section 9) — the client only reads and marks as read.
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
