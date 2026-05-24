-- ============================================================
--  Faz 14 — Esnek Yatırım/Tasarruf İşareti
--  gider_turleri tablosuna is_investment boolean kolonu ekler.
--  Mevcut "Yatırım" adlı türleri otomatik işaretler.
--
--  İdempotent: Yeniden çalıştırılabilir; mevcut veriyi bozmaz.
-- ============================================================

-- 1) Kolonu ekle (varsa atlar)
alter table public.gider_turleri
  add column if not exists is_investment boolean not null default false;

comment on column public.gider_turleri.is_investment is
  'true ise Dashboard''da birikim/tasarruf olarak sayılır, saf giderden ayrılır.';

-- 2) Geriye dönük veri göçü:
--    Adı "Yatırım" (case-insensitive, trim'li) olan mevcut türleri işaretle.
--    "Yatırım" → lower = "yatırım"; "YATIRIM" → lower = "yatirim".
--    Her iki varyantı da kapsa.
--    AND is_investment = false ⇒ daha önce işaretlenmişlere dokunma (idempotent).
update public.gider_turleri
set is_investment = true
where lower(trim(name)) in ('yatırım', 'yatirim')
  and is_investment = false;

-- Not: RLS politikaları "user_id = auth.uid()" şeklindedir, sütun bağımsızdır.
-- Yeni kolon otomatik olarak mevcut SELECT/UPDATE politikalarına dahildir.
