import * as XLSX from "xlsx";

import { createClient } from "@/lib/supabase/client";
import { ayAdi, formatDate } from "@/lib/format";

/**
 * Kullanıcının tüm verisini çok sayfalı bir Excel dosyası olarak indirir.
 * Sayfalar: Giderler, Gelirler, Bütçe Hedefleri, Tekrarlayan Giderler,
 * Master Veriler.
 */
export async function tumVeriyiIndir(): Promise<void> {
  const supabase = createClient();

  const [
    giderlerRes,
    gelirlerRes,
    hedeflerRes,
    tekrarlayanRes,
    giderTurleriRes,
    giderKalemleriRes,
    gelirTurleriRes,
    odemeTurleriRes,
    donemlerRes,
  ] = await Promise.all([
    supabase
      .from("giderler")
      .select(
        "tutar, aciklama, created_at, gider_turleri(name), gider_kalemleri(name), odeme_turleri(name), donemler(yil, ay)",
      ),
    supabase
      .from("gelirler")
      .select("tutar, created_at, gelir_turleri(name), donemler(yil, ay)"),
    supabase
      .from("butce_hedefleri")
      .select("hedef_tutar, gider_turleri(name), donemler(yil, ay)"),
    supabase
      .from("tekrarlayan_giderler")
      .select(
        "tutar, aciklama, ayin_gunu, aktif, gider_turleri(name), gider_kalemleri(name), odeme_turleri(name)",
      ),
    supabase.from("gider_turleri").select("name").order("name"),
    supabase
      .from("gider_kalemleri")
      .select("name, gider_turleri(name)")
      .order("name"),
    supabase.from("gelir_turleri").select("name").order("name"),
    supabase.from("odeme_turleri").select("name, is_default").order("name"),
    supabase
      .from("donemler")
      .select("yil, ay")
      .order("yil", { ascending: false })
      .order("ay", { ascending: false }),
  ]);

  for (const res of [
    giderlerRes,
    gelirlerRes,
    hedeflerRes,
    tekrarlayanRes,
    giderTurleriRes,
    giderKalemleriRes,
    gelirTurleriRes,
    odemeTurleriRes,
    donemlerRes,
  ]) {
    if (res.error) throw res.error;
  }

  const wb = XLSX.utils.book_new();
  const ekle = (ad: string, aoa: (string | number)[][]) => {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), ad);
  };

  // Sayfa 1 — Giderler
  ekle("Giderler", [
    [
      "Tutar",
      "Gider Türü",
      "Gider Kalemi",
      "Ödeme Türü",
      "Açıklama",
      "Yıl",
      "Ay",
      "Eklenme Tarihi",
    ],
    ...giderlerRes.data!.map((g) => [
      g.tutar,
      g.gider_turleri?.name ?? "",
      g.gider_kalemleri?.name ?? "",
      g.odeme_turleri?.name ?? "",
      g.aciklama ?? "",
      g.donemler?.yil ?? "",
      g.donemler ? ayAdi(g.donemler.ay) : "",
      formatDate(g.created_at),
    ]),
  ]);

  // Sayfa 2 — Gelirler
  ekle("Gelirler", [
    ["Tutar", "Gelir Türü", "Yıl", "Ay", "Eklenme Tarihi"],
    ...gelirlerRes.data!.map((g) => [
      g.tutar,
      g.gelir_turleri?.name ?? "",
      g.donemler?.yil ?? "",
      g.donemler ? ayAdi(g.donemler.ay) : "",
      formatDate(g.created_at),
    ]),
  ]);

  // Sayfa 3 — Bütçe Hedefleri
  ekle("Bütçe Hedefleri", [
    ["Gider Türü", "Yıl", "Ay", "Hedef Tutar"],
    ...hedeflerRes.data!.map((h) => [
      h.gider_turleri?.name ?? "",
      h.donemler?.yil ?? "",
      h.donemler ? ayAdi(h.donemler.ay) : "",
      h.hedef_tutar,
    ]),
  ]);

  // Sayfa 4 — Tekrarlayan Giderler
  ekle("Tekrarlayan Giderler", [
    [
      "Tutar",
      "Gider Türü",
      "Gider Kalemi",
      "Ödeme Türü",
      "Açıklama",
      "Ayın Günü",
      "Aktif",
    ],
    ...tekrarlayanRes.data!.map((t) => [
      t.tutar,
      t.gider_turleri?.name ?? "",
      t.gider_kalemleri?.name ?? "",
      t.odeme_turleri?.name ?? "",
      t.aciklama ?? "",
      t.ayin_gunu,
      t.aktif ? "Evet" : "Hayır",
    ]),
  ]);

  // Sayfa 5 — Master Veriler
  const masterAoa: (string | number)[][] = [];
  masterAoa.push(["GİDER TÜRLERİ"]);
  giderTurleriRes.data!.forEach((t) => masterAoa.push([t.name]));
  masterAoa.push([], ["GİDER KALEMLERİ", "Bağlı Gider Türü"]);
  giderKalemleriRes.data!.forEach((k) =>
    masterAoa.push([k.name, k.gider_turleri?.name ?? ""]),
  );
  masterAoa.push([], ["GELİR TÜRLERİ"]);
  gelirTurleriRes.data!.forEach((t) => masterAoa.push([t.name]));
  masterAoa.push([], ["ÖDEME TÜRLERİ", "Varsayılan"]);
  odemeTurleriRes.data!.forEach((o) =>
    masterAoa.push([o.name, o.is_default ? "Evet" : "Hayır"]),
  );
  masterAoa.push([], ["DÖNEMLER", ""]);
  masterAoa.push(["Yıl", "Ay"]);
  donemlerRes.data!.forEach((d) => masterAoa.push([d.yil, ayAdi(d.ay)]));
  ekle("Master Veriler", masterAoa);

  const bugun = new Date();
  const tarih = `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, "0")}-${String(bugun.getDate()).padStart(2, "0")}`;
  XLSX.writeFile(wb, `butce-yedek-${tarih}.xlsx`);
}
