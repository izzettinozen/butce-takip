-- ============================================================
--  Faz 15b — Eksik Profil Satırlarını Doldur (isteğe bağlı)
--
--  Bazı auth.users kayıtları için public.profiles satırı eksik olabilir
--  (handle_new_user trigger'ı eski dönemde atlanmış olabilir).
--  Bu migration eksik profilleri otomatik oluşturur.
--
--  Çalıştırılması zorunlu DEĞİLDİR — uygulama tarafı UPSERT kullanır
--  ve eksik satırları kayıt anında oluşturur. Yine de toplu temizlik
--  için elinizde olsun.
--
--  Sadece Supabase SQL Editor'da çalıştırılır (auth schema'ya erişim
--  için yüksek yetki gerekir).
-- ============================================================

insert into public.profiles (id, email, full_name)
select
  u.id,
  u.email,
  u.raw_user_meta_data ->> 'full_name'
from auth.users u
where u.email is not null
  and not exists (
    select 1 from public.profiles p where p.id = u.id
  );

-- Doğrulama (orphan kalmadıysa sıfır satır döner):
-- select count(*) as orphan_sayisi
-- from auth.users u
-- where u.email is not null
--   and not exists (select 1 from public.profiles p where p.id = u.id);
