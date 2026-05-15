import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Tarayıcı (Client Component) tarafında kullanılacak Supabase istemcisi.
 * Yeni API anahtar sistemiyle uyumludur: NEXT_PUBLIC_SUPABASE_ANON_KEY
 * değeri "sb_publishable_..." biçimindedir.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
