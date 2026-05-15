-- ============================================================
--  Bütçe Takip — Yeni Kullanıcı Trigger'ı (Faz 2)
--  Önkoşul: schema.sql ve policies.sql çalıştırılmış olmalı.
-- ============================================================
--
--  auth.users tablosuna yeni bir kayıt eklendiğinde otomatik olarak:
--    1. public.profiles tablosuna profil kaydı
--    2. public.odeme_turleri'ne "Nakit" ve "Kredi Kartı" (is_default=true)
--    3. public.donemler'e içinde bulunulan yılın 12 ayı
--  oluşturulur.
--
--  Fonksiyon SECURITY DEFINER olduğundan RLS'i atlar; search_path
--  boşaltıldığı için tüm nesneler tam nitelikli yazılmıştır.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_yil integer := extract(year from now())::integer;
begin
  -- 1. Profil kaydı (full_name kayıt formundan metadata olarak gelir)
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do nothing;

  -- 2. Varsayılan ödeme türleri — silinemez (is_default = true)
  insert into public.odeme_turleri (user_id, name, is_default)
  values
    (new.id, 'Nakit', true),
    (new.id, 'Kredi Kartı', true);

  -- 3. İçinde bulunulan yılın 12 ayı
  insert into public.donemler (user_id, yil, ay)
  select new.id, current_yil, ay
  from generate_series(1, 12) as ay
  on conflict (user_id, yil, ay) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Yeni kullanıcı için profil, varsayılan ödeme türleri ve 12 dönem oluşturur.';

-- Trigger'ı (yeniden) tanımla
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
