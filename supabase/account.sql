-- ============================================================
--  Bütçe Takip — Hesap Silme RPC'si (Faz 10)
--  Önkoşul: schema.sql, policies.sql, triggers.sql çalıştırılmış olmalı.
-- ============================================================
--
--  Kullanıcının kendi hesabını kalıcı olarak silmesini sağlar.
--  auth.users satırının silinmesi, profiles (ON DELETE CASCADE) ve
--  ona bağlı tüm uygulama verisini zincirleme temizler.
--
--  Bu dosya isteğe bağlıdır: çalıştırılmazsa uygulama, hesap silme
--  isteğinde kullanıcının tüm verisini siler ancak auth kaydı kalır.
-- ============================================================

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Yalnızca isteği yapan kullanıcının kendi kaydı silinir.
  delete from auth.users where id = auth.uid();
end;
$$;

comment on function public.delete_own_account() is
  'Oturumdaki kullanıcının hesabını ve tüm verisini kalıcı olarak siler.';

-- Yalnızca giriş yapmış kullanıcılar çağırabilir.
revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
