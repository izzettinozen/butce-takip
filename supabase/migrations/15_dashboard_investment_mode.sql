-- ============================================================
--  Faz 15 — Dashboard Yatırım Modu Tercihi
--  profiles tablosuna dashboard_investment_mode kolonu ekler.
--  - 'savings' (varsayılan): yatırım birikim sayılır → Tasarruf Oranı KPI
--  - 'expense': yatırım gider sayılır → Net Birikim KPI
--
--  İdempotent: Yeniden çalıştırılabilir; mevcut veriyi bozmaz.
-- ============================================================

-- 1) Kolonu ekle (varsayılan: savings — mevcut Dashboard davranışı korunur)
alter table public.profiles
  add column if not exists dashboard_investment_mode text not null
    default 'savings';

comment on column public.profiles.dashboard_investment_mode is
  'Dashboard yatırım yorumu. ''savings'' (yatırım=birikim, Tasarruf Oranı) '
  'veya ''expense'' (yatırım=gider, Net Birikim).';

-- 2) CHECK constraint — yalnızca iki değere izin ver (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_dashboard_investment_mode_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_dashboard_investment_mode_check
      check (dashboard_investment_mode in ('savings', 'expense'));
  end if;
end $$;

-- Not: RLS politikaları "id = auth.uid()" şeklindedir, sütun bağımsızdır.
-- Yeni kolon otomatik olarak mevcut SELECT/UPDATE politikalarına dahildir.
-- Mevcut kullanıcılar default değerini (savings) alır → davranış değişmez.
