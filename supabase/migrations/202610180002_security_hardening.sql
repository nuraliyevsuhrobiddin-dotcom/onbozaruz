-- Apply before deploying the API/client changes. Existing admin accounts remain intact.
BEGIN;

CREATE OR REPLACE FUNCTION public.is_active_account()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active');
$$;
REVOKE ALL ON FUNCTION public.is_active_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_account() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true AND status = 'active');
$$;

-- Profile deletion is performed by the authenticated server endpoint via Auth.
-- Removing only the profile would allow a banned user to recreate an active one.
REVOKE DELETE ON public.profiles FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.protect_profile_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    NEW.is_admin := false;
    NEW.status := 'active';
    SELECT COALESCE(u.email, u.id::text || '@user.mollbazar.uz') INTO NEW.email
      FROM auth.users u WHERE u.id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_profile_insert() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS tr_protect_profile_insert ON public.profiles;
CREATE TRIGGER tr_protect_profile_insert BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_insert();

-- Restrictive policies combine with every existing permissive policy using AND.
-- Keep the owner's profile readable so the client can display the banned state.
DO $$
DECLARE t record; command text;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity AND c.relname <> 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS active_account_required ON public.%I', t.relname);
    EXECUTE format('CREATE POLICY active_account_required ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_active_account()) WITH CHECK (public.is_active_account())', t.relname);
  END LOOP;
  FOREACH command IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', 'active_profile_' || lower(command));
    IF command = 'INSERT' THEN
      -- A missing profile can be restored, but a banned existing profile cannot be deleted.
      EXECUTE 'CREATE POLICY active_profile_insert ON public.profiles AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT is_admin AND status = ''active'')';
    ELSIF command = 'UPDATE' THEN
      EXECUTE 'CREATE POLICY active_profile_update ON public.profiles AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.is_active_account()) WITH CHECK (public.is_active_account())';
    ELSE
      EXECUTE 'CREATE POLICY active_profile_delete ON public.profiles AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_active_account())';
    END IF;
  END LOOP;
END $$;
DROP POLICY IF EXISTS active_account_required ON storage.objects;
CREATE POLICY active_account_required ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
USING (public.is_active_account()) WITH CHECK (public.is_active_account());

