-- Browser endpoints are server-only; authenticated clients use /api/push/subscribe.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  endpoint text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

-- Supabase Vault stores the URL and shared delivery secret outside application tables.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.dispatch_notification_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  delivery_url text;
  delivery_secret text;
BEGIN
  SELECT decrypted_secret INTO delivery_url FROM vault.decrypted_secrets
    WHERE name = 'onbozar_push_delivery_url' LIMIT 1;
  SELECT decrypted_secret INTO delivery_secret FROM vault.decrypted_secrets
    WHERE name = 'onbozar_push_delivery_secret' LIMIT 1;
  IF delivery_url IS NULL OR delivery_secret IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url := delivery_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-onbozar-push-secret', delivery_secret
    ),
    body := jsonb_build_object('notification_id', NEW.id),
    timeout_milliseconds := 10000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Push outages must never roll back orders or the in-app notification.
  RAISE WARNING 'Notification push enqueue failed: %', SQLSTATE;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.dispatch_notification_push() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS notification_web_push ON public.notifications;
CREATE TRIGGER notification_web_push AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.dispatch_notification_push();
