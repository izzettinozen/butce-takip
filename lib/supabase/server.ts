import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Sunucu (Server Component, Route Handler, Server Action) tarafında
 * kullanılacak Supabase istemcisi. Next.js 16'da `cookies()` asenkrondur.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component içinden çağrıldığında `set` hata verebilir.
            // Oturum yenileme middleware tarafından yapıldığı için yok sayılır.
          }
        },
      },
    },
  );
}
