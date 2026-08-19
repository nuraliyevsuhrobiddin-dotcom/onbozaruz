/**
 * Notifications repository.
 *
 * Rows are only ever inserted by Supabase trigger functions (see
 * supabase_schema.sql, section 9) — the client only reads and marks as read.
 */
import { api } from '../http';
import { Notification } from '../types';

export const notificationsRepository = {
  list: () => api.get<Notification[]>('/notifications'),

  markRead: (id: string) => api.patch<Notification>(`/notifications/${id}`, { isRead: true }),
};
