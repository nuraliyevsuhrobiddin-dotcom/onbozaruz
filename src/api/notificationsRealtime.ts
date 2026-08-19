/**
 * Realtime subscription for the notifications table.
 *
 * Listens for new rows scoped to a single user (RLS also enforces this
 * server-side). No-ops when Supabase isn't configured (mock mode).
 */
import { supabaseClient } from './authClient';
import { Notification } from './types';

function mapRowToNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as Notification['type'],
    title: row.title as string,
    body: (row.body as string) || '',
    targetType: (row.target_type as Notification['targetType']) || '',
    targetId: (row.target_id as string) || '',
    actorId: (row.actor_id as string) || undefined,
    actorName: (row.actor_name as string) || '',
    actorAvatar: (row.actor_avatar as string) || '',
    isRead: Boolean(row.is_read),
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

export function subscribeToNotifications(
  userId: string,
  onInsert: (notification: Notification) => void
): () => void {
  if (!supabaseClient) return () => undefined;
  const client = supabaseClient;

  const channel = client
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload: { new: Record<string, unknown> }) => {
        onInsert(mapRowToNotification(payload.new));
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
