-- ============================================================
--  Faz 16 — Yatırım Portföyü
--  Üç yeni tablo + index + RLS + fiyat geçmişi trigger'ı.
--
--    1) yatirim_araclari          — dinamik tanımlı yatırım araçları
--    2) yatirim_arac_fiyat_gecmisi — fiyat güncellemelerinin otomatik log'u
--    3) yatirim_islemleri          — alış/satış/çekme kayıtları
--
--  Tüm hesaplar TL. Otomatik fiyat çekme yok (manuel snapshot).
--  Portföy kümülatif — dönem mantığı yoktur.
--
--  İdempotent: Yeniden çalıştırılabilir; mevcut veriyi bozmaz.
--  Çalıştırma: Supabase Dashboard > SQL Editor.
-- ============================================================

-- ----------------------------------------------------------------
-- 1) yatirim_araclari — yatırım araçları (master data)
--    tip = 'birim_bazli'  → birim zorunlu, guncel_fiyat = birim fiyat
--    tip = 'tutar_bazli'  → birim NULL,    guncel_fiyat = toplam değer
-- ----------------------------------------------------------------
create table if not exists public.yatirim_araclari (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  ad           text not null,
  tip          text not null check (tip in ('birim_bazli', 'tutar_bazli')),
  birim        text,
  guncel_fiyat numeric(15, 2) not null,
  aktif        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- birim_bazli ise birim zorunlu, tutar_bazli ise birim NULL olmalı
  constraint yatirim_araclari_birim_check check (
    (tip = 'birim_bazli' and birim is not null)
    or (tip = 'tutar_bazli' and birim is null)
  )
);
comment on table public.yatirim_araclari is
  'Yatırım araçları (Altın, Bitcoin, AAPL vb.). Birim bazlı veya tutar bazlı.';

alter table public.yatirim_araclari enable row level security;

-- Listede aktifleri çekmek için
create index if not exists yatirim_araclari_user_aktif_idx
  on public.yatirim_araclari (user_id, aktif);

-- ----------------------------------------------------------------
-- 2) yatirim_arac_fiyat_gecmisi — fiyat güncellemelerinin log'u
--    Aynı gün birden fazla güncelleme → son değer geçerli (upsert).
--    user_id yok; sahiplik arac_id üzerinden yatirim_araclari'na bağlı.
-- ----------------------------------------------------------------
create table if not exists public.yatirim_arac_fiyat_gecmisi (
  id           uuid primary key default gen_random_uuid(),
  arac_id      uuid not null references public.yatirim_araclari (id) on delete cascade,
  fiyat        numeric(15, 2) not null,
  kayit_tarihi date not null,
  created_at   timestamptz not null default now(),
  constraint yatirim_arac_fiyat_gecmisi_arac_tarih_unique
    unique (arac_id, kayit_tarihi)
);
comment on table public.yatirim_arac_fiyat_gecmisi is
  'Araç fiyat geçmişi (trend grafiği için). Aynı gün son değer geçerli.';

alter table public.yatirim_arac_fiyat_gecmisi enable row level security;

-- Trend grafiği için
create index if not exists yatirim_arac_fiyat_gecmisi_arac_tarih_idx
  on public.yatirim_arac_fiyat_gecmisi (arac_id, kayit_tarihi desc);

-- ----------------------------------------------------------------
-- 3) yatirim_islemleri — alış/satış/çekme kayıtları
--    'cekme' için arac_id NULL olabilir; alis/satis için zorunlu.
-- ----------------------------------------------------------------
create table if not exists public.yatirim_islemleri (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  tarih       date not null,
  tip         text not null check (tip in ('alis', 'satis', 'cekme')),
  arac_id     uuid references public.yatirim_araclari (id),
  birim_fiyat numeric(15, 2),
  adet        numeric(20, 8),
  tutar       numeric(15, 2) not null,
  aciklama    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- alis/satis araç gerektirir; yalnızca cekme'de arac_id NULL olabilir
  constraint yatirim_islemleri_arac_check check (
    tip = 'cekme' or arac_id is not null
  )
);
comment on table public.yatirim_islemleri is
  'Yatırım işlemleri (alış/satış/çekme). Kümülatif, dönem bağımsız.';

alter table public.yatirim_islemleri enable row level security;

-- Liste sıralaması (tarih DESC)
create index if not exists yatirim_islemleri_user_tarih_idx
  on public.yatirim_islemleri (user_id, tarih desc);

-- Araç bazında işlemler
create index if not exists yatirim_islemleri_arac_idx
  on public.yatirim_islemleri (arac_id);

-- ============================================================
--  RLS Politikaları — kullanıcı yalnızca kendi verisine erişir.
--  Politikalar idempotent (drop if exists + create).
-- ============================================================

