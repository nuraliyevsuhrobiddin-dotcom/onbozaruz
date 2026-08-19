-- =====================================================================
-- SHOSHILINCH TUZATISH: "infinite recursion detected in policy for
-- relation profiles" xatosi. Buni SQL Editor'da darhol ishga tushiring.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE;

DROP POLICY IF EXISTS "Foydalanuvchi faqat o'z profilini yoki admin barchasini ko'radi" ON public.profiles;
CREATE POLICY "Foydalanuvchi faqat o'z profilini yoki admin barchasini ko'radi" ON public.profiles FOR SELECT USING (
  auth.uid() = id OR public.is_admin()
);

DROP POLICY IF EXISTS "Foydalanuvchi faqat o'z profilini tahrirlay oladi" ON public.profiles;
CREATE POLICY "Foydalanuvchi faqat o'z profilini tahrirlay oladi" ON public.profiles FOR UPDATE USING (
  auth.uid() = id OR public.is_admin()
);

DROP POLICY IF EXISTS "Foydalanuvchi faqat o'z e'lonini tahrirlay oladi" ON public.posts;
CREATE POLICY "Foydalanuvchi faqat o'z e'lonini tahrirlay oladi" ON public.posts FOR UPDATE USING (
  auth.uid() = user_id OR public.is_admin()
);

DROP POLICY IF EXISTS "Foydalanuvchi faqat o'z e'lonini o'chira oladi" ON public.posts;
CREATE POLICY "Foydalanuvchi faqat o'z e'lonini o'chira oladi" ON public.posts FOR DELETE USING (
  auth.uid() = user_id OR public.is_admin()
);

DROP POLICY IF EXISTS "Admin kategoriyalarni boshqaradi" ON public.categories;
CREATE POLICY "Admin kategoriyalarni boshqaradi" ON public.categories FOR ALL USING (
  public.is_admin()
);

DROP POLICY IF EXISTS "Shikoyatlarni admin ko'radi" ON public.reports;
CREATE POLICY "Shikoyatlarni admin ko'radi" ON public.reports FOR SELECT USING (
  public.is_admin()
);

DROP POLICY IF EXISTS "Admin shikoyatni yangilaydi" ON public.reports;
CREATE POLICY "Admin shikoyatni yangilaydi" ON public.reports FOR UPDATE USING (
  public.is_admin()
);

DROP POLICY IF EXISTS "Audit loglarni faqat admin ko'radi" ON public.audit_logs;
CREATE POLICY "Audit loglarni faqat admin ko'radi" ON public.audit_logs FOR SELECT USING (
  public.is_admin()
);

DROP POLICY IF EXISTS "Audit loglarni faqat admin yaratadi" ON public.audit_logs;
CREATE POLICY "Audit loglarni faqat admin yaratadi" ON public.audit_logs FOR INSERT WITH CHECK (
  public.is_admin()
);

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

DROP POLICY IF EXISTS "Buyurtmalarni faqat egasi ko'radi" ON public.orders;
CREATE POLICY "Buyurtmalarni faqat egasi ko'radi" ON public.orders FOR SELECT USING (
  auth.uid() = user_id OR public.is_admin()
);

DROP POLICY IF EXISTS "Admin buyurtma holatini yangilaydi" ON public.orders;
CREATE POLICY "Admin buyurtma holatini yangilaydi" ON public.orders FOR UPDATE USING (
  public.is_admin()
);

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

-- =====================================================================
-- TUGADI
-- =====================================================================