-- Views intentionally run as their owner. They expose approved rows only and
-- replace contact fields before PostgREST can select/filter them.
CREATE OR REPLACE VIEW public.posts_public WITH (security_barrier = true) AS
SELECT (jsonb_populate_record(NULL::public.posts, to_jsonb(p) || jsonb_build_object('phone', '', 'telegram', ''))).*
FROM public.posts p WHERE p.status = 'approved' AND (auth.uid() IS NULL OR public.is_active_account());
CREATE OR REPLACE VIEW public.products_public WITH (security_barrier = true) AS
SELECT (jsonb_populate_record(NULL::public.products, to_jsonb(p) || jsonb_build_object('phone', '', 'telegram', ''))).*
FROM public.products p WHERE p.approval_status = 'approved' AND (auth.uid() IS NULL OR public.is_active_account());
REVOKE ALL ON public.posts_public, public.products_public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.posts_public, public.products_public TO anon, authenticated;
REVOKE SELECT ON public.posts, public.products FROM PUBLIC, anon;
-- Remove any historical column grants as well as table grants.
DO $$
DECLARE t text; columns text;
BEGIN
  FOREACH t IN ARRAY ARRAY['posts', 'products'] LOOP
    SELECT string_agg(quote_ident(attname), ', ') INTO columns FROM pg_attribute
      WHERE attrelid = ('public.' || t)::regclass AND attnum > 0 AND NOT attisdropped;
    EXECUTE format('REVOKE SELECT (%s) ON public.%I FROM PUBLIC, anon', columns, t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.nearby_posts(p_lat double precision, p_lng double precision, p_limit integer DEFAULT 300)
RETURNS SETOF public.posts LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_lat IS NULL OR p_lng IS NULL OR NOT (p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180)
    THEN RAISE EXCEPTION 'Xarita nuqtasi noto''g''ri'; END IF;
  IF auth.uid() IS NOT NULL AND NOT public.is_active_account() THEN RETURN; END IF;
  RETURN QUERY
    SELECT (jsonb_populate_record(NULL::public.posts, to_jsonb(p) ||
      CASE WHEN public.is_active_account() THEN '{}'::jsonb ELSE jsonb_build_object('phone', '', 'telegram', '') END)).*
    FROM public.posts p WHERE p.status = 'approved' AND (p.expires_at IS NULL OR p.expires_at > now())
    ORDER BY CASE WHEN p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
      power(sin(radians(p.latitude-p_lat)/2),2)+cos(radians(p_lat))*cos(radians(p.latitude))*power(sin(radians(p.longitude-p_lng)/2),2)
      END ASC NULLS LAST, p.created_at DESC, p.id
    LIMIT greatest(1, least(coalesce(p_limit,300),1000));
END;
$$;
REVOKE ALL ON FUNCTION public.nearby_posts(double precision,double precision,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nearby_posts(double precision,double precision,integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_post_views(p_post_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.posts SET views_count = views_count + 1
  WHERE id = p_post_id AND status = 'approved'
    AND (auth.uid() IS NULL OR public.is_active_account());
$$;
REVOKE ALL ON FUNCTION public.increment_post_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_post_views(uuid) TO anon, authenticated;

-- Server-only reservation: one row serializes competing requests on every instance.
CREATE TABLE IF NOT EXISTS public.welcome_email_claims (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.welcome_email_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.welcome_email_claims FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.claim_welcome_email(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE claimed uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id = p.id
    WHERE p.id = p_user_id AND p.status = 'active' AND u.email_confirmed_at IS NOT NULL) THEN RETURN false; END IF;
  INSERT INTO public.welcome_email_claims AS claims(user_id, claimed_at) VALUES(p_user_id, now())
    ON CONFLICT (user_id) DO UPDATE SET claimed_at = EXCLUDED.claimed_at
    WHERE claims.claimed_at <= now() - interval '10 minutes'
    RETURNING user_id INTO claimed;
  RETURN claimed IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_welcome_email(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_welcome_email(uuid) TO service_role;

-- Guard SECURITY DEFINER RPCs too: table RLS alone does not cover these.
-- Definitions below are also kept in supabase_schema.sql for fresh projects.

CREATE OR REPLACE FUNCTION public.create_b2b_order(
  p_business_id UUID,
  p_supplier_id UUID,
  p_items JSONB, -- [{"product_id": "...", "quantity": 5}, ...]
  p_payment_method TEXT,
  p_delivery_store_name TEXT,
  p_delivery_phone TEXT,
  p_delivery_region TEXT,
  p_delivery_district TEXT,
  p_delivery_address TEXT,
  p_delivery_note TEXT,
  p_cashback_used NUMERIC DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_item RECORD;
  v_product RECORD;
  v_subtotal NUMERIC := 0;
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_supplier_amount NUMERIC;
  v_line_total NUMERIC;
  v_cashback_balance NUMERIC;
  v_total NUMERIC;
BEGIN
  IF NOT public.is_active_account() THEN RAISE EXCEPTION 'Akkaunt faol emas' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_own_business(p_business_id) THEN
    RAISE EXCEPTION 'Ruxsat yo''q: bu biznes profiliga tegishli emassiz';
  END IF;
  IF NOT public.is_verified_supplier(p_supplier_id) THEN
    RAISE EXCEPTION 'Supplier tasdiqlanmagan';
  END IF;
  IF p_payment_method NOT IN ('cash','online') THEN
    RAISE EXCEPTION 'Noto''g''ri to''lov usuli';
  END IF;
  IF p_payment_method = 'online' THEN
    RAISE EXCEPTION 'Onlayn to''lov hali mavjud emas';
  END IF;
  IF p_cashback_used < 0 THEN
    RAISE EXCEPTION 'Keshbek miqdori manfiy bo''lishi mumkin emas';
  END IF;

  SELECT commission_rate INTO v_commission_rate FROM public.supplier_profiles WHERE id = p_supplier_id;

  INSERT INTO public.b2b_orders (
    business_id, supplier_id, buyer_user_id, payment_method, payment_status, commission_rate,
    delivery_store_name, delivery_phone, delivery_region, delivery_district, delivery_address, delivery_note
  ) VALUES (
    p_business_id, p_supplier_id, auth.uid(), p_payment_method, 'cash_pending', v_commission_rate,
    p_delivery_store_name, p_delivery_phone, p_delivery_region, p_delivery_district, p_delivery_address, p_delivery_note
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER)
  LOOP
    SELECT * INTO v_product FROM public.b2b_products
      WHERE id = v_item.product_id AND supplier_id = p_supplier_id AND status = 'approved'
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Mahsulot topilmadi yoki faol emas';
    END IF;
    IF v_item.quantity < v_product.moq THEN
      RAISE EXCEPTION 'Miqdor MOQ dan kam: % (min %)', v_product.name, v_product.moq;
    END IF;
    IF v_product.available_qty < v_item.quantity THEN
      RAISE EXCEPTION 'Yetarli zaxira yo''q: %', v_product.name;
    END IF;

    v_line_total := v_product.wholesale_price * v_item.quantity;
    v_subtotal := v_subtotal + v_line_total;

    INSERT INTO public.b2b_order_items (order_id, product_id, product_name, product_image, unit, unit_price, quantity, line_total)
    VALUES (v_order_id, v_product.id, v_product.name, COALESCE(v_product.images[1], ''), v_product.unit, v_product.wholesale_price, v_item.quantity, v_line_total);

    UPDATE public.b2b_products SET available_qty = available_qty - v_item.quantity, updated_at = NOW() WHERE id = v_product.id;
  END LOOP;

  IF v_subtotal <= 0 THEN
    RAISE EXCEPTION 'Savat bo''sh';
  END IF;
  IF p_cashback_used > v_subtotal THEN
    RAISE EXCEPTION 'Keshbek buyurtma summasidan katta bo''lishi mumkin emas';
  END IF;

  v_commission_amount := ROUND(v_subtotal * v_commission_rate / 100, 2);
  v_supplier_amount := v_subtotal - v_commission_amount;
  v_total := v_subtotal - p_cashback_used;

  -- Keshbek hamyonini shu tranzaksiya ichida, buyurtma yaratilishi bilan
  -- ATOMIK ravishda kamaytiramiz: xatolik (MOQ/zaxira) bo'lsa butun
  -- tranzaksiya bekor bo'ladi va hamyondan hech narsa yechilmaydi.
  IF p_cashback_used > 0 THEN
    SELECT cashback_balance INTO v_cashback_balance FROM public.business_profiles WHERE id = p_business_id FOR UPDATE;
    IF v_cashback_balance < p_cashback_used THEN
      RAISE EXCEPTION 'Hamyonda yetarli keshbek mablag''i yo''q';
    END IF;
    UPDATE public.business_profiles SET cashback_balance = cashback_balance - p_cashback_used WHERE id = p_business_id;
    INSERT INTO public.b2b_cashback_transactions (business_id, order_id, amount, cashback_rate, type, status, description)
    VALUES (p_business_id, v_order_id, -p_cashback_used, 0, 'redeemed', 'completed', 'Buyurtmada ishlatildi');
  END IF;

  UPDATE public.b2b_orders
  SET subtotal = v_subtotal, total = v_total, commission_amount = v_commission_amount, supplier_amount = v_supplier_amount, cashback_used = p_cashback_used
  WHERE id = v_order_id;

  INSERT INTO public.commission_ledger (order_id, supplier_id, gross_amount, commission_rate, commission_amount, supplier_amount, payment_method, status)
  VALUES (v_order_id, p_supplier_id, v_subtotal, v_commission_rate, v_commission_amount, v_supplier_amount, p_payment_method, 'pending');

  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_b2b_cashback_rate(p_rate NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_active_account() THEN RAISE EXCEPTION 'Akkaunt faol emas' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Faqat admin keshbek foizini o''zgartira oladi';
  END IF;
  IF p_rate < 0 OR p_rate > 100 THEN
    RAISE EXCEPTION 'Foiz 0 dan 100 gacha bo''lishi kerak';
  END IF;
  UPDATE public.b2b_config SET cashback_rate = p_rate, updated_at = NOW() WHERE id = TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_cashback_withdrawal(p_business_id UUID, p_amount NUMERIC, p_payout_details TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance NUMERIC; v_tx_id UUID;
BEGIN
  IF NOT public.is_active_account() THEN RAISE EXCEPTION 'Akkaunt faol emas' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_own_business(p_business_id) THEN
    RAISE EXCEPTION 'Ruxsat yo''q: bu biznes profiliga tegishli emassiz';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Chiqarish summasi 0 dan katta bo''lishi kerak';
  END IF;
  SELECT cashback_balance INTO v_balance FROM public.business_profiles WHERE id = p_business_id FOR UPDATE;
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Hamyonda yetarli keshbek mablag''i yo''q';
  END IF;
  UPDATE public.business_profiles SET cashback_balance = cashback_balance - p_amount WHERE id = p_business_id;
  INSERT INTO public.b2b_cashback_transactions (business_id, amount, type, status, payout_details, description)
  VALUES (p_business_id, -p_amount, 'withdrawn', 'pending', p_payout_details, 'Keshbekni yechib olish so''rovi (' || p_payout_details || ')')
  RETURNING id INTO v_tx_id;
  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_cashback_withdrawal(p_tx_id UUID, p_status TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tx RECORD; v_owner_id UUID;
BEGIN
  IF NOT public.is_active_account() THEN RAISE EXCEPTION 'Akkaunt faol emas' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Faqat admin so''rovni ko''rib chiqadi';
  END IF;
  IF p_status NOT IN ('completed','rejected') THEN
    RAISE EXCEPTION 'Noto''g''ri holat';
  END IF;
  SELECT * INTO v_tx FROM public.b2b_cashback_transactions WHERE id = p_tx_id AND type = 'withdrawn' AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'So''rov topilmadi yoki allaqachon ko''rib chiqilgan';
  END IF;
  IF p_status = 'rejected' THEN
    UPDATE public.business_profiles SET cashback_balance = cashback_balance + ABS(v_tx.amount) WHERE id = v_tx.business_id;
  END IF;
  UPDATE public.b2b_cashback_transactions SET status = p_status WHERE id = p_tx_id;

  SELECT user_id INTO v_owner_id FROM public.business_profiles WHERE id = v_tx.business_id;
  IF v_owner_id IS NOT NULL THEN
    IF p_status = 'completed' THEN
      INSERT INTO public.notifications (user_id, type, title, body, target_type, target_id)
      VALUES (v_owner_id, 'b2b_cashback', 'Keshbek to''lovi amalga oshirildi', ABS(v_tx.amount)::text || ' so''m keshbek kartangizga o''tkazildi', 'b2b_cashback', p_tx_id::text);
    ELSE
      INSERT INTO public.notifications (user_id, type, title, body, target_type, target_id)
      VALUES (v_owner_id, 'b2b_cashback', 'Keshbek so''rovi bekor qilindi', 'Mablag'' hamyoningizga qaytarildi', 'b2b_cashback', p_tx_id::text);
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_business_cashback(p_business_id UUID, p_amount NUMERIC, p_description TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tx_id UUID; v_owner_id UUID;
BEGIN
  IF NOT public.is_active_account() THEN RAISE EXCEPTION 'Akkaunt faol emas' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Faqat admin bonus keshbek bera oladi';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Bonus summasi 0 dan katta bo''lishi kerak';
  END IF;
  UPDATE public.business_profiles SET cashback_balance = cashback_balance + p_amount WHERE id = p_business_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Biznes profili topilmadi';
  END IF;
  INSERT INTO public.b2b_cashback_transactions (business_id, amount, type, status, description)
  VALUES (p_business_id, p_amount, 'admin_bonus', 'completed', COALESCE(NULLIF(p_description, ''), 'Admin tomonidan taqdim etilgan maxsus bonus'))
  RETURNING id INTO v_tx_id;

  SELECT user_id INTO v_owner_id FROM public.business_profiles WHERE id = p_business_id;
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, target_type, target_id)
    VALUES (v_owner_id, 'b2b_cashback', 'Sizga bonus keshbek berildi!', '+' || p_amount::text || ' so''m keshbek hamyoningizga qo''shildi', 'b2b_cashback', v_tx_id::text);
  END IF;

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.supplier_confirm_cash_payment(p_order_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order RECORD; v_rate NUMERIC; v_earned NUMERIC;
BEGIN
  IF NOT public.is_active_account() THEN RAISE EXCEPTION 'Akkaunt faol emas' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_order FROM public.b2b_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Buyurtma topilmadi';
  END IF;
  IF NOT public.is_own_supplier(v_order.supplier_id) THEN
    RAISE EXCEPTION 'Ruxsat yo''q: bu buyurtma sizga tegishli emas';
  END IF;
  IF v_order.payment_method <> 'cash' OR v_order.payment_status <> 'cash_pending' THEN
    RAISE EXCEPTION 'Bu buyurtma naqd to''lov tasdig''ini kutmayapti';
  END IF;

  SELECT cashback_rate INTO v_rate FROM public.b2b_config WHERE id = TRUE;
  v_earned := ROUND(v_order.total * COALESCE(v_rate, 0) / 100, 2);

  UPDATE public.b2b_orders SET payment_status = 'cash_confirmed', cashback_earned = v_earned WHERE id = p_order_id;

  IF v_earned > 0 THEN
    UPDATE public.business_profiles SET cashback_balance = cashback_balance + v_earned WHERE id = v_order.business_id;
    INSERT INTO public.b2b_cashback_transactions (business_id, order_id, cashback_rate, amount, type, status, description)
    VALUES (v_order.business_id, p_order_id, v_rate, v_earned, 'earned', 'completed', v_order.order_number || ' buyurtmasi uchun ' || v_rate || '% keshbek');

    IF v_order.buyer_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, target_type, target_id)
      VALUES (v_order.buyer_user_id, 'b2b_cashback', 'Keshbek hisobingizga tushdi!', v_order.order_number || ' buyurtmasi uchun +' || v_earned::text || ' so''m keshbek qo''shildi', 'b2b_order', p_order_id::text);
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_business_store(
  p_business_id UUID,
  p_store_name TEXT DEFAULT NULL,
  p_owner_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_business_type TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_district TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_cashback_balance NUMERIC DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_active_account() THEN RAISE EXCEPTION 'Akkaunt faol emas' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Faqat admin biznes profilini boshqara oladi';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Noto''g''ri biznes holati';
  END IF;
  IF p_cashback_balance IS NOT NULL AND p_cashback_balance < 0 THEN
    RAISE EXCEPTION 'Keshbek balansi manfiy bo''lishi mumkin emas';
  END IF;

  UPDATE public.business_profiles
  SET
    store_name = COALESCE(p_store_name, store_name),
    owner_name = COALESCE(p_owner_name, owner_name),
    phone = COALESCE(p_phone, phone),
    business_type = COALESCE(p_business_type, business_type),
    region = COALESCE(p_region, region),
    district = COALESCE(p_district, district),
    description = COALESCE(p_description, description),
    status = COALESCE(p_status, status),
    cashback_balance = COALESCE(p_cashback_balance, cashback_balance),
    updated_at = NOW()
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Biznes profili topilmadi';
  END IF;

  IF p_store_name IS NOT NULL OR p_phone IS NOT NULL OR p_region IS NOT NULL
    OR p_district IS NOT NULL OR p_address IS NOT NULL
    OR p_latitude IS NOT NULL OR p_longitude IS NOT NULL THEN
    UPDATE public.business_addresses
    SET
      store_name = COALESCE(p_store_name, store_name),
      phone = COALESCE(p_phone, phone),
      region = COALESCE(p_region, region),
      district = COALESCE(p_district, district),
      address = COALESCE(p_address, address),
      latitude = COALESCE(p_latitude, latitude),
      longitude = COALESCE(p_longitude, longitude)
    WHERE business_id = p_business_id AND is_default = TRUE;

    IF NOT FOUND THEN
      INSERT INTO public.business_addresses (
        business_id, store_name, phone, region, district, address,
        latitude, longitude, is_default
      ) VALUES (
        p_business_id,
        COALESCE(p_store_name, ''),
        COALESCE(p_phone, ''),
        COALESCE(p_region, ''),
        COALESCE(p_district, ''),
        COALESCE(p_address, ''),
        p_latitude, p_longitude, TRUE
      );
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_agro_request(p_input jsonb)
RETURNS public.agro_purchase_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_row public.agro_purchase_requests; v_name text;
BEGIN
  IF NOT public.is_active_account() THEN RAISE EXCEPTION 'Akkaunt faol emas' USING ERRCODE = '42501'; END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Avval akkauntingizga kiring'; END IF;
  IF (p_input->>'neededBy')::date<(now() AT TIME ZONE 'Asia/Tashkent')::date THEN RAISE EXCEPTION 'So''rov sanasi o''tgan'; END IF;
  SELECT name INTO STRICT v_name FROM public.profiles WHERE id=auth.uid();
  INSERT INTO public.agro_purchase_requests(user_id,buyer_name,title,category,variety,quantity,unit,target_price,needed_by,location,latitude,longitude,delivery_method,description)
  VALUES(auth.uid(),v_name,trim(p_input->>'title'),p_input->>'category',coalesce(p_input->>'variety',''),
         (p_input->>'quantity')::numeric,p_input->>'unit',(p_input->>'targetPrice')::numeric,(p_input->>'neededBy')::date,
         trim(p_input->>'location'),(p_input->>'latitude')::double precision,(p_input->>'longitude')::double precision,
         p_input->>'deliveryMethod',coalesce(p_input->>'description',''))
  RETURNING * INTO v_row;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.close_agro_request(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_active_account() THEN RAISE EXCEPTION 'Akkaunt faol emas' USING ERRCODE = '42501'; END IF;
  UPDATE public.agro_purchase_requests SET status='closed' WHERE id=p_id AND user_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Ruxsat yo''q yoki so''rov topilmadi'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.send_agro_offer(p_input jsonb)
RETURNS public.agro_trade_offers LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_offer public.agro_trade_offers; v_request public.agro_purchase_requests; v_product public.b2b_products;
BEGIN
  IF NOT public.is_active_account() THEN RAISE EXCEPTION 'Akkaunt faol emas' USING ERRCODE = '42501'; END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Avval akkauntingizga kiring'; END IF;
  v_offer.request_id:=(p_input->>'requestId')::uuid; v_offer.product_id:=(p_input->>'productId')::uuid;
  IF num_nonnulls(v_offer.request_id,v_offer.product_id)<>1 THEN RAISE EXCEPTION 'Bitta e''lonni tanlang'; END IF;
  IF v_offer.request_id IS NOT NULL THEN
    SELECT * INTO STRICT v_request FROM public.agro_purchase_requests WHERE id=v_offer.request_id;
    v_offer.buyer_user_id:=v_request.user_id; v_offer.buyer_name:=v_request.buyer_name;
    v_offer.seller_user_id:=auth.uid(); v_offer.product_name:=v_request.title; v_offer.unit:=v_request.unit;
  ELSE
    SELECT * INTO STRICT v_product FROM public.b2b_products WHERE id=v_offer.product_id;
    v_offer.buyer_user_id:=auth.uid();
    SELECT user_id INTO STRICT v_offer.seller_user_id FROM public.supplier_profiles WHERE id=v_product.supplier_id;
    SELECT name INTO STRICT v_offer.buyer_name FROM public.profiles WHERE id=auth.uid();
    v_offer.product_name:=v_product.name; v_offer.unit:=v_product.unit;
  END IF;
  IF v_offer.buyer_user_id=v_offer.seller_user_id THEN RAISE EXCEPTION 'O''z e''loningizga taklif yubora olmaysiz'; END IF;
  SELECT company_name INTO STRICT v_offer.seller_name FROM public.supplier_profiles WHERE user_id=v_offer.seller_user_id;
  v_offer.proposed_by:=auth.uid(); v_offer.quantity:=(p_input->>'quantity')::numeric;
  v_offer.unit_price:=(p_input->>'unitPrice')::numeric; v_offer.delivery_date:=(p_input->>'deliveryDate')::date;
  v_offer.delivery_method:=p_input->>'deliveryMethod'; v_offer.message:=coalesce(p_input->>'message','');
  PERFORM public.check_agro_offer_target(v_offer);
  INSERT INTO public.agro_trade_offers(request_id,product_id,product_name,unit,buyer_user_id,seller_user_id,buyer_name,seller_name,proposed_by,quantity,unit_price,delivery_date,delivery_method,message)
  VALUES(v_offer.request_id,v_offer.product_id,v_offer.product_name,v_offer.unit,v_offer.buyer_user_id,v_offer.seller_user_id,v_offer.buyer_name,v_offer.seller_name,v_offer.proposed_by,v_offer.quantity,v_offer.unit_price,v_offer.delivery_date,v_offer.delivery_method,v_offer.message)
  RETURNING * INTO v_offer;
  RETURN v_offer;
END $$;

CREATE OR REPLACE FUNCTION public.respond_agro_offer(p_id uuid, p_action text, p_version integer, p_terms jsonb DEFAULT NULL)
RETURNS public.agro_trade_offers LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_offer public.agro_trade_offers; v_delta numeric:=0;
BEGIN
  IF NOT public.is_active_account() THEN RAISE EXCEPTION 'Akkaunt faol emas' USING ERRCODE = '42501'; END IF;
  SELECT * INTO STRICT v_offer FROM public.agro_trade_offers WHERE id=p_id FOR UPDATE;
  IF auth.uid() IS NULL OR auth.uid() NOT IN (v_offer.buyer_user_id,v_offer.seller_user_id) THEN RAISE EXCEPTION 'Ruxsat yo''q'; END IF;
  IF p_version IS NULL OR v_offer.version<>p_version THEN RAISE EXCEPTION 'Taklif o''zgargan. Sahifani yangilang'; END IF;
  IF p_action='cancel' AND v_offer.status IN ('proposed','accepted','ready') THEN
    IF v_offer.status IN ('accepted','ready') THEN v_delta:=-v_offer.quantity; END IF;
    v_offer.status:='cancelled';
  ELSIF v_offer.status='proposed' AND auth.uid()<>v_offer.proposed_by AND p_action IN ('accept','decline','counter') THEN
    IF p_action='decline' THEN v_offer.status:='declined';
    ELSE
      IF p_action='counter' THEN
        v_offer.quantity:=(p_terms->>'quantity')::numeric; v_offer.unit_price:=(p_terms->>'unitPrice')::numeric;
        v_offer.delivery_date:=(p_terms->>'deliveryDate')::date; v_offer.delivery_method:=p_terms->>'deliveryMethod';
        v_offer.message:=coalesce(p_terms->>'message',''); v_offer.proposed_by:=auth.uid();
      END IF;
      PERFORM public.check_agro_offer_target(v_offer);
      IF p_action='accept' THEN v_offer.status:='accepted'; v_delta:=v_offer.quantity; END IF;
    END IF;
  ELSIF p_action='ready' AND v_offer.status='accepted' AND auth.uid()=v_offer.seller_user_id THEN v_offer.status:='ready';
  ELSIF p_action='deliver' AND v_offer.status='ready' AND v_offer.delivery_method='delivery' AND auth.uid()=v_offer.seller_user_id THEN v_offer.status:='delivering';
  ELSIF p_action='complete' AND auth.uid()=v_offer.buyer_user_id AND (v_offer.status='delivering' OR (v_offer.status='ready' AND v_offer.delivery_method='pickup')) THEN v_offer.status:='completed';
  ELSE RAISE EXCEPTION 'Bu holatda ushbu amalni bajarib bo''lmaydi'; END IF;
  IF v_delta<>0 THEN
    IF v_offer.request_id IS NOT NULL THEN
      UPDATE public.agro_purchase_requests SET reserved_quantity=reserved_quantity+v_delta WHERE id=v_offer.request_id;
    ELSE UPDATE public.b2b_products SET available_qty=available_qty-v_delta WHERE id=v_offer.product_id; END IF;
  END IF;
  UPDATE public.agro_trade_offers SET quantity=v_offer.quantity,unit_price=v_offer.unit_price,delivery_date=v_offer.delivery_date,
    delivery_method=v_offer.delivery_method,message=v_offer.message,proposed_by=v_offer.proposed_by,
    status=v_offer.status,version=version+1,updated_at=now() WHERE id=p_id RETURNING * INTO v_offer;
  RETURN v_offer;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, handle, phone, avatar_url, location, business_name, role, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.id::text || '@user.mollbazar.uz'),
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(COALESCE(NEW.email, 'User'), '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'handle', SPLIT_PART(COALESCE(NEW.email, 'user_' || SUBSTRING(NEW.id::text, 1, 6)), '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'location', ''),
    COALESCE(NEW.raw_user_meta_data->>'businessName', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'seller'),
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = CASE WHEN public.profiles.name = '' THEN EXCLUDED.name ELSE public.profiles.name END,
    handle = CASE WHEN public.profiles.handle = '' THEN EXCLUDED.handle ELSE public.profiles.handle END,
    location = CASE WHEN public.profiles.location = '' THEN EXCLUDED.location ELSE public.profiles.location END,
    business_name = CASE WHEN public.profiles.business_name = '' THEN EXCLUDED.business_name ELSE public.profiles.business_name END,
    is_admin = public.profiles.is_admin OR EXCLUDED.is_admin;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.protect_profile_admin_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- profiles.email Auth emailning nusxasi. Uni PostgREST orqali o'zgartirish
  -- login emailini o'zgartirmaydi va ikki ma'lumotni bir-biridan ajratib
  -- qo'yadi; shuning uchun bunday bevosita o'zgarishni rad etamiz.
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    NEW.email := OLD.email;
  END IF;

  IF (OLD.is_admin IS DISTINCT FROM NEW.is_admin OR OLD.status IS DISTINCT FROM NEW.status) THEN
    -- MUHIM: bu yerda CURRENT_USER emas, SESSION_USER tekshiriladi.
    -- CURRENT_USER SECURITY DEFINER funksiya ichida DOIM funksiya
    -- egasiga (postgres) teng bo'lib qoladi — kim chaqirganidan qat'i
    -- nazar — shuning uchun u bilan solishtirish hech qachon himoya
    -- bermaydi (har doim "postgres" chiqadi). SESSION_USER esa haqiqiy
    -- ulanish rolini saqlab qoladi (SQL Editor'da ishga tushirilganda —
    -- 'postgres', PostgREST orqali kelgan har qanday so'rovda — boshqa),
    -- shu bilan real himoya + SQL Editor orqali birinchi adminni
    -- bootstrap qilish imkoniyati ikkalasi ham ishlaydi.
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true AND status = 'active'
    ) AND (SESSION_USER <> 'postgres' OR COALESCE(auth.role(), '') IN ('anon', 'authenticated')) THEN
      NEW.is_admin := OLD.is_admin;
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