-- ---- yatirim_araclari (user_id = auth.uid()) ----
drop policy if exists "yatirim_araclari_select" on public.yatirim_araclari;
create policy "yatirim_araclari_select" on public.yatirim_araclari
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "yatirim_araclari_insert" on public.yatirim_araclari;
create policy "yatirim_araclari_insert" on public.yatirim_araclari
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "yatirim_araclari_update" on public.yatirim_araclari;
create policy "yatirim_araclari_update" on public.yatirim_araclari
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "yatirim_araclari_delete" on public.yatirim_araclari;
create policy "yatirim_araclari_delete" on public.yatirim_araclari
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---- yatirim_arac_fiyat_gecmisi (sahiplik arac_id üzerinden) ----
drop policy if exists "yatirim_arac_fiyat_gecmisi_select" on public.yatirim_arac_fiyat_gecmisi;
create policy "yatirim_arac_fiyat_gecmisi_select" on public.yatirim_arac_fiyat_gecmisi
  for select to authenticated
  using (
    exists (
      select 1 from public.yatirim_araclari a
      where a.id = arac_id and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "yatirim_arac_fiyat_gecmisi_insert" on public.yatirim_arac_fiyat_gecmisi;
create policy "yatirim_arac_fiyat_gecmisi_insert" on public.yatirim_arac_fiyat_gecmisi
  for insert to authenticated
  with check (
    exists (
      select 1 from public.yatirim_araclari a
      where a.id = arac_id and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "yatirim_arac_fiyat_gecmisi_update" on public.yatirim_arac_fiyat_gecmisi;
create policy "yatirim_arac_fiyat_gecmisi_update" on public.yatirim_arac_fiyat_gecmisi
  for update to authenticated
  using (
    exists (
      select 1 from public.yatirim_araclari a
      where a.id = arac_id and a.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.yatirim_araclari a
      where a.id = arac_id and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "yatirim_arac_fiyat_gecmisi_delete" on public.yatirim_arac_fiyat_gecmisi;
create policy "yatirim_arac_fiyat_gecmisi_delete" on public.yatirim_arac_fiyat_gecmisi
  for delete to authenticated
  using (
    exists (
      select 1 from public.yatirim_araclari a
      where a.id = arac_id and a.user_id = (select auth.uid())
    )
  );

-- ---- yatirim_islemleri (user_id = auth.uid()) ----
drop policy if exists "yatirim_islemleri_select" on public.yatirim_islemleri;
create policy "yatirim_islemleri_select" on public.yatirim_islemleri
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "yatirim_islemleri_insert" on public.yatirim_islemleri;
create policy "yatirim_islemleri_insert" on public.yatirim_islemleri
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "yatirim_islemleri_update" on public.yatirim_islemleri;
create policy "yatirim_islemleri_update" on public.yatirim_islemleri
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "yatirim_islemleri_delete" on public.yatirim_islemleri;
create policy "yatirim_islemleri_delete" on public.yatirim_islemleri
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ============================================================
--  Trigger'lar
-- ============================================================

-- ---- updated_at otomatik güncelleme ----
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
comment on function public.set_updated_at() is
  'BEFORE UPDATE: updated_at sütununu now() ile günceller.';

drop trigger if exists set_updated_at on public.yatirim_araclari;
create trigger set_updated_at
  before update on public.yatirim_araclari
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.yatirim_islemleri;
create trigger set_updated_at
  before update on public.yatirim_islemleri
  for each row execute function public.set_updated_at();

-- ---- Fiyat geçmişi otomatik log ----
--  Araç oluşturulduğunda ilk fiyat log'a yazılır.
--  guncel_fiyat güncellendiğinde aynı gün son değer olacak şekilde upsert.
--  SECURITY DEFINER: RLS'i atlar (yazılan satır zaten kullanıcının aracına ait).
create or replace function public.log_yatirim_arac_fiyat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- UPDATE'te yalnızca fiyat gerçekten değiştiyse logla
  if tg_op = 'UPDATE' and new.guncel_fiyat is not distinct from old.guncel_fiyat then
    return new;
  end if;

  insert into public.yatirim_arac_fiyat_gecmisi (arac_id, fiyat, kayit_tarihi)
  values (new.id, new.guncel_fiyat, current_date)
  on conflict (arac_id, kayit_tarihi)
  do update set fiyat = excluded.fiyat;

  return new;
end;
$$;
comment on function public.log_yatirim_arac_fiyat() is
  'Araç eklenince/fiyatı değişince yatirim_arac_fiyat_gecmisi''ne upsert (aynı gün son değer).';

drop trigger if exists log_yatirim_arac_fiyat on public.yatirim_araclari;
create trigger log_yatirim_arac_fiyat
  after insert or update of guncel_fiyat on public.yatirim_araclari
  for each row execute function public.log_yatirim_arac_fiyat();
