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

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS features TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS approval_status approval_status_type DEFAULT 'approved';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source product_source_type DEFAULT 'admin';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS submitted_by TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    ) AND CURRENT_USER <> 'postgres' THEN
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
-- TUGADI — Supabase SQL Editor'da ishga tushiring!
-- =====================================================================
