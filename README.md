# Bütçe Takip

Çoklu kullanıcılı, web tabanlı kişisel bütçe takip uygulaması. Her kullanıcı
kendi gelir, gider, dönem ve bütçe hedeflerini yönetir; dashboard, dinamik
tablolar ve raporlar üzerinden bütçesini izler.

## Teknoloji

- **Next.js (App Router)** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui**
- **Supabase** — PostgreSQL, Auth, Row Level Security
- **TanStack Query** & **TanStack Table**
- **Recharts** — grafikler
- **React Hook Form** + **Zod** — form ve validasyon
- **SheetJS (xlsx)** — Excel içe/dışa aktarma
- **date-fns**, **lucide-react**, **framer-motion**, **sonner**, **next-themes**

Arayüz tamamen **Türkçe**, para birimi **TL** (Türkçe formatı: `43.000,50 ₺`).

## Gereksinimler

- Node.js 20+
- Bir Supabase projesi

## Kurulum

1. Bağımlılıkları yükleyin:

   ```bash
   npm install
   ```

2. Ortam değişkenlerini ayarlayın — `.env.example` dosyasını kopyalayın:

   ```bash
   cp .env.example .env.local
   ```

   Ardından `.env.local` içindeki değerleri Supabase projenizden doldurun.

3. Geliştirme sunucusunu başlatın:

   ```bash
   npm run dev
   ```

   Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışır.

## Ortam Değişkenleri

| Değişken | Açıklama |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL'i |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable (anon) anahtar — `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret (service role) anahtar — `sb_secret_...`, yalnızca sunucu tarafı |

> Anahtarlar Supabase Dashboard > **Project Settings > API Keys** bölümünde
> bulunur. Bu proje yeni API anahtar sistemini (`sb_publishable_` /
> `sb_secret_` ön ekleri) kullanır.

## Supabase Kurulumu

1. [supabase.com](https://supabase.com) üzerinden yeni bir proje oluşturun.
2. **Project Settings > API Keys** bölümünden URL ve anahtarları alıp
   `.env.local` dosyasına yazın.
3. **Authentication > Providers** altında e-posta/şifre girişinin açık
   olduğundan emin olun.
4. Veritabanı kurulumu — Supabase Dashboard'daki **SQL Editor** üzerinden
   `supabase/` klasöründeki dosyaları **bu sırayla** çalıştırın:

   | Sıra | Dosya | Ne yapar |
   | --- | --- | --- |
   | 1 | `supabase/schema.sql` | 10 tabloyu, FK/CHECK/UNIQUE kısıtlarını ve indeksleri oluşturur; her tabloda RLS'i etkinleştirir. |
   | 2 | `supabase/policies.sql` | Her tablo için 4 RLS politikası ekler (SELECT/INSERT/UPDATE/DELETE) — kullanıcı yalnızca kendi verisine erişir. |
   | 3 | `supabase/triggers.sql` | Yeni kullanıcı kaydında profil + varsayılan ödeme türleri + 12 dönem oluşturan trigger'ı kurar. |
   | 4 | `supabase/account.sql` | (İsteğe bağlı) Hesabın tamamen silinmesini sağlayan `delete_own_account` RPC'sini kurar. Çalıştırılmazsa hesap silme yalnızca kullanıcı verisini temizler, auth kaydı kalır. |

   > Sıralama önemlidir: politikalar tablolara, trigger ise tabloların
   > varlığına bağlıdır. Dosyalar idempotent yazılmıştır; gerektiğinde
   > yeniden çalıştırılabilir.

> Not: `.env.local` tanımlı değilken uygulama yine de açılır; route koruması
> yalnızca Supabase değişkenleri ayarlandığında devreye girer.

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Üretim derlemesi |
| `npm run start` | Üretim sunucusu |
| `npm run lint` | ESLint kontrolü |

## Netlify'a Dağıtım

1. Projeyi bir GitHub deposuna gönderin.
2. [Netlify](https://netlify.com) panelinde **Add new site → Import an
   existing project** ile depoyu bağlayın.
3. Build ayarları `netlify.toml` dosyasından otomatik okunur
   (`@netlify/plugin-nextjs` eklentisi Next.js SSR yönlendirmesini yönetir).
4. **Site configuration → Environment variables** altında üç değişkeni
   ekleyin: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`.
5. **Deploy** edin — `netlify.toml` güvenlik başlıklarını (CSP,
   X-Frame-Options vb.) otomatik uygular.
6. Supabase **Authentication → URL Configuration** altında Site URL'i
   Netlify alan adınızla güncelleyin (e-posta doğrulama/sıfırlama
   bağlantılarının doğru yönlenmesi için).

## Klasör Yapısı

```
app/
  (auth)/        Giriş, kayıt, şifre sıfırlama (gradient arkaplan)
  (app)/         Oturum korumalı uygulama (sidebar + header)
components/
  ui/            shadcn/ui bileşenleri
  layout/        Sidebar, header, alt menü, tema seçici
  auth/          Auth ekranı bileşenleri
lib/
  supabase/      Tarayıcı / sunucu / middleware istemcileri
  format.ts      Para, tarih, sayı biçimlendirme
  navigation.ts  Menü yapılandırması
types/
  database.ts    Veritabanı tipleri (schema.sql ile uyumlu)
supabase/
  schema.sql     Tablolar, kısıtlar, indeksler, RLS
  policies.sql   RLS politikaları
  triggers.sql   Yeni kullanıcı trigger'ı
  account.sql    Hesap silme RPC'si (isteğe bağlı)
proxy.ts         Oturum yenileme ve route koruması (Next.js 16 proxy kuralı)
```

## Geliştirme Fazları

| Faz | Kapsam | Durum |
| --- | --- | --- |
| 1 | Temel kurulum, auth ekranları, layout | ✅ |
| 2 | Veri modeli, RLS, trigger'lar | ✅ |
| 3 | Master data CRUD | ✅ |
| 4 | Giderler & Gelirler | ✅ |
| 5 | Dashboard | ✅ |
| 6 | Bütçe hedefleri | ✅ |
| 7 | Tekrarlayan giderler | ✅ |
| 8 | Raporlar (dinamik pivot) | ✅ |
| 9 | Excel içe aktarma | ✅ |
| 10 | Ayarlar | ✅ |
| 11 | Polish & deploy hazırlığı | ✅ |

## Tema

Açık ve koyu mod desteklenir; tercih `localStorage`'da saklanır. Renk paleti
mavi-mor gradient ağırlıklıdır (`#6366F1` → `#8B5CF6`).


