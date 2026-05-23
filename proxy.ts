import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16'da "middleware" kuralının yerini "proxy" aldı.
 * Her istekte Supabase oturumunu yeniler ve route korumasını uygular.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aşağıdakiler dışındaki tüm istek yollarıyla eşleşir:
     * - _next/static (statik dosyalar)
     * - _next/image (görsel optimizasyonu)
     * - favicon.ico
     * - PWA public dosyaları: manifest.webmanifest, sw.js, offline.html
     *   (giriş yapılmadan da erişilebilmeli)
     * - resim uzantılı dosyalar (icons/*.png, *.svg vb.)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
