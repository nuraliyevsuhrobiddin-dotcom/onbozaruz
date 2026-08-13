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

-- Regular user o'ziga is_admin = true berishini taqiqlash triggeri
CREATE OR REPLACE FUNCTION public.protect_profile_admin_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.is_admin IS DISTINCT FROM NEW.is_admin) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    ) AND CURRENT_USER <> 'postgres' THEN
      NEW.is_admin := OLD.is_admin;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Barcha foydalanuvchi profillarini ko'rish mumkin" ON public.profiles;
CREATE POLICY "Barcha foydalanuvchi profillarini ko'rish mumkin" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Foydalanuvchi o'z profilini yaratishi mumkin" ON public.profiles;
CREATE POLICY "Foydalanuvchi o'z profilini yaratishi mumkin" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Foydalanuvchi faqat o'z profilini tahrirlay oladi" ON public.profiles;
CREATE POLICY "Foydalanuvchi faqat o'z profilini tahrirlay oladi" ON public.profiles FOR UPDATE USING (
  auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  )
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "E'lonlarni barcha ko'rishi mumkin" ON public.posts;
CREATE POLICY "E'lonlarni barcha ko'rishi mumkin" ON public.posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Tizimdagi foydalanuvchi e'lon qo'sha oladi" ON public.posts;
CREATE POLICY "Tizimdagi foydalanuvchi e'lon qo'sha oladi" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Foydalanuvchi faqat o'z e'lonini tahrirlay oladi" ON public.posts;
CREATE POLICY "Foydalanuvchi faqat o'z e'lonini tahrirlay oladi" ON public.posts FOR UPDATE USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  )
);
DROP POLICY IF EXISTS "Foydalanuvchi faqat o'z e'lonini o'chira oladi" ON public.posts;
CREATE POLICY "Foydalanuvchi faqat o'z e'lonini o'chira oladi" ON public.posts FOR DELETE USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  )
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Kategoriyalarni barcha ko'radi" ON public.categories;
CREATE POLICY "Kategoriyalarni barcha ko'radi" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin kategoriyalarni boshqaradi" ON public.categories;
CREATE POLICY "Admin kategoriyalarni boshqaradi" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shikoyatlarni admin ko'radi" ON public.reports;
CREATE POLICY "Shikoyatlarni admin ko'radi" ON public.reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
DROP POLICY IF EXISTS "Foydalanuvchi shikoyat qoldirishi mumkin" ON public.reports;
CREATE POLICY "Foydalanuvchi shikoyat qoldirishi mumkin" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Admin shikoyatni yangilaydi" ON public.reports;
CREATE POLICY "Admin shikoyatni yangilaydi" ON public.reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit loglarni faqat admin ko'radi" ON public.audit_logs;
CREATE POLICY "Audit loglarni faqat admin ko'radi" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
DROP POLICY IF EXISTS "Audit loglarni faqat admin yaratadi" ON public.audit_logs;
CREATE POLICY "Audit loglarni faqat admin yaratadi" ON public.audit_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tasdiqlangan mahsulotlarni barcha ko'radi" ON public.products;
CREATE POLICY "Tasdiqlangan mahsulotlarni barcha ko'radi" ON public.products FOR SELECT USING (
  approval_status = 'approved'
  OR auth.uid()::text = submitted_by
  OR seller_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
DROP POLICY IF EXISTS "Mahsulot qo'shish" ON public.products;
CREATE POLICY "Mahsulot qo'shish" ON public.products FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR auth.uid()::text = submitted_by
    OR seller_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Mahsulotni o'chirish yoki yangilash" ON public.products;
CREATE POLICY "Mahsulotni o'chirish yoki yangilash" ON public.products FOR UPDATE USING (
  seller_id = auth.uid() OR auth.uid()::text = submitted_by OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  )
);
DROP POLICY IF EXISTS "Mahsulotni o'chirish" ON public.products;
CREATE POLICY "Mahsulotni o'chirish" ON public.products FOR DELETE USING (
  seller_id = auth.uid() OR auth.uid()::text = submitted_by OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  )
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Buyurtmalarni barcha ko'rishi mumkin" ON public.orders;
DROP POLICY IF EXISTS "Buyurtmalarni faqat egasi ko'radi" ON public.orders;
CREATE POLICY "Buyurtmalarni faqat egasi ko'radi" ON public.orders FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Buyurtma berish" ON public.orders;
CREATE POLICY "Buyurtma berish" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

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

DROP POLICY IF EXISTS "Listing media owner update" ON storage.objects;
CREATE POLICY "Listing media owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-media')
  WITH CHECK (bucket_id = 'listing-media');

DROP POLICY IF EXISTS "Listing media owner delete" ON storage.objects;
CREATE POLICY "Listing media owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'listing-media');

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
-- TUGADI — Supabase SQL Editor'da ishga tushiring!
-- =====================================================================
