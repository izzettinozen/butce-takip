-- ============================================================
--  Bütçe Takip — Row Level Security Politikaları (Faz 2)
--  Önkoşul: schema.sql çalıştırılmış olmalı.
-- ============================================================
--
--  Her tablo için 4 politika: SELECT / INSERT / UPDATE / DELETE.
--  Kural: kullanıcı yalnızca kendi satırlarına erişir.
--    - profiles      : id = auth.uid()
--    - diğer tablolar : user_id = auth.uid()
--  Tüm politikalar yalnızca "authenticated" rolü içindir.
-- ============================================================

-- ----------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles
  for delete to authenticated
  using (id = (select auth.uid()));

-- ----------------------------------------------------------------
-- gider_turleri
-- ----------------------------------------------------------------
drop policy if exists "gider_turleri_select" on public.gider_turleri;
create policy "gider_turleri_select" on public.gider_turleri
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "gider_turleri_insert" on public.gider_turleri;
create policy "gider_turleri_insert" on public.gider_turleri
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "gider_turleri_update" on public.gider_turleri;
create policy "gider_turleri_update" on public.gider_turleri
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "gider_turleri_delete" on public.gider_turleri;
create policy "gider_turleri_delete" on public.gider_turleri
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------
-- gider_kalemleri
-- ----------------------------------------------------------------
drop policy if exists "gider_kalemleri_select" on public.gider_kalemleri;
create policy "gider_kalemleri_select" on public.gider_kalemleri
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "gider_kalemleri_insert" on public.gider_kalemleri;
create policy "gider_kalemleri_insert" on public.gider_kalemleri
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "gider_kalemleri_update" on public.gider_kalemleri;
create policy "gider_kalemleri_update" on public.gider_kalemleri
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "gider_kalemleri_delete" on public.gider_kalemleri;
create policy "gider_kalemleri_delete" on public.gider_kalemleri
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------
-- gelir_turleri
-- ----------------------------------------------------------------
drop policy if exists "gelir_turleri_select" on public.gelir_turleri;
create policy "gelir_turleri_select" on public.gelir_turleri
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "gelir_turleri_insert" on public.gelir_turleri;
create policy "gelir_turleri_insert" on public.gelir_turleri
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "gelir_turleri_update" on public.gelir_turleri;
create policy "gelir_turleri_update" on public.gelir_turleri
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "gelir_turleri_delete" on public.gelir_turleri;
create policy "gelir_turleri_delete" on public.gelir_turleri
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------
-- odeme_turleri
-- ----------------------------------------------------------------
drop policy if exists "odeme_turleri_select" on public.odeme_turleri;
create policy "odeme_turleri_select" on public.odeme_turleri
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "odeme_turleri_insert" on public.odeme_turleri;
create policy "odeme_turleri_insert" on public.odeme_turleri
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "odeme_turleri_update" on public.odeme_turleri;
create policy "odeme_turleri_update" on public.odeme_turleri
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "odeme_turleri_delete" on public.odeme_turleri;
create policy "odeme_turleri_delete" on public.odeme_turleri
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------
-- donemler
-- ----------------------------------------------------------------
drop policy if exists "donemler_select" on public.donemler;
create policy "donemler_select" on public.donemler
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "donemler_insert" on public.donemler;
create policy "donemler_insert" on public.donemler
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "donemler_update" on public.donemler;
create policy "donemler_update" on public.donemler
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "donemler_delete" on public.donemler;
create policy "donemler_delete" on public.donemler
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------
-- giderler
-- ----------------------------------------------------------------
drop policy if exists "giderler_select" on public.giderler;
create policy "giderler_select" on public.giderler
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "giderler_insert" on public.giderler;
create policy "giderler_insert" on public.giderler
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "giderler_update" on public.giderler;
create policy "giderler_update" on public.giderler
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "giderler_delete" on public.giderler;
create policy "giderler_delete" on public.giderler
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------
-- gelirler
-- ----------------------------------------------------------------
drop policy if exists "gelirler_select" on public.gelirler;
create policy "gelirler_select" on public.gelirler
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "gelirler_insert" on public.gelirler;
create policy "gelirler_insert" on public.gelirler
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "gelirler_update" on public.gelirler;
create policy "gelirler_update" on public.gelirler
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "gelirler_delete" on public.gelirler;
create policy "gelirler_delete" on public.gelirler
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------
-- butce_hedefleri
-- ----------------------------------------------------------------
drop policy if exists "butce_hedefleri_select" on public.butce_hedefleri;
create policy "butce_hedefleri_select" on public.butce_hedefleri
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "butce_hedefleri_insert" on public.butce_hedefleri;
create policy "butce_hedefleri_insert" on public.butce_hedefleri
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "butce_hedefleri_update" on public.butce_hedefleri;
create policy "butce_hedefleri_update" on public.butce_hedefleri
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "butce_hedefleri_delete" on public.butce_hedefleri;
create policy "butce_hedefleri_delete" on public.butce_hedefleri
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------
-- tekrarlayan_giderler
-- ----------------------------------------------------------------
drop policy if exists "tekrarlayan_giderler_select" on public.tekrarlayan_giderler;
create policy "tekrarlayan_giderler_select" on public.tekrarlayan_giderler
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "tekrarlayan_giderler_insert" on public.tekrarlayan_giderler;
create policy "tekrarlayan_giderler_insert" on public.tekrarlayan_giderler
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "tekrarlayan_giderler_update" on public.tekrarlayan_giderler;
create policy "tekrarlayan_giderler_update" on public.tekrarlayan_giderler
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "tekrarlayan_giderler_delete" on public.tekrarlayan_giderler;
create policy "tekrarlayan_giderler_delete" on public.tekrarlayan_giderler
  for delete to authenticated
  using (user_id = (select auth.uid()));
