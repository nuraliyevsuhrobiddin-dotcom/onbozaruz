-- Preserve existing Vault secrets while switching to the MollBazar namespace.
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
    WHERE name IN ('mollbazar_push_delivery_url', 'onbozar_push_delivery_url')
    ORDER BY CASE WHEN name = 'mollbazar_push_delivery_url' THEN 0 ELSE 1 END LIMIT 1;
  SELECT decrypted_secret INTO delivery_secret FROM vault.decrypted_secrets
    WHERE name IN ('mollbazar_push_delivery_secret', 'onbozar_push_delivery_secret')
    ORDER BY CASE WHEN name = 'mollbazar_push_delivery_secret' THEN 0 ELSE 1 END LIMIT 1;
  IF delivery_url IS NULL OR delivery_secret IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url := delivery_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-mollbazar-push-secret', delivery_secret),
    body := jsonb_build_object('notification_id', NEW.id),
    timeout_milliseconds := 10000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Notification push enqueue failed: %', SQLSTATE;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.dispatch_notification_push() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.b2b_config
  ALTER COLUMN admin_card_holder SET DEFAULT 'MOLLBAZAR B2B RASMIY HISOBI';

UPDATE public.b2b_config
SET admin_card_holder = 'MOLLBAZAR B2B RASMIY HISOBI'
WHERE admin_card_holder = 'ONBOZAR B2B RASMIY HISOBI';
