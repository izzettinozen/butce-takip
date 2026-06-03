# Faz 16 — Yatırım Portföyü PRD

## Genel Bakış

Faz 16, kullanıcının yatırım takibini detaylandırır. Mevcut Faz 12 yapısının üzerine **portföy katmanı** ekler:

- **Faz 12 (mevcut):** Yatırım = bir gider türü, aylık toplamı Dashboard'da görünür
- **Faz 16 (yeni):** Bu yatırıma giden paranın hangi araçlara dağıldığı, güncel değeri ve performansı takip edilir

Faz 16 üç alt faza bölünmüştür:
- **16a:** Altyapı + Yatırım Araçları sayfası
- **16b:** Yatırım İşlemleri sayfası + Bekleyen Nakit mantığı
- **16c:** Yatırım Portföyü sayfası (görselleştirme)

---

## Tasarım Felsefesi

### Üç Katmanlı Model

1. **Yatırım Havuzu** (Faz 12'den gelen) — Yatırıma ayrılan toplam tutar
2. **Yatırım Araçları** (Faz 16 yeni) — Kullanıcının dinamik tanımladığı varlık türleri
3. **Yatırım İşlemleri** (Faz 16 yeni) — Her bir alım/satım/çekme kaydı

Havuzdan araçlara dağılım = **Bekleyen Nakit** kavramı.

### Temel Kabuller

- Tüm para hesapları **TL** üzerinden yapılır (çoklu para birimi desteği yok)
- Otomatik fiyat çekme yok, kullanıcı manuel günceller (snapshot model)
- Yatırım Portföyü **kümülatif** (tüm zaman), aylık dönem mantığı yok
- Yatırım davranışı düzensiz olabilir (fırsata göre alım)

### Mod Bağımlı Davranış

Faz 15'te tanımlanan `dashboard_investment_mode` Faz 16'da **genişler**:

| Özellik | Tasarruf Modu | Gider Modu |
|---|---|---|
| Dashboard KPI | Tasarruf Oranı | Net Birikim |
| Bekleyen Nakit kaynağı | (Gelir − Saf Gider) | Yatırım türü gider toplamı |
| Felsefe | Her kalan yatırıma gider | Sadece bilinçli ayırma yatırım |

---

## Veri Modeli

### Tablo 1: `yatirim_araclari`

Kullanıcının dinamik tanımladığı yatırım araçları (master data).

```
id              uuid (PK)
user_id         uuid (FK auth.users)
ad              text NOT NULL              -- "Altın", "Bitcoin", "AAPL" vb.
tip             text NOT NULL              -- 'birim_bazli' | 'tutar_bazli'
birim           text                       -- "gram", "USD", "adet" (birim_bazli için)
guncel_fiyat    numeric(15,2) NOT NULL     -- birim_bazli: birim fiyat, tutar_bazli: toplam değer
aktif           boolean NOT NULL DEFAULT true
created_at      timestamptz NOT NULL DEFAULT now()
updated_at      timestamptz NOT NULL DEFAULT now()
```

**Kısıtlamalar:**
- `tip` enum gibi davranır: CHECK constraint
- `birim_bazli` ise `birim` zorunlu, `tutar_bazli` ise NULL
- RLS: kullanıcı sadece kendi araçlarını görür

**Index:**
- `(user_id, aktif)` — listede aktifleri çekmek için

### Tablo 2: `yatirim_arac_fiyat_gecmisi`

Fiyat güncellemelerinin otomatik log'u (trend grafiği için).

```
id              uuid (PK)
arac_id         uuid NOT NULL (FK yatirim_araclari ON DELETE CASCADE)
fiyat           numeric(15,2) NOT NULL
kayit_tarihi    date NOT NULL
created_at      timestamptz NOT NULL DEFAULT now()

UNIQUE(arac_id, kayit_tarihi)
```

**Davranış:**
- Aynı gün içinde birden fazla güncelleme → son değer geçerli (upsert)
- Araç oluşturulduğunda ilk fiyat otomatik buraya da yazılır
- RLS: arac_id üzerinden user_id kontrolü

**Index:**
- `(arac_id, kayit_tarihi DESC)` — trend grafiği için

### Tablo 3: `yatirim_islemleri`

Tüm alım/satım/çekme işlemleri.

```
id              uuid (PK)
user_id         uuid (FK auth.users)
tarih           date NOT NULL
tip             text NOT NULL              -- 'alis' | 'satis' | 'cekme'
arac_id         uuid (FK yatirim_araclari) -- 'cekme' için NULL
birim_fiyat     numeric(15,2)              -- nullable
adet            numeric(20,8)              -- nullable, 8 ondalık (kripto için)
tutar           numeric(15,2) NOT NULL     -- TL, zorunlu
aciklama        text
created_at      timestamptz NOT NULL DEFAULT now()
updated_at      timestamptz NOT NULL DEFAULT now()
```

**Kısıtlamalar:**
- `tip` CHECK constraint ('alis' | 'satis' | 'cekme')
- `cekme` ise `arac_id` NULL olabilir
- RLS: kullanıcı sadece kendi işlemlerini görür

**Index:**
- `(user_id, tarih DESC)` — liste sıralama
- `(arac_id)` — araç bazında işlemler

### Trigger — Fiyat Geçmişi Otomatik Log

`yatirim_araclari.guncel_fiyat` güncellendiğinde otomatik olarak `yatirim_arac_fiyat_gecmisi`'ne kayıt düşer (upsert, aynı gün son değer).

Araç oluşturulduğunda da ilk fiyat otomatik log'a yazılır.

### Migration Stratejisi

**Tek migration dosyası:** `supabase/migrations/16_yatirim_portfoy.sql`

İçerik:
1. Üç tablo CREATE
2. CHECK constraint'ler
3. Index'ler
4. RLS politikaları
5. Trigger fonksiyonu + trigger

---

## Sayfa 1: Yatırım Araçları (`/yatirim-araclari`)

Master data CRUD. Yatırım İşlemleri burada tanımlanan araçları kullanır.

### Liste Görünümü

**Masaüstü tablo (7 sütun):**

| Ad | Tip | Birim | Güncel Birim Fiyat | Güncel Toplam Değer | Aktif | İşlemler |
|---|---|---|---|---|---|---|

- **Tip:** Badge — "Birim bazlı" / "Tutar bazlı"
- **Birim:** tutar bazlı için "—"
- **Güncel Birim Fiyat:** tutar bazlı için "—"
- **Güncel Toplam Değer:** o ana kadar net miktar × güncel fiyat (birim bazlı) veya direkt güncel fiyat (tutar bazlı)
- **Aktif:** Toggle (pasifleştirme)
- **İşlemler:** Hızlı "Fiyat Güncelle" + Düzenle + Sil butonları

**Mobil:** Aynı tablo, yatay scroll (Giderler sayfasındaki gibi).

**Varsayılan görünüm:** Sadece aktifler. Üstte "Pasifleri göster" toggle var.

**Sıralama:** Ada göre alfabetik (Türkçe locale).

### Boş Durum

Hiç araç yoksa:
- Mesaj: "Henüz yatırım aracı eklemediniz"
- Açıklama: "Altın, döviz, kripto, hisse gibi yatırım araçlarınızı ekleyerek başlayın"
- Buton: "+ Yeni Yatırım Aracı"

### Yeni Araç Formu (Modal)

```
Yeni Yatırım Aracı

Ad:             [____]              (örn: Altın, Bitcoin, AAPL)
Tip:            ○ Birim bazlı  ○ Tutar bazlı

[Birim bazlı seçilirse]
Birim:                 [____]       (serbest metin: gram, USD, adet)
Güncel Birim Fiyat:    [____] TL

[Tutar bazlı seçilirse]
Güncel Toplam Değer:   [____] TL

[Kaydet] [İptal]
```

### Düzenleme Kısıtları

**Yeni araç (hiç işlem yok):** Tüm alanlar düzenlenebilir.

**İşlemi olan araç:** Sadece **Ad** ve **Güncel Fiyat** düzenlenebilir. **Tip** ve **Birim** kilitli (veri bütünlüğü).

### Hızlı Fiyat Güncelleme

Her satırda "Fiyat Güncelle" butonu (kalem ikonu). Tıklanınca **inline input** açılır, sadece güncel fiyat değiştirilir. Hızlı toplu güncelleme için kritik (ay sonu rutini).

### Silme / Pasifleştirme

- **İşlem yoksa:** Tam silme (cascade)
- **İşlem varsa:** Tam silme yapılamaz, pasifleştirme önerilir (toast mesajı)
- **Pasifleştirme zamanı kontrolü:** Eğer net miktar > 0 ise pasifleştirilemez. "Önce satış veya çekme yapın" hatası.

### Pasif Araçlar

- Listede varsayılan görünmez, "Pasifleri göster" toggle ile açılır
- Pasif satırlar gri renkte
- Yeni işlem formundaki araç dropdown'unda **görünmez**
- Geçmiş işlemler listesinde görünür (geçmiş veridir)
- Portföyde miktar varsa dahil edilir (uyarı kutusu ile)

---

## Sayfa 2: Yatırım İşlemleri (`/yatirim-islemleri`)

Tüm alış/satış/çekme işlemlerinin listesi.

### Liste Görünümü

**Masaüstü tablo:**

| Tarih | Tip | Araç | Miktar | Birim Fiyat | Tutar | Açıklama | İşlemler |
|---|---|---|---|---|---|---|---|

- **Tip:** Renkli badge — Alış (yeşil) / Satış (kırmızı) / Çekme (gri)
- **Araç:** Çekme için "—"
- **Miktar / Birim Fiyat:** Tutar bazlı araçlar veya direkt tutar girilen işlemler için "—"
- **İşlemler:** Düzenle / Sil

**Mobil:** Aynı tablo, yatay scroll.

**Varsayılan sıralama:** Tarih DESC (yeniden eskiye).

**Dönem seçici YOK** (Dashboard'daki gibi). Yatırım işlemleri kümülatif.

### Filtreler (Sayfa üstünde)

- **Tarih aralığı:** Başlangıç + bitiş datepicker'ları (opsiyonel)
- **İşlem tipi:** Dropdown (Hepsi / Alış / Satış / Çekme)
- **Araç:** Dropdown (Hepsi / aktif araçların listesi)

Filtre uygulanmamışsa tüm işlemler listelenir.

### Boş Durum

**Araç yoksa:**
- Mesaj: "Önce bir yatırım aracı oluşturmalısınız"
- Buton: "Yatırım Aracı Ekle" → /yatirim-araclari

**Araç var ama işlem yok:**
- Mesaj: "Henüz işlem kaydı yok"
- Buton: "+ Yeni Yatırım İşlemi"

### Yeni İşlem Formu (Modal)

```
Yeni Yatırım İşlemi

Tarih:          [____]
İşlem Tipi:     ○ Alış  ○ Satış  ○ Çekme

[Alış/Satış için]
Araç:           [Dropdown ▼]       (aktif araçlar)

Tutar Girişi:
  ○ Birim Fiyat × Adet
     Birim Fiyat: [____]
     Adet:        [____]
     Tutar (hesaplanan): ____
  ○ Direkt Tutar
     Tutar: [____]

[Çekme için]
Tutar: [____]

Açıklama (opsiyonel): [_______________]

[Kaydet] [İptal]
```

### İşlem Davranışları

| Tip | Bekleyen Nakit | Araç Net Miktar | Araç Bağlantısı |
|---|---|---|---|
| Alış | − tutar | + adet (veya tutar) | Zorunlu |
| Satış | + tutar | − adet (veya tutar) | Zorunlu |
| Çekme | − tutar | Değişmez | NULL (yok) |

### Silme

- Onay popup ile silinir ("Bu işlemi silmek istediğinizden emin misiniz?")
- Silme serbest, mantıksal tutarsızlık olursa Portföy sayfasında uyarı görünür

### Düzenleme

Tüm alanlar düzenlenebilir (tarih, tutar, miktar, açıklama).

### Geçmiş Tarihli İşlem

Serbest, herhangi bir tarih girilebilir. Kullanıcı geriye dönük kayıt ekleyebilir.

---

## Sayfa 3: Yatırım Portföyü (`/yatirim-portfoyu`)

Mini dashboard — yatırım durumunun özet sayfası.

### Sayfa Yapısı

```
[Üst başlık] Yatırım Portföyü
"Tüm zamanlardaki yatırımlarınız özet halinde gösteriliyor."

[5 KPI Kartı — yatay sıra]
[Toplam Yatırılan] [Mevcut Değer] [Kâr/Zarar TL] [Kâr/Zarar %] [Bekleyen Nakit]

[Tutarsızlık varsa uyarı kutusu]

[2 grafik yan yana]
Pasta: Araç Dağılımı     |  Çizgi: Portföy Trendi
(güncel değere göre)     |  ([1A] [6A] [1Y] [Tümü ▼] butonları)

[Detaylı tablo]
Her araç için tek satır
```

### KPI Tanımları

**1. Toplam Yatırılan**
```
Net Yatırım = (Tüm Alışlar - Tüm Satışlar - Tüm Çekmeler)
```
Şu an yatırımda olan net tutar.

**2. Mevcut Değer**
```
Her araç için:
  Birim bazlı: net_miktar × guncel_birim_fiyat
  Tutar bazlı: guncel_toplam_deger
Toplam: tüm araçların güncel değerleri toplamı
```

**3. Kâr/Zarar TL**
```
Mevcut Değer − Toplam Yatırılan
```

**4. Kâr/Zarar %**
```
(Kâr/Zarar TL / Toplam Yatırılan) × 100
```

**5. Bekleyen Nakit** (moda göre)

**Tasarruf modunda:**
```
Bekleyen Nakit = (Toplam Gelir − Toplam Saf Gider) 
               − (Alış toplam) 
               + (Satış toplam) 
               − (Çekme toplam)
```

**Gider modunda:**
```
Bekleyen Nakit = (Yatırım gider türü toplam) 
               − (Alış toplam) 
               + (Satış toplam) 
               − (Çekme toplam)
```

Negatif değerse olduğu gibi gösterilir + uyarı kutusu.

### Pasta Grafik

- **Veri:** Her aracın **güncel değerine** göre yüzde dağılımı
- **Bekleyen Nakit** ayrı dilim olarak görünür
- **Küçük dilimler:** %3 altındakiler "Diğer" diliminde toplanır
- **Pasif araçlar:** Düz "Altın" gibi gösterilir (parantez yok)

### Çizgi Grafik (Portföy Trendi)

- **Y ekseni:** Portföy toplam değeri (TL)
- **X ekseni:** Zaman
- **Noktalar:** Sadece fiyat güncellemesi olan tarihler (kullanıcı seçimiyle)
- **Aralık seçici butonları:** [1A] [6A] [1Y] [Tümü]
- **Varsayılan:** Son 1 yıl
- **Downsampling:** Her aralıkta max ~50-60 nokta gösterilir
  - 1A → günlük
  - 6A → haftalık
  - 1Y → aylık (max 12)
  - Tümü → çeyreklik veya yıllık

### Detaylı Tablo

**Masaüstü 5 sütun:**

| Ad | Toplam Maliyet | Güncel Değer | Kâr/Zarar TL | Kâr/Zarar % |
|---|---|---|---|---|

- **Toplam Maliyet:** o araca yapılan net yatırım
- **Güncel Değer:** net miktar × güncel fiyat
- **Kâr/Zarar TL:** Güncel Değer − Toplam Maliyet
- **Kâr/Zarar %:** yüzde

**Tutar bazlı araçlar için:** Sütunlar aynı, sadece "Adet/Miktar" sütunu olmadığı için kayıp yok.

**Mobil:** Aynı tablo, yatay scroll.

**Varsayılan sıralama:** Güncel Değere göre büyükten küçüğe.

**Tıklama davranışı:** Bir satıra tıklayınca `/yatirim-islemleri?arac=<arac_id>` filtresine yönlendirilir.

### Tutarsızlık Uyarı Kutusu

KPI'ların altında, grafiklerin üstünde. Sadece şu durumlarda görünür:

**Negatif miktar tespit edildi:**
```
⚠ Tutarsızlık Tespit Edildi
Bazı araçlarda satılan miktar alınan miktardan fazla. 
İşlem geçmişinizi kontrol edin.
```

**Negatif bekleyen nakit:**
```
⚠ Bekleyen Nakit Negatif
Yatırım araçlarına yatırılan tutar, havuzunuzdaki tutardan fazla. 
Yatırım gider kayıtlarınızı veya işlemlerinizi kontrol edin.
```

**Pasif araçta bakiye varsa:** D seçildi (pasifleştirme engelli), bu durum oluşmamalı. Yine de güvenlik için kontrol kalabilir.

### Boş Durum

Hiç araç yoksa:
- Mesaj: "Yatırım takibine başlayın"
- Buton: "İlk Yatırım Aracını Ekle" → /yatirim-araclari

### Filtre

**Tarih filtresi YOK** — sayfa her zaman güncel/kümülatif görüntü gösterir. (İleride eklenebilir.)

---

## Faz 15 Entegrasyonu (Bekleyen Nakit Mod Bağımlılığı)

### Migration Yok

Faz 15'te `dashboard_investment_mode` kolonu zaten eklendi. Faz 16'da **yeni migration yok**, sadece kod değişikliği.

### Kod Değişiklikleri

**Bekleyen Nakit Helper Fonksiyonu:**

```typescript
async function getBekleyenNakit(userId: string, mode: 'savings' | 'expense') {
  if (mode === 'savings') {
    // (Tüm Gelir - Tüm Saf Gider) - Yatırım Alış + Yatırım Satış - Yatırım Çekme
  } else {
    // (Yatırım gider türü toplamı) - Yatırım Alış + Yatırım Satış - Yatırım Çekme
  }
}
```

### Ayarlar Sayfası Açıklayıcı Metin Güncellemesi

**Tasarruf Modu (Önerilen):**
> "Yatırım = birikim. Bekleyen nakit hesabı: Gelir − Saf Gider üzerinden hesaplanır. Ay sonu kalan bakiye de yatırım havuzunuzda sayılır."

**Gider Modu:**
> "Yatırım = gider. Bekleyen nakit hesabı: Sadece 'Yatırım' işaretli gider türlerinden hesaplanır. Ay sonu kalan bakiye harcanabilir kabul edilir."

### Mod Değiştirme Davranışı

- Mod değişince Dashboard KPI'sı + Portföy sayfası Bekleyen Nakit KPI'sı yeniden hesaplanır
- Bilgilendirici toast: "Bekleyen nakit hesaplaması güncellendi"
- Onay popup yok, akış kesintisiz

---

## Navigasyon Güncellemeleri

### Masaüstü Sidebar

Yeni sıralama:

```
GENEL
  Dashboard
  Giderler
  Gelirler
  Raporlar

TANIMLAR
  Gider Türleri
  Gider Kalemleri
  Gelir Türleri
  Ödeme Türleri
  Dönemler

YATIRIM             ← yeni grup
  Yatırım Portföyü
  Yatırım İşlemleri
  Yatırım Araçları

PLANLAMA
  Bütçe Hedefleri
  Tekrarlayan Giderler

Ayarlar (en altta)
```

### Mobil Alt Çubuk (5 sekme)

```
Dashboard | Giderler | Gelirler | Yatırım | Menü
```

- "Yatırım" sekmesi tıklanınca **Yatırım Portföyü** sayfası açılır
- "Raporlar" alt çubuktan kaldırıldı, Menü'ye taşındı

### Mobil Bottom Sheet (Menü)

```
GENEL
  Raporlar

YATIRIM
  Yatırım İşlemleri
  Yatırım Araçları
  (Portföy zaten alt çubukta)

TANIMLAR
  Gider Türleri
  Gider Kalemleri
  Gelir Türleri
  Ödeme Türleri
  Dönemler

PLANLAMA
  Bütçe Hedefleri
  Tekrarlayan Giderler

DİĞER
  Ayarlar
```

---

## Geliştirme Planı — 3 Alt Faz

### Faz 16a: Altyapı + Yatırım Araçları

**Kapsam:**
- Migration: 3 tablo + index + RLS + trigger
- `/yatirim-araclari` sayfası (CRUD + inline fiyat güncelleme + aktif/pasif toggle + pasifleri göster)
- Masaüstü sidebar güncellemesi (YATIRIM grubu eklenir)
- Mobil bottom sheet güncellemesi (YATIRIM bölümü eklenir, ama Araçlar görünür)
- Boş durum ekranı (araç yok)

**Test edilebilir:**
- Yeni araç ekle (birim bazlı + tutar bazlı)
- Fiyat güncelle (inline)
- Düzenle (kısıtlı/kısıtsız)
- Sil / pasifleştir
- Fiyat geçmişi trigger'ı çalışıyor mu

**Henüz YOK:** İşlemler sayfası, Portföy sayfası, alt çubukta Yatırım sekmesi, Bekleyen Nakit hesaplamaları.

### Faz 16b: Yatırım İşlemleri + Bekleyen Nakit

**Kapsam:**
- `/yatirim-islemleri` sayfası (CRUD + filtreler: tarih, tip, araç)
- Bekleyen Nakit helper fonksiyonu (moda göre)
- Faz 15 ayarlar sayfası açıklayıcı metinleri güncelleme
- Boş durum ekranları (araç yok / işlem yok)
- Yeni işlem formu (3 tip: alış/satış/çekme, hibrit tutar girişi)

**Test edilebilir:**
- Alış işlemi gir → bekleyen nakit düşer
- Satış işlemi gir → bekleyen nakit artar
- Çekme işlemi gir → bekleyen nakit düşer
- Mod değiştir → bekleyen nakit yeniden hesaplanır
- Filtreler çalışıyor mu
- Geçmiş tarihli işlem girilebiliyor mu

**Henüz YOK:** Portföy sayfası, alt çubukta Yatırım sekmesi (hâlâ Menü üzerinden gidilir).

### Faz 16c: Portföy Görselleştirme

**Kapsam:**
- `/yatirim-portfoyu` sayfası
- 5 KPI kartı
- Pasta grafik (araç dağılımı, %3 altında Diğer)
- Çizgi grafik (portföy trendi, aralık seçici, downsampling)
- Detaylı tablo (5 sütun, tıklama → işlemler filtre)
- Tutarsızlık uyarı kutuları (negatif miktar, negatif bekleyen nakit)
- Mobil alt çubuk güncellemesi (Yatırım sekmesi → Portföy açılır)
- Bottom sheet güncellemesi (Raporlar GENEL'e taşınır)
- Boş durum ekranı (araç yok)

**Test edilebilir:**
- KPI'lar doğru hesaplanıyor mu (her iki modda)
- Pasta grafik dağılımı doğru mu
- Trend grafiği farklı aralıklarda okunabilir mi
- Tablo sıralaması ve tıklama davranışı
- Boş durum + uyarı kutuları

---

## Açık Konular (Faz 16 Sonrası)

Bu maddeler Faz 16 kapsamında değildir, ileride değerlendirilebilir:

- **Otomatik fiyat çekme:** Altın, USD/TL gibi belirli araçlar için API entegrasyonu (Faz 21?)
- **Toplu fiyat güncelleme:** Tüm araçların fiyatlarını tek formda güncelleme (Faz 16.1?)
- **Tarih filtresi:** Portföy sayfasında "geçmişte ne durumdaydım" sorgusu (Faz 16.2?)
- **Yatırım hedefleri:** "Şu kadar gram altın hedeflemiştim, %80'indeyim" gibi takip (Faz 22?)
- **Yatırım raporları:** Yıllık özet, vergi raporu, performans karşılaştırma (Faz 23?)
- **Çoklu para birimi:** USD/EUR araçlarda direkt yabancı para girişi (Faz 24?)

---

## Tasarım Kararları Özeti (Hızlı Referans)

| Karar | Sonuç |
|---|---|
| Yatırım aracı tipleri | İki tip: Birim bazlı / Tutar bazlı |
| Birim alanı | Serbest metin |
| Fiyat geçmişi | Otomatik trigger, aynı gün son değer |
| İlk fiyat | Oluşturma anı otomatik log |
| Tutar girişi | Hibrit: birim fiyat×adet **veya** direkt tutar |
| Çoklu para birimi | Yok, her şey TL |
| İşlem tipleri | Alış / Satış / Çekme |
| Çekme + Gider ilişkisi | Bağlanmaz, kullanıcı mantıksal kontrol |
| Satış işlemi | Onaylandı, bekleyen nakite eklenir |
| Mod davranışı | Yol A — hem KPI hem bekleyen nakit moda göre |
| Pasta grafik | Güncel değere göre, %3 altı "Diğer", bekleyen nakit ayrı dilim |
| Trend grafik | Sadece güncelleme tarihleri, [1A][6A][1Y][Tümü] butonları, varsayılan 1Y, downsampling |
| Tablo sütunları | 5 sütun (Ad, Toplam Maliyet, Güncel Değer, K/Z TL, K/Z %) |
| Tablo sıralama | Güncel değere göre büyükten küçüğe |
| Tıklama → işlemler | Evet, filtreli işlemler sayfası |
| Araç silme | İşlem yoksa cascade, varsa pasifleştirme |
| Araç düzenleme | İşlem varsa Tip ve Birim kilitli |
| Pasifleştirme zamanı | Miktar > 0 ise engelli (D seçildi) |
| Yeni işlem formunda pasif araç | Görünmez |
| Negatif miktar | Silme serbest, portföyde uyarı kutusu |
| Negatif bekleyen nakit | Olduğu gibi göster + uyarı kutusu |
| Onay popup'ı | Silme için var, mod değiştirmede yok |
| Dashboard'a etki | Yok, mevcut yapı korunur |
| Portföy tarih filtresi | Yok, hep güncel/kümülatif |
| Veri tipleri | numeric(20,8) adet, numeric(15,2) para |
| Migration stratejisi | Tek dosya, üç tablo birlikte |
| Fiyat geçmişi mekanizması | Database trigger |
| Geliştirme sırası | 3 alt faz (16a, 16b, 16c) |

---

## Sonuç

Bu PRD, Faz 16'nın tüm tasarım kararlarını ve uygulama detaylarını içerir. Geliştirme **3 alt faza bölünmüş** olarak ilerlenecektir. Her alt faz bağımsız test edilebilir, kullanıcı kademeli olarak özellikleri görür.

**Bir sonraki adım:** Faz 16a için Claude Code komutu hazırlanır.
