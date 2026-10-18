-- Resubmit edited content; blocked listings remain blocked.
BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_post_moderation()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'pending';
      NEW.rejection_reason := NULL;
    ELSE
      NEW.status := OLD.status;
      NEW.rejection_reason := OLD.rejection_reason;
      -- Engagement counters must not resubmit a listing for moderation.
      IF OLD.status IS DISTINCT FROM 'blocked' AND EXISTS (
        SELECT 1 FROM unnest(ARRAY[
          'title', 'description', 'category', 'category_name', 'media_url',
          'poster_url', 'type', 'price', 'numeric_price', 'min_order',
          'location', 'latitude', 'longitude', 'phone', 'telegram', 'condition'
        ]) AS field(key)
        WHERE (to_jsonb(NEW) -> field.key) IS DISTINCT FROM (to_jsonb(OLD) -> field.key)
      ) THEN
        NEW.status := 'pending';
        NEW.rejection_reason := NULL;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the binding as well, including databases missing the original trigger.
DROP TRIGGER IF EXISTS tr_enforce_post_moderation ON public.posts;
CREATE TRIGGER tr_enforce_post_moderation
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_post_moderation();

COMMIT;
