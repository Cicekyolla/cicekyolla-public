// ÇiçekYolla — RU içerik GERİ ALMA. ru-icerik-uygula.js'in indirdiği yedek dosyasıyla çalışır.
// KULLANIM: Admin'de giriş yapılı sekmede Console → YEDEK = [...] kısmına yedek dosyasının içeriğini yapıştır → Enter.
// - Yedekte kaydı OLMAYAN anahtarlar (yeni niyet sayfaları) silinir (DELETE).
// - Diğerleri eski h1/seo_title/meta/intro/content/faq ve status/indexable değerlerine döner. Yedekte BOŞ (null) olan
//   alanlar `clear` ile boşaltılır (API'de null "değiştirme" anlamına geldiği için).
// - Uygulama sonrası kayıt yine değiştiyse expected_updated_at, okunan güncel değere göre gönderilir.
const DRY_RUN = true;
const API_ORIGIN = "";
const YEDEK = /* yedek dosyasının içeriğini buraya yapıştırın */ [];
(async () => {
  const base = API_ORIGIN + "/api/admin/global/pages/one";
  const CLEARABLE = ["seo_title", "meta_description", "intro_html", "content_html", "faq"];
  for (const y of YEDEK) {
    const q = `?locale=ru&key=${encodeURIComponent(y.key)}`;
    const cur = (await (await fetch(base + q, { credentials: "include" })).json()).data;
    if (!y.kayit) {
      console.log(y.key, cur ? "SİLİNECEK (yedekte yoktu)" : "zaten yok");
      if (!DRY_RUN && cur) console.log(y.key, (await fetch(base + q, { method: "DELETE", credentials: "include" })).status);
      continue;
    }
    const k = y.kayit, body = { h1: k.h1, status: k.status, indexable: k.indexable, clear: [], expected_updated_at: cur ? cur.updated_at : null };
    for (const f of CLEARABLE) { if (k[f] === null || k[f] === undefined || (Array.isArray(k[f]) && !k[f].length)) body.clear.push(f); else body[f] = k[f]; }
    console.log(y.key, "GERİ YÜKLENECEK", body.clear.length ? `(boşaltılacak: ${body.clear.join(",")})` : "");
    if (!DRY_RUN) console.log(y.key, (await fetch(base + q, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).status);
  }
  if (DRY_RUN) console.log("DRY_RUN: hiçbir şey yazılmadı. Uygulamak için DRY_RUN = false.");
})();
