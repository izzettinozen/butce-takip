import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

/** Giriş yapılmadan erişilebilen route ön ekleri. */
const PUBLIC_PATHS = ["/login", "/register", "/reset-password"];

/**
 * Her istekte Supabase oturumunu yeniler ve route koruması uygular.
 * - Oturum yoksa korumalı route'lar `/login`'e yönlendirilir.
 * - Oturum varsa auth sayfaları `/dashboard`'a yönlendirilir.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase ortam değişkenleri henüz tanımlı değilse (kurulum öncesi)
  // route koruması atlanır ki arayüz yine de görüntülenebilsin.
  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // ÖNEMLİ: createServerClient ile getUser() arasına kod eklemeyin.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Oturum yok ve korumalı route'a erişiliyor → login'e yönlendir.
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Oturum var ve auth sayfasındayız → dashboard'a yönlendir.
  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
