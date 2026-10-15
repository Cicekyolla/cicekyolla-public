// ÇiçekYolla — RU içerik GERİ ALMA. ru-icerik-uygula.js'in indirdiği yedek dosyasıyla çalışır.
// KULLANIM: Admin'de giriş yapılı sekmede Console → aşağıdaki YEDEK = [...] kısmına yedek dosyasının içeriğini yapıştır → Enter.
// Önceden kaydı olmayan anahtarlar (yeni niyet sayfaları) silinir; diğerleri eski alanlarına ve status/indexable değerlerine döner.
const YEDEK = /* yedek dosyasının içeriğini buraya yapıştırın */ [];
(async () => {
  const base = "/api/admin/global/pages/one";
  for (const y of YEDEK) {
    const q = `?locale=ru&key=${encodeURIComponent(y.key)}`;
    const cur = (await (await fetch(base + q, { credentials: "include" })).json()).data;
    let r;
    if (!y.kayit) r = await fetch(base + q, { method: "DELETE", credentials: "include" });
    else {
      const k = y.kayit;
      const body = { h1: k.h1, seo_title: k.seo_title, meta_description: k.meta_description, intro_html: k.intro_html, content_html: k.content_html, faq: k.faq, status: k.status, indexable: k.indexable, expected_updated_at: cur ? cur.updated_at : null };
      r = await fetch(base + q, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    console.log(y.key, r.status);
  }
})();
