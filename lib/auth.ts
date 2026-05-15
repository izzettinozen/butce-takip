import { createClient } from "@/lib/supabase/client";

/**
 * Oturumdaki kullanıcının id'sini döndürür (insert/update işlemlerinde
 * user_id alanını doldurmak için). Yerel oturumdan okunur, ağ isteği yok.
 */
export async function getUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
  }
  return session.user.id;
}
