-- ============================================================
--  Bütçe Takip — Veritabanı Şeması (Faz 2)
--  Çalıştırma sırası: 1) schema.sql  2) policies.sql  3) triggers.sql
-- ============================================================
--
--  Bu dosya tüm tabloları, kısıtları (FK / CHECK / UNIQUE),
--  indeksleri oluşturur ve her tabloda Row Level Security'yi
--  ETKİNLEŞTİRİR. RLS etkin olup policy tanımlı olmadığında tablo
--  "tümünü reddet" durumundadır — bu güvenli varsayılandır.
--  Erişim kuralları policies.sql ile eklenir.
-- ============================================================

-- ----------------------------------------------------------------
-- profiles — auth.users ile birebir eşleşen kullanıcı profili
-- ----------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  created_at timestamptz not null default now()
);
comment on table public.profiles is 'Kullanıcı profilleri (auth.users ile 1-1).';

alter table public.profiles enable row level security;

-- ----------------------------------------------------------------
-- gider_turleri — gider üst kategorileri (örn. Ev Giderleri, Araç)
-- ----------------------------------------------------------------
create table if not exists public.gider_turleri (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);
comment on table public.gider_turleri is 'Gider türleri (üst kategori).';

alter table public.gider_turleri enable row level security;

-- ----------------------------------------------------------------
-- gider_kalemleri — bir gider türüne bağlı alt kalemler
-- ----------------------------------------------------------------
create table if not exists public.gider_kalemleri (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  gider_turu_id uuid not null references public.gider_turleri (id) on delete cascade,
  name          text not null,
  created_at    timestamptz not null default now()
);
comment on table public.gider_kalemleri is 'Gider kalemleri (bir gider türüne bağlı).';

alter table public.gider_kalemleri enable row level security;

-- ----------------------------------------------------------------
-- gelir_turleri — gelir kategorileri (örn. Maaş, Kira Geliri)
-- ----------------------------------------------------------------
create table if not exists public.gelir_turleri (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);
comment on table public.gelir_turleri is 'Gelir türleri.';

alter table public.gelir_turleri enable row level security;

-- ----------------------------------------------------------------
-- odeme_turleri — ödeme yöntemleri (Nakit, Kredi Kartı, ...)
-- is_default=true olan kayıtlar uygulamada silinemez.
-- ----------------------------------------------------------------
create table if not exists public.odeme_turleri (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.odeme_turleri is 'Ödeme türleri. is_default kayıtlar silinemez.';

alter table public.odeme_turleri enable row level security;

-- ----------------------------------------------------------------
-- donemler — ay/yıl dönemleri. Kullanıcı başına (yil, ay) benzersiz.
-- ----------------------------------------------------------------
create table if not exists public.donemler (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  yil        integer not null,
  ay         integer not null check (ay between 1 and 12),
  created_at timestamptz not null default now(),
  constraint donemler_user_yil_ay_unique unique (user_id, yil, ay)
);
comment on table public.donemler is 'Ay/yıl dönemleri.';

alter table public.donemler enable row level security;

-- ----------------------------------------------------------------
-- giderler — gider kayıtları
-- ----------------------------------------------------------------
create table if not exists public.giderler (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  tutar          numeric(15, 2) not null check (tutar > 0),
  gider_turu_id  uuid not null references public.gider_turleri (id),
  gider_kalemi_id uuid not null references public.gider_kalemleri (id),
  odeme_turu_id  uuid not null references public.odeme_turleri (id),
  aciklama       text,
  donem_id       uuid not null references public.donemler (id),
  created_at     timestamptz not null default now()
);
comment on table public.giderler is 'Gider kayıtları.';

alter table public.giderler enable row level security;

-- ----------------------------------------------------------------
-- gelirler — gelir kayıtları
-- ----------------------------------------------------------------
create table if not exists public.gelirler (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  tutar         numeric(15, 2) not null check (tutar > 0),
  gelir_turu_id uuid not null references public.gelir_turleri (id),
  donem_id      uuid not null references public.donemler (id),
  created_at    timestamptz not null default now()
);
comment on table public.gelirler is 'Gelir kayıtları.';

alter table public.gelirler enable row level security;

-- ----------------------------------------------------------------
-- butce_hedefleri — gider türü + dönem bazlı bütçe hedefleri
-- ----------------------------------------------------------------
create table if not exists public.butce_hedefleri (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  gider_turu_id uuid not null references public.gider_turleri (id),
  donem_id      uuid not null references public.donemler (id),
  hedef_tutar   numeric(15, 2) not null check (hedef_tutar > 0),
  created_at    timestamptz not null default now(),
  constraint butce_hedefleri_user_tur_donem_unique
    unique (user_id, gider_turu_id, donem_id)
);
comment on table public.butce_hedefleri is 'Gider türü/dönem bazlı bütçe hedefleri.';

alter table public.butce_hedefleri enable row level security;

-- ----------------------------------------------------------------
-- tekrarlayan_giderler — her ay otomatik oluşturulacak giderler
-- ----------------------------------------------------------------
create table if not exists public.tekrarlayan_giderler (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.profiles (id) on delete cascade,
  tutar                    numeric(15, 2) not null,
  gider_turu_id            uuid not null references public.gider_turleri (id),
  gider_kalemi_id          uuid not null references public.gider_kalemleri (id),
  odeme_turu_id            uuid not null references public.odeme_turleri (id),
  aciklama                 text,
  ayin_gunu                integer not null check (ayin_gunu between 1 and 28),
  aktif                    boolean not null default true,
  son_olusturulan_donem_id uuid references public.donemler (id) on delete set null,
  created_at               timestamptz not null default now()
);
comment on table public.tekrarlayan_giderler is 'Aylık tekrarlayan gider tanımları.';

alter table public.tekrarlayan_giderler enable row level security;

-- ============================================================
--  İndeksler — sorgu performansı (user_id ve FK kolonları)
-- ============================================================
create index if not exists idx_gider_turleri_user        on public.gider_turleri (user_id);

create index if not exists idx_gider_kalemleri_user       on public.gider_kalemleri (user_id);
create index if not exists idx_gider_kalemleri_tur        on public.gider_kalemleri (gider_turu_id);

create index if not exists idx_gelir_turleri_user         on public.gelir_turleri (user_id);

create index if not exists idx_odeme_turleri_user         on public.odeme_turleri (user_id);

create index if not exists idx_donemler_user              on public.donemler (user_id);

create index if not exists idx_giderler_user              on public.giderler (user_id);
create index if not exists idx_giderler_donem             on public.giderler (donem_id);
create index if not exists idx_giderler_tur               on public.giderler (gider_turu_id);
create index if not exists idx_giderler_kalem             on public.giderler (gider_kalemi_id);
create index if not exists idx_giderler_odeme             on public.giderler (odeme_turu_id);

create index if not exists idx_gelirler_user              on public.gelirler (user_id);
create index if not exists idx_gelirler_donem             on public.gelirler (donem_id);
create index if not exists idx_gelirler_tur               on public.gelirler (gelir_turu_id);

create index if not exists idx_butce_hedefleri_user       on public.butce_hedefleri (user_id);
create index if not exists idx_butce_hedefleri_donem      on public.butce_hedefleri (donem_id);
create index if not exists idx_butce_hedefleri_tur        on public.butce_hedefleri (gider_turu_id);

create index if not exists idx_tekrarlayan_giderler_user  on public.tekrarlayan_giderler (user_id);
create index if not exists idx_tekrarlayan_giderler_aktif on public.tekrarlayan_giderler (user_id, aktif);
