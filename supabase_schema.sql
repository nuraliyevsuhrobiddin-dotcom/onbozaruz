-- =====================================================================
-- OnBozor Agro Marketplace — Complete Supabase SQL Schema & Initial Seed
-- =====================================================================
-- Ushbu skriptni Supabase Dashboard -> SQL Editor sahifasiga joylang
-- va "Run" tugmasini bosing.
-- =====================================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE approval_status_type AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_source_type AS ENUM ('admin', 'telegram_bot');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE post_media_type AS ENUM ('image', 'video');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- =====================================================================
-- 2. TABLES CREATION
-- =====================================================================

-- PROFILES (Foydalanuvchilar profili)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    handle TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    cover_url TEXT DEFAULT '',
    location TEXT DEFAULT '',
    business_name TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    role TEXT DEFAULT 'seller',
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- POSTS (Instagram/TikTok UX tasmadagi e'lonlar)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id TEXT DEFAULT '',
    seller_name TEXT NOT NULL,
    seller_avatar TEXT DEFAULT '',
    verified BOOLEAN DEFAULT FALSE,
    location TEXT NOT NULL,
    phone TEXT NOT NULL,
    telegram TEXT DEFAULT '',
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    category_name TEXT NOT NULL,
    price TEXT NOT NULL,
    numeric_price NUMERIC DEFAULT 0,
    min_order TEXT DEFAULT '1 dona',
    type post_media_type NOT NULL DEFAULT 'image',
    media_url TEXT NOT NULL,
    poster_url TEXT DEFAULT '',
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    condition TEXT DEFAULT '',
    description TEXT DEFAULT '',
    date_display TEXT DEFAULT 'Hozircha',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCTS (Market do'kondagi mahsulotlar)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    seller TEXT NOT NULL,
    seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified BOOLEAN DEFAULT FALSE,
    category TEXT NOT NULL,
    price TEXT NOT NULL,
    numeric_price NUMERIC NOT NULL DEFAULT 0,
    image TEXT NOT NULL,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    rating NUMERIC(3, 2) DEFAULT 5.0,
    reviews_count INTEGER DEFAULT 0,
    min_order TEXT DEFAULT '1 dona',
    discount TEXT DEFAULT '',
    location TEXT NOT NULL,
    phone TEXT DEFAULT '',
    telegram TEXT DEFAULT '',
    description TEXT DEFAULT '',
    features TEXT DEFAULT '',
    approval_status approval_status_type DEFAULT 'approved',
    source product_source_type DEFAULT 'admin',
    submitted_by TEXT DEFAULT '',
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ DEFAULT NOW(),
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDERS (Buyurtmalar)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    seller_phone TEXT NOT NULL,
    image TEXT NOT NULL,
    total_price TEXT NOT NULL,
    quantity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Qabul qilindi',
    status_step INTEGER DEFAULT 1,
    date_display TEXT DEFAULT 'Bugun',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMMENTS (Izohlar)
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_avatar TEXT DEFAULT '',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SAVED POSTS (Saqlangan e'lonlar)
CREATE TABLE IF NOT EXISTS public.saved_posts (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

-- LIKED POSTS (Yoqtirilgan e'lonlar)
CREATE TABLE IF NOT EXISTS public.liked_posts (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);


-- =====================================================================
-- 2.1 ALTER EXISTING TABLES (Eski jadvallarga yetishmayotgan ustunlarni qo'shish)
-- =====================================================================
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS seller_id TEXT DEFAULT '';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT '';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS poster_url TEXT DEFAULT '';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS date_display TEXT DEFAULT 'Hozircha';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS handle TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'seller';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '';

-- CATEGORIES (Kategoriyalar jadvali)
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    -- Which area this category appears in: 'post' (E'lon berish), 'market',
    -- or 'both'. Defaults to 'both' so existing categories keep showing up
    -- everywhere they already did — admin only needs to narrow this when
    -- deliberately adding an area-specific category.
    scope TEXT NOT NULL DEFAULT 'both' CHECK (scope IN ('post', 'market', 'both')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Existing deployments: the CREATE TABLE above is a no-op once the table
-- already exists, so add the column here too.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'both';
DO $$ BEGIN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_scope_check CHECK (scope IN ('post', 'market', 'both'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PostgREST uchun frontend ishlatadigan rollarga kerakli jadval huquqlari.
GRANT SELECT ON public.posts, public.products, public.profiles, public.categories, public.liked_posts, public.saved_posts, public.comments, public.reports, public.audit_logs TO anon, authenticated;
-- orders bu ro'yxatda umuman yo'q edi — RLS siyosati to'g'ri bo'lsa ham,
-- jadval darajasidagi GRANT bo'lmagani uchun HECH KIM (egasi ham, admin
-- ham) o'z buyurtmalarini o'qiy olmasdi. anon'ga emas, faqat authenticated'ga.
GRANT SELECT ON public.orders TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.posts, public.products, public.categories, public.liked_posts, public.saved_posts, public.comments, public.reports, public.audit_logs, public.orders TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

-- REPORTS (Foydalanuvchi va e'lonlar ustidan shikoyatlar)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_type TEXT NOT NULL, -- 'post' | 'product' | 'user'
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT DEFAULT '',
    status TEXT DEFAULT 'pending', -- 'pending' | 'resolved' | 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT LOGS (Adminlar bajargan amallar jurnali)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL, -- 'update_user_role' | 'ban_user' | 'approve_post' | 'reject_post' | 'update_order_status'
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 3. AUTOMATIC PROFILE CREATION TRIGGER & ADMIN SECURITY TRIGGER
-- =====================================================================

-- Regular user o'ziga is_admin = true yoki status = 'active' (o'z-o'zini
-- ban'dan chiqarish) berishini taqiqlash triggeri.
-- SET search_path = public: SECURITY DEFINER funksiyalarda bu shart —
-- bo'lmasa, search_path orqali funksiya ichidagi jadval nomlarini
-- almashtirib, himoyani chetlab o'tish (privilege escalation) mumkin.
CREATE OR REPLACE FUNCTION public.protect_profile_admin_flag()
RETURNS TRIGGER AS $$
BEGIN
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
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    ) AND SESSION_USER <> 'postgres' THEN
      NEW.is_admin := OLD.is_admin;
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_protect_profile_admin_flag ON public.profiles;
CREATE TRIGGER tr_protect_profile_admin_flag
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_admin_flag();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, handle, phone, avatar_url, location, business_name, role, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'handle', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'location', ''),
    COALESCE(NEW.raw_user_meta_data->>'businessName', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'seller'),
    LOWER(COALESCE(NEW.email, '')) = 'nuraliyevsuhrobiddin@gmail.com'
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profil ma'lumotlari o'zgarganda, foydalanuvchi e'lonlaridagi seller ma'lumotlari ham yangilanadi.
CREATE OR REPLACE FUNCTION public.sync_profile_to_posts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts
  SET
    seller_name = NEW.name,
    seller_avatar = COALESCE(NEW.avatar_url, ''),
    location = COALESCE(NEW.location, ''),
    phone = COALESCE(NEW.phone, ''),
    updated_at = NOW()
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_profile_updated_sync_posts ON public.profiles;
CREATE TRIGGER on_profile_updated_sync_posts
  AFTER UPDATE OF name, avatar_url, location, phone ON public.profiles
  FOR EACH ROW
  WHEN (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.avatar_url IS DISTINCT FROM NEW.avatar_url OR
    OLD.location IS DISTINCT FROM NEW.location OR
    OLD.phone IS DISTINCT FROM NEW.phone
  )
  EXECUTE FUNCTION public.sync_profile_to_posts();

-- Trigger o'rnatilishidan oldin yaratilgan userlar uchun profile yaratish.
INSERT INTO public.profiles (id, email, name, handle, phone, role, is_admin)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', SPLIT_PART(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'handle', SPLIT_PART(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'phone', ''),
  COALESCE(u.raw_user_meta_data->>'role', 'seller'),
  LOWER(COALESCE(u.email, '')) = 'nuraliyevsuhrobiddin@gmail.com'
FROM auth.users AS u
ON CONFLICT (id) DO NOTHING;


-- =====================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Admin ekanligini tekshiruvchi yordamchi funksiya. SECURITY DEFINER bo'lgani
-- uchun bu funksiya ICHIDAGI "profiles" so'rovi RLS'ni chetlab o'tadi.
-- MUHIM: policy ichida to'g'ridan-to'g'ri
--   EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
-- yozish XATO — chunki bu subquery ham "profiles" jadvalidan o'qiydi, RLS
-- uni policy sifatida qayta tekshiradi, u yana shu subquery'ni ishga
-- tushiradi — cheksiz rekursiya ("infinite recursion detected in policy for
-- relation profiles"). Shu funksiya orqali chaqirish rekursiyani oldini oladi.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Eski siyosat email/telefon/is_admin kabi maxfiy ustunlarni anon kalit
-- bilan HAMMAGA ochiq qilib qo'ygan edi (USING (true)). Endi faqat o'z
-- profili yoki admin uchun. E'lon/mahsulot kartalaridagi sotuvchi
-- ma'lumotlari (ism, avatar) alohida ustunlarda saqlanadi — shu sabab bu
-- cheklov ommaviy ko'rinishlarni buzmaydi.
DROP POLICY IF EXISTS "Barcha foydalanuvchi profillarini ko'rish mumkin" ON public.profiles;
DROP POLICY IF EXISTS "Foydalanuvchi faqat o'z profilini yoki admin barchasini ko'radi" ON public.profiles;
CREATE POLICY "Foydalanuvchi faqat o'z profilini yoki admin barchasini ko'radi" ON public.profiles FOR SELECT USING (
  auth.uid() = id OR public.is_admin()
);
DROP POLICY IF EXISTS "Foydalanuvchi o'z profilini yaratishi mumkin" ON public.profiles;
CREATE POLICY "Foydalanuvchi o'z profilini yaratishi mumkin" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Foydalanuvchi faqat o'z profilini tahrirlay oladi" ON public.profiles;
CREATE POLICY "Foydalanuvchi faqat o'z profilini tahrirlay oladi" ON public.profiles FOR UPDATE USING (
  auth.uid() = id OR public.is_admin()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "E'lonlarni barcha ko'rishi mumkin" ON public.posts;
CREATE POLICY "E'lonlarni barcha ko'rishi mumkin" ON public.posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Tizimdagi foydalanuvchi e'lon qo'sha oladi" ON public.posts;
CREATE POLICY "Tizimdagi foydalanuvchi e'lon qo'sha oladi" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Foydalanuvchi faqat o'z e'lonini tahrirlay oladi" ON public.posts;
CREATE POLICY "Foydalanuvchi faqat o'z e'lonini tahrirlay oladi" ON public.posts FOR UPDATE USING (
  auth.uid() = user_id OR public.is_admin()
);
DROP POLICY IF EXISTS "Foydalanuvchi faqat o'z e'lonini o'chira oladi" ON public.posts;
CREATE POLICY "Foydalanuvchi faqat o'z e'lonini o'chira oladi" ON public.posts FOR DELETE USING (
  auth.uid() = user_id OR public.is_admin()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Kategoriyalarni barcha ko'radi" ON public.categories;
CREATE POLICY "Kategoriyalarni barcha ko'radi" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin kategoriyalarni boshqaradi" ON public.categories;
CREATE POLICY "Admin kategoriyalarni boshqaradi" ON public.categories FOR ALL USING (
  public.is_admin()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shikoyatlarni admin ko'radi" ON public.reports;
CREATE POLICY "Shikoyatlarni admin ko'radi" ON public.reports FOR SELECT USING (
  public.is_admin()
);
DROP POLICY IF EXISTS "Foydalanuvchi shikoyat qoldirishi mumkin" ON public.reports;
CREATE POLICY "Foydalanuvchi shikoyat qoldirishi mumkin" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Admin shikoyatni yangilaydi" ON public.reports;
CREATE POLICY "Admin shikoyatni yangilaydi" ON public.reports FOR UPDATE USING (
  public.is_admin()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit loglarni faqat admin ko'radi" ON public.audit_logs;
CREATE POLICY "Audit loglarni faqat admin ko'radi" ON public.audit_logs FOR SELECT USING (
  public.is_admin()
);
DROP POLICY IF EXISTS "Audit loglarni faqat admin yaratadi" ON public.audit_logs;
CREATE POLICY "Audit loglarni faqat admin yaratadi" ON public.audit_logs FOR INSERT WITH CHECK (
  public.is_admin()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tasdiqlangan mahsulotlarni barcha ko'radi" ON public.products;
CREATE POLICY "Tasdiqlangan mahsulotlarni barcha ko'radi" ON public.products FOR SELECT USING (
  approval_status = 'approved'
  OR auth.uid()::text = submitted_by
  OR seller_id = auth.uid()
  OR public.is_admin()
);
DROP POLICY IF EXISTS "Mahsulot qo'shish" ON public.products;
CREATE POLICY "Mahsulot qo'shish" ON public.products FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_admin()
    OR auth.uid()::text = submitted_by
    OR seller_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Mahsulotni o'chirish yoki yangilash" ON public.products;
CREATE POLICY "Mahsulotni o'chirish yoki yangilash" ON public.products FOR UPDATE USING (
  seller_id = auth.uid() OR auth.uid()::text = submitted_by OR public.is_admin()
);
DROP POLICY IF EXISTS "Mahsulotni o'chirish" ON public.products;
CREATE POLICY "Mahsulotni o'chirish" ON public.products FOR DELETE USING (
  seller_id = auth.uid() OR auth.uid()::text = submitted_by OR public.is_admin()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Buyurtmalarni barcha ko'rishi mumkin" ON public.orders;
DROP POLICY IF EXISTS "Buyurtmalarni faqat egasi ko'radi" ON public.orders;
CREATE POLICY "Buyurtmalarni faqat egasi ko'radi" ON public.orders FOR SELECT USING (
  auth.uid() = user_id OR public.is_admin()
);
DROP POLICY IF EXISTS "Buyurtma berish" ON public.orders;
CREATE POLICY "Buyurtma berish" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Bu siyosat oldin umuman yo'q edi — natijada admin panelidan buyurtma
-- holatini yangilash (Qabul -> Yo'lda -> Yetdi) RLS tomonidan doim rad
-- etilardi.
DROP POLICY IF EXISTS "Admin buyurtma holatini yangilaydi" ON public.orders;
CREATE POLICY "Admin buyurtma holatini yangilaydi" ON public.orders FOR UPDATE USING (
  public.is_admin()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Izohlarni barcha ko'radi" ON public.comments;
CREATE POLICY "Izohlarni barcha ko'radi" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Izoh qoldirish" ON public.comments;
CREATE POLICY "Izoh qoldirish" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Saqlanganlarni ko'rish" ON public.saved_posts;
CREATE POLICY "Saqlanganlarni ko'rish" ON public.saved_posts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Saqlangan qo'shish" ON public.saved_posts;
CREATE POLICY "Saqlangan qo'shish" ON public.saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Saqlangan o'chirish" ON public.saved_posts;
CREATE POLICY "Saqlangan o'chirish" ON public.saved_posts FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.liked_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Layklarni ko'rish" ON public.liked_posts;
CREATE POLICY "Layklarni ko'rish" ON public.liked_posts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Layk qo'shish" ON public.liked_posts;
CREATE POLICY "Layk qo'shish" ON public.liked_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Layk o'chirish" ON public.liked_posts;
CREATE POLICY "Layk o'chirish" ON public.liked_posts FOR DELETE USING (auth.uid() = user_id);


-- =====================================================================
-- 5. INDEXES FOR HIGH PERFORMANCE
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_approval ON public.products(approval_status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- E'lon media fayllari uchun public Storage bucket va xavfsiz upload qoidalari.
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-media', 'listing-media', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

DROP POLICY IF EXISTS "Listing media public read" ON storage.objects;
CREATE POLICY "Listing media public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'listing-media');

DROP POLICY IF EXISTS "Listing media authenticated upload" ON storage.objects;
CREATE POLICY "Listing media authenticated upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-media');

-- Eski siyosatlar nomida "owner" deyilgan bo'lsa-da, faqat bucket_id'ni
-- tekshirardi — HAR QANDAY tizimga kirgan foydalanuvchi BOSHQA
-- foydalanuvchining media faylini yangilashi yoki o'chirishi mumkin edi.
-- Fayllar har doim `${userId}/...` shaklida yuklanadi (uploadListingMedia),
-- shuning uchun storage.foldername(name) orqali haqiqiy egalikni tekshiramiz.
DROP POLICY IF EXISTS "Listing media owner update" ON storage.objects;
CREATE POLICY "Listing media owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'listing-media' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  )
  WITH CHECK (
    bucket_id = 'listing-media' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Listing media owner delete" ON storage.objects;
CREATE POLICY "Listing media owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'listing-media' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

-- Oldindan ro'yxatdan o'tgan admin akkauntini ham admin sifatida belgilash.
UPDATE public.profiles SET is_admin = TRUE WHERE LOWER(email) = 'nuraliyevsuhrobiddin@gmail.com';


-- =====================================================================
-- 6. DEMO DATA CLEANUP
-- Ilova demo e'lonlarsiz ishga tushadi. Eski versiyada seed ishlatilgan bo'lsa,
-- quyidagi buyruqlar faqat o'sha demo sarlavhalarni olib tashlaydi.
DELETE FROM public.products WHERE title IN (
  'Farg''ona Qizil Olmasi (Eksportbop)',
  'Toshkent Bug''doyi (1-nav Saralan)',
  'Traktor Lovol 904 (Yangi 2024)',
  'Hisor Zotdor Qo''chqori'
);
DELETE FROM public.posts WHERE title IN (
  'Farg''ona Qizil Olmasi (Eksportbop)',
  'Toshkent Bug''doyi (1-nav Saralan)'
);
-- =====================================================================

/*
INSERT INTO public.products (title, seller, verified, category, price, numeric_price, image, images, rating, reviews_count, min_order, discount, location, telegram, approval_status, source)
VALUES 
('Farg''ona Qizil Olmasi (Eksportbop)', 'Alisher Agro MChJ', true, 'fruits', '12,500 so''m / kg', 12500, 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=600&auto=format&fit=crop&q=80', ARRAY['https://images.unsplash.com/photo-1560493676-04071c5f467b?w=600&auto=format&fit=crop&q=80'], 4.9, 42, '50 kg', 'Eksport bop', 'Farg''ona', '@alisher_agro', 'approved', 'admin'),
('Toshkent Bug''doyi (1-nav Saralan)', 'Vodiy G''alla Klasteri', true, 'grains', '3,800 so''m / kg', 3800, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&auto=format&fit=crop&q=80', ARRAY['https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&auto=format&fit=crop&q=80'], 4.8, 18, '100 kg', 'Aksiya', 'Toshkent v.', '@vodiy_galla', 'approved', 'admin'),
('Traktor Lovol 904 (Yangi 2024)', 'AgroTech Lizing MChJ', true, 'machinery', '245,000,000 so''m', 245000000, 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=600&auto=format&fit=crop&q=80', ARRAY['https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=600&auto=format&fit=crop&q=80'], 5.0, 7, '1 dona', 'Kredit bor', 'Samarqand', '@agrotech_lizing', 'approved', 'admin'),
('Hisor Zotdor Qo''chqori', 'Hisor Chorva Fermasi', true, 'livestock', '4,200,000 so''m', 4200000, 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=600&auto=format&fit=crop&q=80', ARRAY['https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=600&auto=format&fit=crop&q=80'], 4.95, 29, '1 dona', 'Saralangan', 'Surxondaryo', '@hisor_chorva', 'approved', 'admin');

INSERT INTO public.posts (seller_name, seller_avatar, verified, location, phone, telegram, title, category, category_name, price, numeric_price, min_order, type, media_url, poster_url, likes_count, comments_count, views_count, condition, description)
VALUES
('Alisher Agro MChJ', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', true, 'Farg''ona', '+998 90 123 45 67', '@alisher_agro', 'Farg''ona Qizil Olmasi (Eksportbop)', 'fruits', 'Meva-Sabzavot', '12,500 so''m / kg', 12500, '50 kg', 'image', 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800&auto=format&fit=crop&q=80', '', 142, 18, 0, 'Yangi uzilgan', 'A''lo navli Farg''ona eksportbop qizil olmalari tayyor holatda.'),
('Vodiy G''alla Klasteri', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', true, 'Toshkent v.', '+998 91 234 56 78', '@vodiy_galla', 'Toshkent Bug''doyi (1-nav Saralan)', 'grains', 'G''alla & Don', '3,800 so''m / kg', 3800, '100 kg', 'image', 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop&q=80', '', 98, 12, 0, 'Saralangan don', 'Yuqori sifatli 1-navli Toshkent bug''doyi chegirma narxlarda.');
*/

-- =====================================================================
-- 7. VIEWS COUNT INCREMENT FUNCTION (RPC)
-- =====================================================================
DROP FUNCTION IF EXISTS public.increment_post_views(UUID);
CREATE OR REPLACE FUNCTION public.increment_post_views(p_post_id UUID)
RETURNS VOID AS $$
  UPDATE public.posts
  SET views_count = views_count + 1
  WHERE id = p_post_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.increment_post_views(UUID) TO anon, authenticated;

-- =====================================================================
-- 8. COMMENTS COUNT SYNCHRONIZATION
-- Izoh qo'shilganda postdagi comments_count avtomatik yangilanadi.
-- Frontend boshqa foydalanuvchining postini UPDATE qilmaydi; RLS buzilmaydi.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.increment_post_comments()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.posts
  SET comments_count = comments_count + 1,
      updated_at = NOW()
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_comment_created ON public.comments;
CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.increment_post_comments();

-- Trigger o'rnatilishidan oldin yozilgan izohlar uchun sonlarni bir marta tiklash.
UPDATE public.posts AS p
SET comments_count = (
  SELECT COUNT(*)::INTEGER
  FROM public.comments AS c
  WHERE c.post_id = p.id
);

-- Layk qo'shilishi yoki o'chirilishida postdagi likes_count ham real va
-- atomik saqlanadi. Frontend postni bevosita UPDATE qilmaydi.
CREATE OR REPLACE FUNCTION public.sync_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET likes_count = likes_count + 1,
        updated_at = NOW()
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET likes_count = GREATEST(0, likes_count - 1),
        updated_at = NOW()
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_post_like_changed ON public.liked_posts;
CREATE TRIGGER on_post_like_changed
  AFTER INSERT OR DELETE ON public.liked_posts
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes_count();

-- Eski layklar uchun sonlarni bir marta tiklash.
UPDATE public.posts AS p
SET likes_count = (
  SELECT COUNT(*)::INTEGER
  FROM public.liked_posts AS l
  WHERE l.post_id = p.id
);

-- =====================================================================
-- 9. NOTIFICATIONS (Bildirishnomalar tizimi)
-- Real-time bildirishnomalar: izoh, layk, buyurtma holati, tasdiqlash/rad
-- etish. Yozuvlar faqat SECURITY DEFINER trigger funksiyalari orqali
-- qo'shiladi — frontend to'g'ridan-to'g'ri boshqa foydalanuvchi uchun
-- bildirishnoma yoza olmaydi.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- 'comment' | 'like' | 'order_status' | 'post_approved' | 'post_rejected' | 'product_approved' | 'product_rejected'
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    target_type TEXT DEFAULT '', -- 'post' | 'order' | 'product'
    target_id TEXT DEFAULT '',
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT DEFAULT '',
    actor_avatar TEXT DEFAULT '',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Foydalanuvchi faqat o'z bildirishnomalarini ko'radi" ON public.notifications;
CREATE POLICY "Foydalanuvchi faqat o'z bildirishnomalarini ko'radi" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Foydalanuvchi bildirishnomani o'qilgan deb belgilaydi" ON public.notifications;
CREATE POLICY "Foydalanuvchi bildirishnomani o'qilgan deb belgilaydi" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- Izoh qoldirilganda post egasiga bildirishnoma.
CREATE OR REPLACE FUNCTION public.notify_on_new_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_post_owner UUID;
BEGIN
  SELECT user_id INTO v_post_owner FROM public.posts WHERE id = NEW.post_id;
  IF v_post_owner IS NOT NULL AND v_post_owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, target_type, target_id, actor_id, actor_name, actor_avatar)
    VALUES (v_post_owner, 'comment', 'Yangi izoh', NEW.content, 'post', NEW.post_id::text, NEW.user_id, NEW.user_name, NEW.user_avatar);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_on_new_comment ON public.comments;
CREATE TRIGGER tr_notify_on_new_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_comment();

-- Layk bosilganda post egasiga bildirishnoma.
CREATE OR REPLACE FUNCTION public.notify_on_new_like()
RETURNS TRIGGER AS $$
DECLARE
  v_post_owner UUID;
  v_post_title TEXT;
  v_liker_name TEXT;
  v_liker_avatar TEXT;
BEGIN
  SELECT user_id, title INTO v_post_owner, v_post_title FROM public.posts WHERE id = NEW.post_id;
  IF v_post_owner IS NOT NULL AND v_post_owner <> NEW.user_id THEN
    SELECT name, avatar_url INTO v_liker_name, v_liker_avatar FROM public.profiles WHERE id = NEW.user_id;
    INSERT INTO public.notifications (user_id, type, title, body, target_type, target_id, actor_id, actor_name, actor_avatar)
    VALUES (v_post_owner, 'like', 'Yangi layk', COALESCE(v_post_title, ''), 'post', NEW.post_id::text, NEW.user_id, COALESCE(v_liker_name, ''), COALESCE(v_liker_avatar, ''));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_on_new_like ON public.liked_posts;
CREATE TRIGGER tr_notify_on_new_like
  AFTER INSERT ON public.liked_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_like();

-- Buyurtma holati o'zgarganda xaridorga bildirishnoma.
CREATE OR REPLACE FUNCTION public.notify_on_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, target_type, target_id)
    VALUES (NEW.user_id, 'order_status', 'Buyurtma holati yangilandi', NEW.status || ' — ' || NEW.product_name, 'order', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_on_order_status_change ON public.orders;
CREATE TRIGGER tr_notify_on_order_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_status_change();

-- E'lon admin tomonidan tasdiqlanganda yoki rad etilganda sotuvchiga bildirishnoma.
CREATE OR REPLACE FUNCTION public.notify_on_post_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, body, target_type, target_id)
    VALUES (
      NEW.user_id,
      CASE WHEN NEW.status = 'approved' THEN 'post_approved' ELSE 'post_rejected' END,
      CASE WHEN NEW.status = 'approved' THEN 'E''loningiz tasdiqlandi' ELSE 'E''loningiz rad etildi' END,
      CASE WHEN NEW.status = 'approved' THEN NEW.title ELSE COALESCE(NULLIF(NEW.rejection_reason, ''), NEW.title) END,
      'post', NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_on_post_status_change ON public.posts;
CREATE TRIGGER tr_notify_on_post_status_change
  AFTER UPDATE OF status ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_status_change();

-- Market mahsuloti admin tomonidan tasdiqlanganda yoki rad etilganda sotuvchiga bildirishnoma.
CREATE OR REPLACE FUNCTION public.notify_on_product_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.seller_id IS NOT NULL AND OLD.approval_status IS DISTINCT FROM NEW.approval_status AND NEW.approval_status IN ('approved', 'rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, body, target_type, target_id)
    VALUES (
      NEW.seller_id,
      CASE WHEN NEW.approval_status = 'approved' THEN 'product_approved' ELSE 'product_rejected' END,
      CASE WHEN NEW.approval_status = 'approved' THEN 'Mahsulotingiz tasdiqlandi' ELSE 'Mahsulotingiz rad etildi' END,
      NEW.title,
      'product', NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_on_product_status_change ON public.products;
CREATE TRIGGER tr_notify_on_product_status_change
  AFTER UPDATE OF approval_status ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_product_status_change();

-- Frontend Realtime orqali yangi bildirishnomalarni tinglashi uchun jadvalni yoqish.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- =====================================================================
-- 10. E'LON MUDDATI (Listing expiration / auto-delete)
-- Foydalanuvchi e'lon joylashda muddat tanlaydi (1/3/7/30 kun, 1 yil yoki
-- cheksiz). Muddat tugagach frontend uni darhol barcha foydalanuvchilar
-- uchun ro'yxatdan yashiradi (bunga pg_cron shart emas). Quyidagi pg_cron
-- vazifasi esa muddati o'tgan qatorlarni ma'lumotlar bazasidan ham
-- haqiqatan o'chirib tashlaydi — bu ixtiyoriy, faqat saqlash tozaligi
-- uchun kerak.
-- =====================================================================
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON public.posts(expires_at) WHERE expires_at IS NOT NULL;

-- pg_cron ba'zi Supabase rejalarida standart yoqilmagan bo'lishi mumkin.
-- Agar quyidagi CREATE EXTENSION xato bersa: Dashboard → Database →
-- Extensions bo'limidan "pg_cron"ni yoqing, so'ng shu bo'limni qayta ishga
-- tushiring. Yuqoridagi ALTER TABLE/INDEX ilova uchun yetarli — ular
-- pg_cron'siz ham ishlaydi.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'delete-expired-posts') THEN
    PERFORM cron.unschedule('delete-expired-posts');
  END IF;
END $$;

SELECT cron.schedule(
  'delete-expired-posts',
  '0 * * * *', -- Har soat boshida
  $$ DELETE FROM public.posts WHERE expires_at IS NOT NULL AND expires_at < now(); $$
);

-- =====================================================================
-- 11. MARKET YAXSHILANISHLARI (zaxira, sharhlar, birlashgan buyurtma,
-- foydalanuvchi tomonidan mahsulot taklif qilish)
-- =====================================================================

-- --- 11.1 Zaxira (stock) ---------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock INTEGER NULL;

-- Buyurtma berilganda zaxirani ATOM tarzda kamaytiradi (FOR UPDATE qulf
-- bilan — ikki xaridor bir vaqtda oxirgi donani sotib olishning oldini
-- oladi). stock = NULL bo'lsa (cheklov qo'yilmagan) — hech narsa qilmay,
-- muvaffaqiyat qaytaradi. Yetarli zaxira bo'lmasa FALSE qaytaradi.
CREATE OR REPLACE FUNCTION public.decrement_product_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_stock INTEGER;
BEGIN
  SELECT stock INTO v_current_stock FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF v_current_stock IS NULL THEN
    RETURN TRUE;
  END IF;
  IF v_current_stock < p_quantity THEN
    RETURN FALSE;
  END IF;
  UPDATE public.products SET stock = stock - p_quantity WHERE id = p_product_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.decrement_product_stock(UUID, INTEGER) TO authenticated;

-- --- 11.2 Bitta xariddagi buyurtmalarni birlashtirish ------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS group_id UUID NULL;
CREATE INDEX IF NOT EXISTS idx_orders_group_id ON public.orders(group_id) WHERE group_id IS NOT NULL;

-- --- 11.3 Mahsulot sharhlari (haqiqiy reyting) -------------------------
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    user_name TEXT NOT NULL DEFAULT '',
    user_avatar TEXT DEFAULT '',
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON public.product_reviews(product_id);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sharhlarni barcha ko'radi" ON public.product_reviews;
CREATE POLICY "Sharhlarni barcha ko'radi" ON public.product_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Foydalanuvchi sharh qoldiradi" ON public.product_reviews;
CREATE POLICY "Foydalanuvchi sharh qoldiradi" ON public.product_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Foydalanuvchi o'z sharhini tahrirlaydi" ON public.product_reviews;
CREATE POLICY "Foydalanuvchi o'z sharhini tahrirlaydi" ON public.product_reviews FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Foydalanuvchi o'z sharhini o'chiradi" ON public.product_reviews;
CREATE POLICY "Foydalanuvchi o'z sharhini o'chiradi" ON public.product_reviews FOR DELETE USING (
  auth.uid() = user_id OR public.is_admin()
);

GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;

-- Sharh qo'shilganda/o'zgarganda/o'chirilganda mahsulotning rating va
-- reviews_count ustunlari avtomatik qayta hisoblanadi.
CREATE OR REPLACE FUNCTION public.sync_product_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE public.products
  SET
    rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.product_reviews WHERE product_id = v_product_id), 5.0),
    reviews_count = (SELECT COUNT(*)::INTEGER FROM public.product_reviews WHERE product_id = v_product_id)
  WHERE id = v_product_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_product_review_changed ON public.product_reviews;
CREATE TRIGGER on_product_review_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_rating();

-- --- 11.4 Biznes-akkauntlar Market uchun o'zi mahsulot taklif qilishi --
-- INSERT siyosati ("Mahsulot qo'shish") allaqachon o'z submitted_by/
-- seller_id'i bilan qo'shishga ruxsat beradi — qo'shimcha RLS shart emas.
-- Lekin XAVFSIZLIK uchun: mijoz (client) approval_status='approved' deb
-- yuborsa ham, admin bo'lmagan foydalanuvchi hech qachon o'zini-o'zi
-- avtomatik tasdiqlay olmasligi kerak. Shu trigger buni majburlaydi.
ALTER TYPE product_source_type ADD VALUE IF NOT EXISTS 'user';

CREATE OR REPLACE FUNCTION public.enforce_product_moderation()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.approval_status := 'pending';
    IF NEW.source IS NULL OR NEW.source = 'admin' THEN
      NEW.source := 'user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_enforce_product_moderation ON public.products;
CREATE TRIGGER tr_enforce_product_moderation
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_product_moderation();

-- =====================================================================
-- 12. B2B ULGURJI BOZOR (Supplier / Business Buyer / Commission)
-- =====================================================================
-- Eski "Market" (chakana do'kon) shu bilan almashtiriladi. Eski
-- products/orders jadvallariga TEGILMAYDI — real xaridorlar tarixi
-- saqlanib qoladi, faqat ular uchun UI olib tashlanadi.
-- =====================================================================

-- --- 12.1 Yordamchi funksiyalar (SECURITY DEFINER, is_admin() naqshi) ---
-- Bular hech qachon o'zi himoya qilayotgan jadvalning o'ziga ichki
-- subquery yozmaydi (rekursiya xavfi) — har biri BOSHQA jadvaldan o'qiydi.
-- LANGUAGE sql emas, plpgsql — business_profiles/supplier_profiles hali
-- pastda e'lon qilinadi, va LANGUAGE sql funksiyalar (plpgsql'dan farqli
-- o'laroq) tanasidagi jadvallar CREATE FUNCTION vaqtida darhol mavjud
-- bo'lishini talab qiladi. plpgsql tekshiruvni chaqirilish vaqtigacha
-- kechiktiradi, shu bilan pastdagi jadvallarga oldindan murojaat qilishga
-- imkon beradi.
CREATE OR REPLACE FUNCTION public.is_own_business(p_business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.business_profiles WHERE id = p_business_id AND user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

CREATE OR REPLACE FUNCTION public.is_own_supplier(p_supplier_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.supplier_profiles WHERE id = p_supplier_id AND user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

CREATE OR REPLACE FUNCTION public.is_verified_supplier(p_supplier_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.supplier_profiles WHERE id = p_supplier_id AND verification_status = 'approved');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

-- --- 12.2 business_profiles (Business Buyer — do'kon identifikatsiyasi) ---
CREATE TABLE IF NOT EXISTS public.business_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    owner_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    business_type TEXT NOT NULL DEFAULT 'other'
      CHECK (business_type IN ('grocery','minimarket','supermarket','clothing','pharmacy','cafe_restaurant','construction','household','other')),
    region TEXT DEFAULT '',
    district TEXT DEFAULT '',
    description TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Biznes profilini egasi yoki admin ko'radi" ON public.business_profiles;
DROP POLICY IF EXISTS "Xarita uchun do'konlarni hamma ko'radi" ON public.business_profiles;
CREATE POLICY "Xarita uchun do'konlarni hamma ko'radi" ON public.business_profiles FOR SELECT USING (status = 'active' OR user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Foydalanuvchi biznes profil yaratadi" ON public.business_profiles;
CREATE POLICY "Foydalanuvchi biznes profil yaratadi" ON public.business_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Egasi yoki admin tahrirlaydi (business_profiles)" ON public.business_profiles;
CREATE POLICY "Egasi yoki admin tahrirlaydi (business_profiles)" ON public.business_profiles FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Faqat admin o'chiradi (business_profiles)" ON public.business_profiles;
CREATE POLICY "Faqat admin o'chiradi (business_profiles)" ON public.business_profiles FOR DELETE USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON public.business_profiles(user_id);

-- --- 12.3 business_addresses (Xaridorning yetkazib berish manzillari) ---
CREATE TABLE IF NOT EXISTS public.business_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    label TEXT DEFAULT 'Asosiy manzil',
    store_name TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    region TEXT DEFAULT '',
    district TEXT DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    delivery_note TEXT DEFAULT '',
    latitude NUMERIC NULL,
    longitude NUMERIC NULL,
    is_default BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.business_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Manzilni egasi yoki admin ko'radi" ON public.business_addresses;
DROP POLICY IF EXISTS "Xarita uchun manzillarni hamma ko'radi" ON public.business_addresses;
CREATE POLICY "Xarita uchun manzillarni hamma ko'radi" ON public.business_addresses FOR SELECT USING (is_default = TRUE OR public.is_own_business(business_id) OR public.is_admin());
DROP POLICY IF EXISTS "Manzil qo'shish" ON public.business_addresses;
CREATE POLICY "Manzil qo'shish" ON public.business_addresses FOR INSERT WITH CHECK (public.is_own_business(business_id));
DROP POLICY IF EXISTS "Manzilni tahrirlash" ON public.business_addresses;
CREATE POLICY "Manzilni tahrirlash" ON public.business_addresses FOR UPDATE USING (public.is_own_business(business_id) OR public.is_admin());
DROP POLICY IF EXISTS "Manzilni o'chirish" ON public.business_addresses;
CREATE POLICY "Manzilni o'chirish" ON public.business_addresses FOR DELETE USING (public.is_own_business(business_id) OR public.is_admin());

-- Xarita uchun ommaviy do'konlar ro'yxatini qaytaruvchi xavfsiz RPC
CREATE OR REPLACE FUNCTION public.get_public_stores_for_map()
RETURNS TABLE (
  id UUID,
  store_name TEXT,
  business_type TEXT,
  region TEXT,
  district TEXT,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    bp.id,
    bp.store_name,
    bp.business_type,
    bp.region,
    bp.district,
    COALESCE(ba.address, '') AS address,
    COALESCE(ba.latitude, 41.2995) AS latitude,
    COALESCE(ba.longitude, 69.2401) AS longitude,
    bp.logo_url,
    bp.description,
    bp.created_at
  FROM public.business_profiles bp
  LEFT JOIN public.business_addresses ba ON ba.business_id = bp.id AND ba.is_default = TRUE
  WHERE bp.status = 'active';
$$;

GRANT EXECUTE ON FUNCTION public.get_public_stores_for_map() TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_business_addresses_business_id ON public.business_addresses(business_id);

-- --- 12.4 supplier_profiles (Ishlab chiqaruvchi/Importyor/Distributor) ---
CREATE TABLE IF NOT EXISTS public.supplier_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    supplier_type TEXT NOT NULL CHECK (supplier_type IN ('manufacturer','importer','distributor','supplier')),
    owner_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT DEFAULT '',
    region TEXT DEFAULT '',
    district TEXT DEFAULT '',
    address TEXT DEFAULT '',
    latitude NUMERIC NULL,   -- kelajakdagi xarita moduli uchun, hozircha ishlatilmaydi
    longitude NUMERIC NULL,  -- kelajakdagi xarita moduli uchun, hozircha ishlatilmaydi
    description TEXT DEFAULT '',
    categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    tax_id TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','approved','rejected','suspended')),
    rejection_reason TEXT DEFAULT '',
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Himoya: admin bo'lmagan foydalanuvchi ro'yxatdan o'tishda o'zini
-- tasdiqlangan deb belgilay olmaydi yoki o'ziga komissiya stavkasi tanlay olmaydi.
CREATE OR REPLACE FUNCTION public.enforce_supplier_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.verification_status := 'pending';
    NEW.commission_rate := 5.00;
    NEW.rejection_reason := '';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_enforce_supplier_verification ON public.supplier_profiles;
CREATE TRIGGER tr_enforce_supplier_verification BEFORE INSERT ON public.supplier_profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_supplier_verification();

-- Himoya: keyinchalik oddiy UPDATE orqali ham o'zini tasdiqlay olmaydi
-- yoki komissiya stavkasini o'zgartira olmaydi (protect_profile_admin_flag naqshi).
CREATE OR REPLACE FUNCTION public.protect_supplier_verification_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- SESSION_USER, CURRENT_USER emas — sabab protect_profile_admin_flag()
  -- izohida yozilgan (CURRENT_USER SECURITY DEFINER ichida doim
  -- funksiya egasiga teng, shuning uchun himoya bermaydi).
  IF NOT public.is_admin() AND SESSION_USER <> 'postgres' THEN
    NEW.verification_status := OLD.verification_status;
    NEW.commission_rate := OLD.commission_rate;
    NEW.rejection_reason := OLD.rejection_reason;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_protect_supplier_verification_fields ON public.supplier_profiles;
CREATE TRIGGER tr_protect_supplier_verification_fields BEFORE UPDATE ON public.supplier_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_supplier_verification_fields();

ALTER TABLE public.supplier_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tasdiqlangan supplierlarni barcha ko'radi" ON public.supplier_profiles;
CREATE POLICY "Tasdiqlangan supplierlarni barcha ko'radi" ON public.supplier_profiles FOR SELECT USING (
  verification_status = 'approved' OR user_id = auth.uid() OR public.is_admin()
);
DROP POLICY IF EXISTS "Supplier ro'yxatdan o'tadi" ON public.supplier_profiles;
CREATE POLICY "Supplier ro'yxatdan o'tadi" ON public.supplier_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Egasi yoki admin tahrirlaydi (supplier_profiles)" ON public.supplier_profiles;
CREATE POLICY "Egasi yoki admin tahrirlaydi (supplier_profiles)" ON public.supplier_profiles FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Faqat admin o'chiradi (supplier_profiles)" ON public.supplier_profiles;
CREATE POLICY "Faqat admin o'chiradi (supplier_profiles)" ON public.supplier_profiles FOR DELETE USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_supplier_profiles_user_id ON public.supplier_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_profiles_verification_status ON public.supplier_profiles(verification_status);

-- --- 12.5 contracts (Elektron hamkorlik shartnomasi — haqiqiy ERI emas) ---
-- Band matnlari (to'lov shartlari, yetkazib berish, qaytarish, bekor qilish,
-- sifat javobgarligi, hisob-kitob, tugatish) DB'da EMAS — static/versiyalangan
-- matn sifatida src/data/b2bContractTemplate.ts faylida saqlanadi.
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
    contract_version TEXT NOT NULL DEFAULT 'v1',
    commission_rate NUMERIC(5,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','terminated')),
    accepted_at TIMESTAMPTZ NULL,
    terminated_at TIMESTAMPTZ NULL,
    termination_reason TEXT DEFAULT '',
    signature_ref TEXT DEFAULT '', -- kelajakdagi haqiqiy ERI uchun zaxira, 1-bosqichda doim bo'sh
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client-side INSERT siyosati YO'Q — qator faqat 12.6-bo'limdagi trigger
-- orqali (supplier tasdiqlanganda) yaratiladi, notifications jadvali kabi.
CREATE OR REPLACE FUNCTION public.protect_contract_integrity()
RETURNS TRIGGER AS $$
BEGIN
  -- SESSION_USER, CURRENT_USER emas — sabab protect_profile_admin_flag()
  -- izohida yozilgan.
  IF NOT public.is_admin() AND SESSION_USER <> 'postgres' THEN
    NEW.supplier_id := OLD.supplier_id;
    NEW.commission_rate := OLD.commission_rate;
    NEW.contract_version := OLD.contract_version;
    IF OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'Shartnoma holatini faqat admin o''zgartira oladi';
    END IF;
    IF NEW.status NOT IN ('accepted','rejected') THEN
      RAISE EXCEPTION 'Ruxsatsiz holat o''zgarishi';
    END IF;
    IF NEW.status = 'accepted' THEN NEW.accepted_at := NOW(); END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_protect_contract_integrity ON public.contracts;
CREATE TRIGGER tr_protect_contract_integrity BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.protect_contract_integrity();

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shartnomani egasi yoki admin ko'radi" ON public.contracts;
CREATE POLICY "Shartnomani egasi yoki admin ko'radi" ON public.contracts FOR SELECT USING (public.is_own_supplier(supplier_id) OR public.is_admin());
DROP POLICY IF EXISTS "Shartnomani egasi qabul/rad etadi" ON public.contracts;
CREATE POLICY "Shartnomani egasi qabul/rad etadi" ON public.contracts FOR UPDATE USING (public.is_own_supplier(supplier_id) OR public.is_admin());

CREATE INDEX IF NOT EXISTS idx_contracts_supplier_id ON public.contracts(supplier_id);

-- --- 12.6 Supplier tasdiqlanganda: bildirishnoma + avtomatik shartnoma ---
CREATE OR REPLACE FUNCTION public.handle_supplier_verification_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
    IF NEW.verification_status = 'approved' THEN
      INSERT INTO public.notifications (user_id, type, title, body, target_type, target_id)
      VALUES (NEW.user_id, 'supplier_approved', 'Tabriklaymiz! Supplier sifatida tasdiqlandingiz', NEW.company_name, 'supplier_profile', NEW.id::text);

      IF NOT EXISTS (SELECT 1 FROM public.contracts WHERE supplier_id = NEW.id AND status = 'pending') THEN
        INSERT INTO public.contracts (supplier_id, contract_version, commission_rate, status)
        VALUES (NEW.id, 'v1', NEW.commission_rate, 'pending');
      END IF;
    ELSIF NEW.verification_status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, type, title, body, target_type, target_id)
      VALUES (NEW.user_id, 'supplier_rejected', 'Ariza rad etildi', COALESCE(NULLIF(NEW.rejection_reason,''), NEW.company_name), 'supplier_profile', NEW.id::text);
    ELSIF NEW.verification_status = 'suspended' THEN
      INSERT INTO public.notifications (user_id, type, title, body, target_type, target_id)
      VALUES (NEW.user_id, 'supplier_suspended', 'Akkauntingiz vaqtincha to''xtatildi', COALESCE(NULLIF(NEW.rejection_reason,''), NEW.company_name), 'supplier_profile', NEW.id::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_handle_supplier_verification_change ON public.supplier_profiles;
CREATE TRIGGER tr_handle_supplier_verification_change AFTER UPDATE OF verification_status ON public.supplier_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_supplier_verification_change();

-- --- 12.7 b2b_products (Ulgurji mahsulotlar) ---
CREATE TABLE IF NOT EXISTS public.b2b_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand TEXT DEFAULT '',
    category TEXT NOT NULL,        -- categories.id, scope='market' (B2B kategoriyalari)
    description TEXT DEFAULT '',
    sku TEXT DEFAULT '',
    images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    video_url TEXT DEFAULT '',     -- oddiy video fayl URL, mavjud listing-media bucket orqali
    wholesale_price NUMERIC NOT NULL CHECK (wholesale_price >= 0),
    moq INTEGER NOT NULL DEFAULT 1 CHECK (moq >= 1),
    available_qty INTEGER NOT NULL DEFAULT 0 CHECK (available_qty >= 0),
    unit TEXT NOT NULL DEFAULT 'dona',
    packaging TEXT DEFAULT '',
    delivery_available BOOLEAN NOT NULL DEFAULT FALSE,
    delivery_regions TEXT[] DEFAULT ARRAY[]::TEXT[],
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected','inactive')),
    rejection_reason TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- enforce_product_moderation() naqshini takrorlaydi + tasdiqlangan/shartnoma
-- qabul qilgan supplierlargina qo'sha olishini majburlaydi.
CREATE OR REPLACE FUNCTION public.enforce_b2b_product_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_contract_ok BOOLEAN;
BEGIN
  IF NOT public.is_admin() THEN
    IF NOT public.is_own_supplier(NEW.supplier_id) THEN
      RAISE EXCEPTION 'Ruxsat yo''q';
    END IF;
    IF NOT public.is_verified_supplier(NEW.supplier_id) THEN
      RAISE EXCEPTION 'Faqat tasdiqlangan supplierlar mahsulot qo''sha oladi';
    END IF;
    SELECT EXISTS (SELECT 1 FROM public.contracts WHERE supplier_id = NEW.supplier_id AND status = 'accepted') INTO v_contract_ok;
    IF NOT v_contract_ok THEN
      RAISE EXCEPTION 'Avval hamkorlik shartnomasini qabul qiling';
    END IF;
    NEW.status := 'pending';
    NEW.rejection_reason := '';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_enforce_b2b_product_submission ON public.b2b_products;
CREATE TRIGGER tr_enforce_b2b_product_submission BEFORE INSERT ON public.b2b_products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_b2b_product_submission();

-- Supplier o'z mahsulotini tahrirlashi/faolsizlantirishi mumkin, lekin
-- hech qachon o'zini-o'zi tasdiqlay olmaydi.
CREATE OR REPLACE FUNCTION public.protect_b2b_product_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.supplier_id := OLD.supplier_id;
    IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
      NEW.status := 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_protect_b2b_product_status ON public.b2b_products;
CREATE TRIGGER tr_protect_b2b_product_status BEFORE UPDATE ON public.b2b_products
  FOR EACH ROW EXECUTE FUNCTION public.protect_b2b_product_status();

ALTER TABLE public.b2b_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tasdiqlangan B2B mahsulotni barcha ko'radi" ON public.b2b_products;
CREATE POLICY "Tasdiqlangan B2B mahsulotni barcha ko'radi" ON public.b2b_products FOR SELECT USING (
  status = 'approved' OR public.is_own_supplier(supplier_id) OR public.is_admin()
);
DROP POLICY IF EXISTS "Supplier mahsulot qo'shadi" ON public.b2b_products;
CREATE POLICY "Supplier mahsulot qo'shadi" ON public.b2b_products FOR INSERT WITH CHECK (public.is_own_supplier(supplier_id) OR public.is_admin());
DROP POLICY IF EXISTS "Supplier o'z mahsulotini tahrirlaydi" ON public.b2b_products;
CREATE POLICY "Supplier o'z mahsulotini tahrirlaydi" ON public.b2b_products FOR UPDATE USING (public.is_own_supplier(supplier_id) OR public.is_admin());
DROP POLICY IF EXISTS "Supplier o'z mahsulotini o'chiradi" ON public.b2b_products;
CREATE POLICY "Supplier o'z mahsulotini o'chiradi" ON public.b2b_products FOR DELETE USING (public.is_own_supplier(supplier_id) OR public.is_admin());

CREATE INDEX IF NOT EXISTS idx_b2b_products_supplier_id ON public.b2b_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_b2b_products_status_category ON public.b2b_products(status, category);

CREATE OR REPLACE FUNCTION public.notify_on_b2b_product_status_change()
RETURNS TRIGGER AS $$
DECLARE v_user_id UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved','rejected') THEN
    SELECT user_id INTO v_user_id FROM public.supplier_profiles WHERE id = NEW.supplier_id;
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, target_type, target_id)
      VALUES (v_user_id,
        CASE WHEN NEW.status = 'approved' THEN 'b2b_product_approved' ELSE 'b2b_product_rejected' END,
        CASE WHEN NEW.status = 'approved' THEN 'Mahsulotingiz tasdiqlandi' ELSE 'Mahsulotingiz rad etildi' END,
        NEW.name, 'b2b_product', NEW.id::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_on_b2b_product_status_change ON public.b2b_products;
CREATE TRIGGER tr_notify_on_b2b_product_status_change AFTER UPDATE OF status ON public.b2b_products
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_b2b_product_status_change();

-- --- 12.8 b2b_orders + b2b_order_items (Supplier bo'yicha bo'lingan buyurtmalar) ---
CREATE SEQUENCE IF NOT EXISTS public.b2b_order_number_seq START WITH 1;

CREATE TABLE IF NOT EXISTS public.b2b_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL DEFAULT ('ONB-' || LPAD(nextval('public.b2b_order_number_seq')::text, 6, '0')),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
    buyer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    delivery_fee NUMERIC NOT NULL DEFAULT 0,   -- 1-bosqichda doim 0, kelajakdagi tarif dvigateli uchun ustun tayyor
    total NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash','online')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','cash_pending','cash_confirmed','paid','failed')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','supplier_confirmed','preparing','ready','delivering','delivered','cancelled','rejected')),
    rejection_reason TEXT DEFAULT '',
    commission_rate NUMERIC(5,2) NOT NULL,
    commission_amount NUMERIC NOT NULL DEFAULT 0,
    supplier_amount NUMERIC NOT NULL DEFAULT 0,
    delivery_store_name TEXT DEFAULT '',
    delivery_phone TEXT DEFAULT '',
    delivery_region TEXT DEFAULT '',
    delivery_district TEXT DEFAULT '',
    delivery_address TEXT NOT NULL DEFAULT '',
    delivery_note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.b2b_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.b2b_orders(id) ON DELETE CASCADE,
    product_id UUID NULL REFERENCES public.b2b_products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_image TEXT DEFAULT '',
    unit TEXT NOT NULL DEFAULT 'dona',
    unit_price NUMERIC NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 1),
    line_total NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- can_view_b2b_order — b2b_orders yozilgandan KEYIN e'lon qilinadi (jadval mavjud bo'lishi kerak).
CREATE OR REPLACE FUNCTION public.can_view_b2b_order(p_order_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.b2b_orders o
    WHERE o.id = p_order_id AND (o.buyer_user_id = auth.uid() OR public.is_own_supplier(o.supplier_id))
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

-- Moliyaviy/identifikatsiya maydonlari va payment_status endi bu trigger
-- orqali EMAS, GRANT darajasida himoyalanadi (12.14-bo'lim, REVOKE UPDATE) —
-- chunki bu maydonlarga faqat create_b2b_order()/supplier_confirm_cash_payment()
-- RPC'lari ichkaridan yozadi, oddiy klient esa hech qachon emas. Bunday holda
-- "chaqiruvchi ishonchli RPC ichidanmi" degan farqni CURRENT_USER HAM,
-- SESSION_USER HAM to'g'ri ajrata olmaydi (RPC ichida SESSION_USER hamon
-- asl klient bo'lib qoladi) — shuning uchun bu yerda trigger asosidagi
-- tekshiruv o'rniga GRANT'ni ishlatish yagona to'g'ri yechim. Trigger
-- faqat rejection_reason majburiyligini ta'minlab qoladi.
CREATE OR REPLACE FUNCTION public.protect_b2b_order_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'rejected' AND (NEW.rejection_reason IS NULL OR trim(NEW.rejection_reason) = '') THEN
    RAISE EXCEPTION 'Rad etish sababi kiritilishi shart';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_protect_b2b_order_integrity ON public.b2b_orders;
CREATE TRIGGER tr_protect_b2b_order_integrity BEFORE UPDATE ON public.b2b_orders
  FOR EACH ROW EXECUTE FUNCTION public.protect_b2b_order_integrity();

-- Bekor qilinsa zaxira qaytariladi va komissiya bekor qilinadi;
-- yetkazilganda komissiya "settled" bo'ladi.
CREATE OR REPLACE FUNCTION public.handle_b2b_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('rejected','cancelled') THEN
    UPDATE public.b2b_products p SET available_qty = p.available_qty + oi.quantity, updated_at = NOW()
    FROM public.b2b_order_items oi WHERE oi.order_id = NEW.id AND oi.product_id = p.id;
    UPDATE public.commission_ledger SET status = 'voided', updated_at = NOW() WHERE order_id = NEW.id;
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered' THEN
    UPDATE public.commission_ledger SET status = 'settled', updated_at = NOW() WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_handle_b2b_order_status_change ON public.b2b_orders;
CREATE TRIGGER tr_handle_b2b_order_status_change AFTER UPDATE OF status ON public.b2b_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_b2b_order_status_change();

CREATE OR REPLACE FUNCTION public.notify_on_new_b2b_order()
RETURNS TRIGGER AS $$
DECLARE v_supplier_user_id UUID;
BEGIN
  SELECT user_id INTO v_supplier_user_id FROM public.supplier_profiles WHERE id = NEW.supplier_id;
  IF v_supplier_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, target_type, target_id)
    VALUES (v_supplier_user_id, 'b2b_new_order', 'Yangi ulgurji buyurtma', NEW.order_number, 'b2b_order', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_on_new_b2b_order ON public.b2b_orders;
CREATE TRIGGER tr_notify_on_new_b2b_order AFTER INSERT ON public.b2b_orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_b2b_order();

CREATE OR REPLACE FUNCTION public.notify_on_b2b_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, target_type, target_id)
    VALUES (NEW.buyer_user_id, 'b2b_order_status', 'Buyurtma holati yangilandi', NEW.order_number || ' — ' || NEW.status, 'b2b_order', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_on_b2b_order_status_change ON public.b2b_orders;
CREATE TRIGGER tr_notify_on_b2b_order_status_change AFTER UPDATE OF status ON public.b2b_orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_b2b_order_status_change();

-- No INSERT policy on either table — the only writer is create_b2b_order() (12.9).
ALTER TABLE public.b2b_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Xaridor yoki supplier o'z buyurtmasini ko'radi" ON public.b2b_orders;
CREATE POLICY "Xaridor yoki supplier o'z buyurtmasini ko'radi" ON public.b2b_orders FOR SELECT USING (
  buyer_user_id = auth.uid() OR public.is_own_supplier(supplier_id) OR public.is_admin()
);
DROP POLICY IF EXISTS "Supplier yoki admin holatni yangilaydi" ON public.b2b_orders;
CREATE POLICY "Supplier yoki admin holatni yangilaydi" ON public.b2b_orders FOR UPDATE USING (
  public.is_own_supplier(supplier_id) OR public.is_admin()
);
DROP POLICY IF EXISTS "Faqat admin o'chiradi (b2b_orders)" ON public.b2b_orders;
CREATE POLICY "Faqat admin o'chiradi (b2b_orders)" ON public.b2b_orders FOR DELETE USING (public.is_admin());

ALTER TABLE public.b2b_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Buyurtma qatorini tegishli tomon ko'radi" ON public.b2b_order_items;
CREATE POLICY "Buyurtma qatorini tegishli tomon ko'radi" ON public.b2b_order_items FOR SELECT USING (
  public.can_view_b2b_order(order_id) OR public.is_admin()
);
DROP POLICY IF EXISTS "Admin qatorlarni boshqaradi" ON public.b2b_order_items;
CREATE POLICY "Admin qatorlarni boshqaradi" ON public.b2b_order_items FOR ALL USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_b2b_orders_business_id ON public.b2b_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_supplier_id ON public.b2b_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_buyer_user_id ON public.b2b_orders(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_status ON public.b2b_orders(status);
CREATE INDEX IF NOT EXISTS idx_b2b_order_items_order_id ON public.b2b_order_items(order_id);

-- --- 12.9 commission_ledger + atomik checkout RPC ---
CREATE TABLE IF NOT EXISTS public.commission_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID UNIQUE NOT NULL REFERENCES public.b2b_orders(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
    gross_amount NUMERIC NOT NULL,
    commission_rate NUMERIC(5,2) NOT NULL,
    commission_amount NUMERIC NOT NULL,
    supplier_amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash','online')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','settled','voided')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Supplier yoki admin komissiyani ko'radi" ON public.commission_ledger;
CREATE POLICY "Supplier yoki admin komissiyani ko'radi" ON public.commission_ledger FOR SELECT USING (
  public.is_own_supplier(supplier_id) OR public.is_admin()
);
DROP POLICY IF EXISTS "Admin komissiya yozuvini boshqaradi" ON public.commission_ledger;
CREATE POLICY "Admin komissiya yozuvini boshqaradi" ON public.commission_ledger FOR ALL USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_commission_ledger_supplier_id ON public.commission_ledger(supplier_id);

-- Bitta supplier uchun bitta chaqiruv, bitta tranzaksiya: MOQ va zaxirani
-- tekshiradi (FOR UPDATE qulf bilan), buyurtma+qatorlarni yaratadi,
-- komissiyani hisoblab suratga oladi, ledger yozadi. Xato bo'lsa —
-- BUTUN tranzaksiya bekor bo'ladi (boshqa supplierlarga ta'sir qilmaydi,
-- chunki har biri alohida chaqiriladi).
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

GRANT EXECUTE ON FUNCTION public.create_b2b_order(UUID, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;

-- --- 12.10 supplier_settlements (kelajakdagi to'lov-hisob moduli uchun tayyor) ---
CREATE TABLE IF NOT EXISTS public.supplier_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    gross_sales NUMERIC NOT NULL DEFAULT 0,
    total_commission NUMERIC NOT NULL DEFAULT 0,
    net_payable NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
    paid_at TIMESTAMPTZ NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.supplier_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Supplier yoki admin hisob-kitobni ko'radi" ON public.supplier_settlements;
CREATE POLICY "Supplier yoki admin hisob-kitobni ko'radi" ON public.supplier_settlements FOR SELECT USING (
  public.is_own_supplier(supplier_id) OR public.is_admin()
);
DROP POLICY IF EXISTS "Faqat admin boshqaradi (supplier_settlements)" ON public.supplier_settlements;
CREATE POLICY "Faqat admin boshqaradi (supplier_settlements)" ON public.supplier_settlements FOR ALL USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_supplier_settlements_supplier_id ON public.supplier_settlements(supplier_id);

-- --- 12.11 GRANTs ---
GRANT SELECT, INSERT, UPDATE ON public.business_profiles, public.business_addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.supplier_profiles TO authenticated;
GRANT SELECT ON public.supplier_profiles, public.b2b_products TO anon;
GRANT SELECT, UPDATE ON public.contracts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.b2b_products TO authenticated;
GRANT SELECT, UPDATE ON public.b2b_orders TO authenticated;
GRANT SELECT ON public.b2b_order_items, public.commission_ledger, public.supplier_settlements TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='b2b_orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.b2b_orders;
  END IF;
END $$;

-- --- 12.12 B2B kategoriyalari (categories.scope='market' endi B2B'ni anglatadi) ---
INSERT INTO public.categories (id, name, icon, order_index, is_active, scope) VALUES
  ('b2b-food', 'Oziq-ovqat', 'utensils', 1, true, 'market'),
  ('b2b-drinks', 'Ichimliklar', 'cup-soda', 2, true, 'market'),
  ('b2b-household', 'Maishiy', 'home', 3, true, 'market'),
  ('b2b-clothing', 'Kiyim-kechak', 'shirt', 4, true, 'market'),
  ('b2b-pharma', 'Farmatsevtika', 'pill', 5, true, 'market'),
  ('b2b-agro', 'Qishloq xo''jaligi', 'wheat', 6, true, 'market'),
  ('b2b-construction', 'Qurilish', 'hammer', 7, true, 'market'),
  ('b2b-other', 'Boshqa', 'tag', 8, true, 'market')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, order_index = EXCLUDED.order_index, scope = EXCLUDED.scope;

-- --- 12.13 Eski kategoriyalarni B2B'dan ajratish ---
-- Yangi B2B kategoriyalari qo'shilgunga qadar mavjud bo'lgan barcha
-- kategoriyalar (Meva-Sabzavot, G'alla & Don va h.k.) scope='both' (yoki
-- NULL) bilan saqlangan — bu ularni E'lon berish VA B2B Market ikkalasida
-- ham ko'rsatib, ikki bo'lim kategoriyalarini aralashtirib yuborardi.
-- Bu yerda ularni faqat E'lon berishga tegishli qilib belgilaymiz —
-- B2B endi faqat yuqoridagi 'b2b-*' kategoriyalarini ko'radi.
UPDATE public.categories
SET scope = 'post'
WHERE id NOT LIKE 'b2b-%' AND id <> 'all' AND (scope IS NULL OR scope = 'both');

-- --- 12.14 B2B Keshbek hamyoni ---
-- Ilgari bu tizim faqat brauzer localStorage'ida ishlar edi (haqiqiy
-- balans hech qachon serverga yozilmasdi). Endi balans business_profiles
-- ustida, tranzaksiyalar esa alohida jadvalda saqlanadi; balansni faqat
-- quyidagi SECURITY DEFINER funksiyalar o'zgartira oladi — mijoz (client)
-- to'g'ridan-to'g'ri UPDATE orqali o'z-o'ziga keshbek "yoza olmaydi",
-- chunki cashback_balance ustuniga UPDATE huquqi authenticated'dan
-- olib tashlangan (quyida REVOKE).

ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS cashback_balance NUMERIC NOT NULL DEFAULT 0;
REVOKE UPDATE (cashback_balance) ON public.business_profiles FROM authenticated, anon;

ALTER TABLE public.b2b_orders ADD COLUMN IF NOT EXISTS cashback_used NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.b2b_orders ADD COLUMN IF NOT EXISTS cashback_earned NUMERIC NOT NULL DEFAULT 0;
-- payment_status'ni endi faqat supplier_confirm_cash_payment() RPC orqali
-- o'zgartirish mumkin — to'g'ridan-to'g'ri UPDATE orqali emas (aks holda
-- supplier payment_status'ni erkin o'ynatib, cheksiz keshbek "ishlab
-- topishi" yoki cash to'lovni o'zi tasdiqlab qo'yishi mumkin edi).
-- Moliyaviy/identifikatsiya maydonlari ham xuddi shunday — bularni faqat
-- create_b2b_order() RPC yozadi, ilgari protect_b2b_order_integrity
-- trigger'i himoya qilishga urinardi, lekin uning CURRENT_USER tekshiruvi
-- hech qachon ishlamas edi (qarang: 12.9-bo'limdagi izoh). GRANT darajasida
-- taqiqlash — kim chaqirganidan qat'i nazar ishlaydigan yagona ishonchli usul.
REVOKE UPDATE (
  payment_status, cashback_used, cashback_earned,
  business_id, supplier_id, buyer_user_id, order_number,
  subtotal, delivery_fee, total, commission_rate, commission_amount, supplier_amount
) ON public.b2b_orders FROM authenticated, anon;

-- Platforma bo'yicha yagona keshbek foizi va to'lov rekvizitlari
CREATE TABLE IF NOT EXISTS public.b2b_config (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE), -- yagona qatorni kafolatlaydi
    cashback_rate NUMERIC(5,2) NOT NULL DEFAULT 1.5,
    admin_card_number TEXT DEFAULT '8600 4902 1122 3344',
    admin_card_holder TEXT DEFAULT 'ONBOZAR B2B RASMIY HISOBI',
    admin_bank_account TEXT DEFAULT '20208000900012345001',
    admin_bank_mfo TEXT DEFAULT '00444',
    admin_bank_name TEXT DEFAULT 'ATB Kapitalbank Toshkent sh.',
    admin_payment_phone TEXT DEFAULT '+998 90 123 45 67',
    admin_payment_instructions TEXT DEFAULT 'To''lov izohida korxona / do''kon nomini ko''rsating.',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO public.b2b_config (id, cashback_rate) VALUES (TRUE, 1.5) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.b2b_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Hamma o'qiydi (b2b_config)" ON public.b2b_config;
CREATE POLICY "Hamma o'qiydi (b2b_config)" ON public.b2b_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Faqat admin yangilaydi (b2b_config)" ON public.b2b_config;
CREATE POLICY "Faqat admin yangilaydi (b2b_config)" ON public.b2b_config FOR UPDATE USING (public.is_admin());
GRANT SELECT, UPDATE ON public.b2b_config TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.set_b2b_cashback_rate(p_rate NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Faqat admin keshbek foizini o''zgartira oladi';
  END IF;
  IF p_rate < 0 OR p_rate > 100 THEN
    RAISE EXCEPTION 'Foiz 0 dan 100 gacha bo''lishi kerak';
  END IF;
  UPDATE public.b2b_config SET cashback_rate = p_rate, updated_at = NOW() WHERE id = TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_b2b_cashback_rate(NUMERIC) TO authenticated;

CREATE TABLE IF NOT EXISTS public.b2b_cashback_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    order_id UUID NULL REFERENCES public.b2b_orders(id) ON DELETE SET NULL,
    cashback_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    amount NUMERIC NOT NULL, -- musbat: earned/admin_bonus, manfiy: redeemed/withdrawn
    type TEXT NOT NULL CHECK (type IN ('earned','redeemed','withdrawn','admin_bonus')),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','pending','rejected')),
    payout_details TEXT DEFAULT '',
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.b2b_cashback_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Egasi yoki admin tranzaksiyani ko'radi" ON public.b2b_cashback_transactions;
CREATE POLICY "Egasi yoki admin tranzaksiyani ko'radi" ON public.b2b_cashback_transactions FOR SELECT USING (
  public.is_own_business(business_id) OR public.is_admin()
);
-- INSERT/UPDATE huquqi authenticated'ga berilmagan — yozuvchi faqat
-- quyidagi SECURITY DEFINER funksiyalar (b2b_orders bo'limidagi
-- create_b2b_order kabi bir xil naqsh).
CREATE INDEX IF NOT EXISTS idx_b2b_cashback_tx_business_id ON public.b2b_cashback_transactions(business_id);

CREATE OR REPLACE FUNCTION public.request_cashback_withdrawal(p_business_id UUID, p_amount NUMERIC, p_payout_details TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance NUMERIC; v_tx_id UUID;
BEGIN
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
GRANT EXECUTE ON FUNCTION public.request_cashback_withdrawal(UUID, NUMERIC, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_cashback_withdrawal(p_tx_id UUID, p_status TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tx RECORD; v_owner_id UUID;
BEGIN
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
GRANT EXECUTE ON FUNCTION public.admin_update_cashback_withdrawal(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_grant_business_cashback(p_business_id UUID, p_amount NUMERIC, p_description TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tx_id UUID; v_owner_id UUID;
BEGIN
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
GRANT EXECUTE ON FUNCTION public.admin_grant_business_cashback(UUID, NUMERIC, TEXT) TO authenticated;

-- Naqd to'lovni supplier tasdiqlashi + shu buyurtma uchun xaridorga
-- keshbek yozilishi va bildirishnoma yuborilishi BITTA atomik amal
CREATE OR REPLACE FUNCTION public.supplier_confirm_cash_payment(p_order_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order RECORD; v_rate NUMERIC; v_earned NUMERIC;
BEGIN
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
GRANT EXECUTE ON FUNCTION public.supplier_confirm_cash_payment(UUID) TO authenticated;

-- --- 12.15 B2B To'g'ridan-to'g'ri takliflar (B2BStoresMapView → B2BSendOfferModal) ---
-- Ilgari bu ham faqat localStorage'da ishlar edi (jadval hech qachon
-- mavjud bo'lmagan, INSERT doim xatoga uchrab lokal fallback'ga tushardi;
-- o'qish esa Supabase sozlangan/sozlanmaganidan qat'i nazar HAR DOIM
-- faqat localStorage'dan bo'lardi) — ya'ni taklif yuborilsa ham, qabul
-- qiluvchi uni boshqa qurilma/brauzerda hech qachon ko'rmas edi.
CREATE TABLE IF NOT EXISTS public.b2b_direct_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL DEFAULT '',
    discount_percent NUMERIC(5,2) NULL,
    products JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.b2b_direct_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Yuboruvchi yoki qabul qiluvchi ko'radi (b2b_direct_offers)" ON public.b2b_direct_offers;
CREATE POLICY "Yuboruvchi yoki qabul qiluvchi ko'radi (b2b_direct_offers)" ON public.b2b_direct_offers FOR SELECT USING (
  public.is_own_supplier(supplier_id) OR public.is_own_business(business_id) OR public.is_admin()
);
DROP POLICY IF EXISTS "Supplier taklif yuboradi" ON public.b2b_direct_offers;
CREATE POLICY "Supplier taklif yuboradi" ON public.b2b_direct_offers FOR INSERT WITH CHECK (
  public.is_own_supplier(supplier_id)
);
-- Faqat qabul qiluvchi do'kon (yoki admin) holatni (pending→accepted/declined)
-- o'zgartira oladi — taklif matni/mahsulotlarini emas (ular qatorda
-- CHECK/keyingi qadamda cheklanmagan, lekin UI hech qachon boshqa
-- maydonni yubormaydi; qattiqroq himoya kerak bo'lsa keyinchalik RPC'ga
-- o'tkazish mumkin).
DROP POLICY IF EXISTS "Qabul qiluvchi holatni yangilaydi" ON public.b2b_direct_offers;
CREATE POLICY "Qabul qiluvchi holatni yangilaydi" ON public.b2b_direct_offers FOR UPDATE USING (
  public.is_own_business(business_id) OR public.is_admin()
);

CREATE INDEX IF NOT EXISTS idx_b2b_direct_offers_supplier_id ON public.b2b_direct_offers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_b2b_direct_offers_business_id ON public.b2b_direct_offers(business_id);

GRANT SELECT, INSERT, UPDATE ON public.b2b_direct_offers TO authenticated;

-- =====================================================================
-- TUGADI — Supabase SQL Editor'da ishga tushiring!
-- =====================================================================
