// ============================================================================
// lib/sitemapSources.ts — ADDITIVE (SEO yayın zinciri). Yaprak modül: çalışma
// zamanı ithali YOK → hem Next paketleyicisi hem `node --test` doğrudan yükler
// (lib/sitemapSources.test.ts). Sitemap'in SAF kararları burada durur.
//
// KURAL 1 — ÜRÜN SİTEMAP KAYNAĞI ("aktif ürün sitemap dışında kalamaz").
//   products.xml / images.xml satırları GET /api/public/seo/product-urls
//   yanıtından gelir (aktif ürün başına tek satır). Uç henüz yayında değilse
//   (404) ya da hata verirse çağıran BUGÜNKÜ envanter yoluna düşer → vitrin
//   API'den önce de sonra da yayınlanabilir (deploy sırasından bağımsız).
//
// KURAL 2 — UPSTREAM HATASI BOŞ 200 ÜRETMEZ.
//   API erişilemediğinde sitemap boş/eksik bir 200 urlset olarak çıkıyor ve CDN
//   onu 5 dk saklıyordu. Kaynak başarısızsa rota 503 + Retry-After: 300 +
//   Cache-Control: no-store döner. MEŞRU boşluk (önizleme ortamında
//   SITE_INDEXABLE=false, gerçekten kayıt yok) 200 boş urlset olarak kalır.
//   İSTİSNA — /sitemap.xml (index) bir ISR ön-üretimidir: orada yanıtın no-store
//   başlığı saklamayı YÖNETMEZ (Next yanıtı durum koduyla birlikte ISR kaydı
//   yapar). Index bu yüzden 503 dönmez, hata FIRLATIR → son iyi kopya korunur
//   (aşağıda sitemapIndexFailureAction).
//
// KURAL 3 — ÜRÜN UCU SESSİZCE EKSİK KALAMAZ.
//   product-urls yanıtında yolu geçersiz satır varsa ya da `total` gelen satır
//   sayısından büyükse yanıt EKSİK sayılır: günlüğe yazılır ve çağıran eksikleri
//   envanterle tamamlar (birleşim → iki kaynağın hiçbirinden kötü olmaz). Tek
//   dosya sınırı (50.000 URL) aşılırsa kaynak kullanılmaz (envanter yoluna düşülür).
// ============================================================================

/** ok = 200; missing = 404 (uç henüz yayında değil); failed = ağ / zaman aşımı / diğer durum kodları / bozuk gövde. */
export type UpstreamState = "ok" | "missing" | "failed";

export function upstreamStateOf(status: number): UpstreamState {
  if (status === 200) return "ok";
  if (status === 404) return "missing";
  return "failed";
}

/** GET /api/public/seo/product-urls satırı (aktif ürün başına bir tane). */
export interface ProductUrlRow {
  url_path: string;
  updated_at: string | null;
  image: string | null;
  name: string;
}

/**
 * incomplete (EK): yanıt geldi ama EKSİK (geçersiz yollu satır atıldı ya da `total` > satır sayısı) →
 * çağıran eksikleri envanterle tamamlar. warning (EK): günlüğe yazılacak tek satır (yoksa alan da yok).
 */
export type ProductUrlsResult =
  | { state: "ok"; rows: ProductUrlRow[]; incomplete?: boolean; warning?: string }
  | { state: "missing" }
  | { state: "failed"; warning?: string };

/** Sitemap protokolü / Google sınırı: dosya başına en çok 50.000 URL. */
export const SITEMAP_MAX_URLS = 50_000;

/** Yalnız /urun/<küçük-harf-slug>: sorgu, hash, büyük harf, alt yol kabul edilmez. */
const PRODUCT_URL_PATH = /^\/urun\/[a-z0-9-]+$/;

export function isProductUrlPath(path: unknown): path is string {
  return typeof path === "string" && PRODUCT_URL_PATH.test(path);
}

/** Yanıt gövdesi → temiz satırlar (geçersiz yol atılır, aynı yol bir kez). Zarf bozuksa null. */
export function parseProductUrlRows(json: unknown): ProductUrlRow[] | null {
  const data = (json as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return null;
  const seen = new Set<string>();
  const rows: ProductUrlRow[] = [];
  for (const raw of data) {
    const row = raw as { url_path?: unknown; updated_at?: unknown; image?: unknown; name?: unknown } | null;
    if (!row || !isProductUrlPath(row.url_path) || seen.has(row.url_path)) continue;
    seen.add(row.url_path);
    rows.push({
      url_path: row.url_path,
      updated_at: typeof row.updated_at === "string" && row.updated_at ? row.updated_at : null,
      image: typeof row.image === "string" && row.image.trim() ? row.image.trim() : null,
      name: typeof row.name === "string" ? row.name : "",
    });
  }
  return rows;
}

/** product-urls yanıtının sayımı: kaç satır geldi, kaçı sitemap'e girdi, kaçı NEDEN giremedi. */
export interface ProductUrlsAudit {
  /** Yanıttaki satır sayısı (data.length). */
  received: number;
  /** Sitemap'e giren (geçerli + tekil) satır sayısı. */
  kept: number;
  /** Aynı yolun yinelenen satırları — kayıp DEĞİLDİR (URL zaten listede). */
  duplicates: number;
  /** Yolu /urun/<küçük-harf-slug> biçiminde OLMAYAN satır sayısı — sitemap'e giremeyen ürünler. */
  invalid: number;
  /** İlk birkaç geçersiz değer (günlük için; kısaltılmış). */
  samples: string[];
  /** Yanıtın bildirdiği `total` (sayı değilse null). */
  total: number | null;
}

/** Günlükte gösterilecek geçersiz yol örneği sayısı. */
const AUDIT_SAMPLE_LIMIT = 5;

/** Yanıt gövdesi → sayım (parseProductUrlRows ile AYNI süzgeç). Zarf bozuksa null. */
export function auditProductUrlRows(json: unknown): ProductUrlsAudit | null {
  const body = json as { data?: unknown; total?: unknown } | null;
  const data = body?.data;
  if (!Array.isArray(data)) return null;
  const seen = new Set<string>();
  const samples: string[] = [];
  let duplicates = 0;
  let invalid = 0;
  for (const raw of data) {
    const path = (raw as { url_path?: unknown } | null)?.url_path;
    if (!isProductUrlPath(path)) {
      invalid++;
      if (samples.length < AUDIT_SAMPLE_LIMIT) {
        samples.push((typeof path === "string" ? path : JSON.stringify(raw ?? null)).slice(0, 80));
      }
    } else if (seen.has(path)) {
      duplicates++;
    } else {
      seen.add(path);
    }
  }
  const total = typeof body?.total === "number" && Number.isFinite(body.total) ? body.total : null;
  return { received: data.length, kept: seen.size, duplicates, invalid, samples, total };
}

/** Yanıt EKSİK mi? Geçersiz yollu satır atıldıysa ya da `total` gelen satır sayısından büyükse evet. */
export function isIncompleteProductUrls(audit: ProductUrlsAudit): boolean {
  return audit.invalid > 0 || (audit.total !== null && audit.total > audit.received);
}

/** Eksik yanıtın günlük satırı; eksik yoksa null. */
export function productUrlsWarning(audit: ProductUrlsAudit): string | null {
  if (!isIncompleteProductUrls(audit)) return null;
  const parts: string[] = [];
  if (audit.invalid > 0) parts.push(`${audit.invalid} satırın yolu geçersiz (örnek: ${audit.samples.join(", ")})`);
  if (audit.total !== null && audit.total > audit.received) parts.push(`total=${audit.total} ama ${audit.received} satır geldi`);
  return `yanıt eksik — ${parts.join("; ")}; sitemap'e giren ${audit.kept} satır, eksikler envanterden tamamlanır`;
}

/**
 * Durum kodu + gövde → sonuç. 200 olsa bile zarf bozuksa ya da HİÇ geçerli satır
 * yoksa "failed": boş bir yanıt ürün sitemap'ini silemez, çağıran envanter
 * yoluna düşer.
 * EK: (1) geçerli satır 50.000'i aşarsa "failed" (tek dosya sınırı → envanter yolu);
 * (2) yanıt EKSİKSE (isIncompleteProductUrls) "ok" kalır ama `incomplete` işaretlenir;
 * (3) 200 gelip kullanılamayan / eksik her yanıt `warning` taşır (çağıran günlüğe yazar).
 * 404 ("missing") ve 200 dışı durumlar uyarısızdır — uç yayınlanmadan önce beklenen hâl.
 */
export function productUrlsResultOf(status: number, json: unknown): ProductUrlsResult {
  const state = upstreamStateOf(status);
  if (state !== "ok") return { state };
  const rows = parseProductUrlRows(json);
  const audit = auditProductUrlRows(json);
  if (!rows || !audit) return { state: "failed", warning: "200 döndü ama zarf bozuk (data listesi yok)" };
  if (rows.length === 0) {
    const ornek = audit.samples.length ? `; örnek: ${audit.samples.join(", ")}` : "";
    return { state: "failed", warning: `200 döndü ama geçerli satır yok (${audit.received} satır geldi${ornek})` };
  }
  if (rows.length > SITEMAP_MAX_URLS) {
    return { state: "failed", warning: `${rows.length} satır tek sitemap dosyası sınırını (${SITEMAP_MAX_URLS}) aşıyor` };
  }
  const warning = productUrlsWarning(audit);
  return warning ? { state: "ok", rows, incomplete: true, warning } : { state: "ok", rows };
}

/**
 * Eski images.xml yolu fetchProductsPaged ile sayfa sayfa okur; o fonksiyon hata
 * hâlinde boş sayfa (total 0) döndürür. Envanterde ürün varken total 0 gelmesi
 * "aktif ürün yok" değil "kaynak yanıt vermedi" demektir.
 */
export function isFailedProductPage(pagination: { total?: unknown } | null | undefined): boolean {
  const total = Number(pagination?.total);
  return !Number.isFinite(total) || total <= 0;
}

export interface SitemapUrlDeps {
  /** lib/media.ts → mediaUrl (r2.dev → same-origin /r2) */
  mediaUrl: (url: string) => string;
  /** lib/site-config.ts → absoluteUrl */
  absoluteUrl: (path: string) => string;
  /** EK: lib/media.ts → isLegacyPleskMedia (artık sunulmayan eski medya yolu). Verilmezse bu süzgeç uygulanmaz. */
  isLegacyMedia?: (url: string) => boolean;
}

/**
 * <image:loc> değeri: mevcut medya normalizasyonu + MUTLAK URL. Sitemap standardı
 * mutlak URL ister; "/r2/..." yolları aynen basılınca GSC "Geçersiz URL" veriyordu
 * (1294 örnek, 3 Ağu 2026). Boş değer → null (görsel etiketi basılmaz).
 * EK: yalnız GERÇEKTEN istenebilir bir görsel adresi basılır — http(s) mutlak URL ya da
 * site içi "/yol". `data:` / `blob:` gibi şemalar, protokol-göreli "//host" ve artık
 * sunulmayan eski medya yolu (isLegacyMedia) → null (GSC'de geçersiz / 404 görsel üretmez).
 */
export function sitemapImageLoc(raw: string | null | undefined, deps: SitemapUrlDeps): string | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  const url = deps.mediaUrl(value);
  if (!url) return null;
  const absolute = /^https?:\/\//i.test(url);
  if (!absolute && (!url.startsWith("/") || url.startsWith("//"))) return null;
  const loc = absolute ? url : deps.absoluteUrl(url);
  return deps.isLegacyMedia?.(loc) ? null : loc;
}

/** 503'te tarayıcıya/Google'a "şu kadar sonra tekrar dene" (sn). CDN sitemap ömrüyle aynı. */
export const SITEMAP_RETRY_AFTER_SECONDS = 300;

/**
 * Sitemap rotalarının TEK yanıt üreticisi.
 *   xml === null → kaynak başarısız: 503, Retry-After, no-store. İstek başına çalışan rotada
 *                  (/sitemaps/[type]) CDN/tarayıcı saklamaz. ISR ön-üretimi olan /sitemap.xml'de
 *                  bu başlık saklamayı yönetmez → index 503 dönmez (bkz. sitemapIndexFailureAction).
 *   xml string   → 200, bugünkü başlıklar birebir.
 */
export function sitemapResponse(xml: string | null): Response {
  if (xml === null) {
    return new Response("Sitemap geçici olarak üretilemiyor; lütfen daha sonra tekrar deneyin.\n", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Retry-After": String(SITEMAP_RETRY_AFTER_SECONDS),
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

/** Next derleme aşaması (next/constants → PHASE_PRODUCTION_BUILD); process.env.NEXT_PHASE ile karşılaştırılır. */
export const NEXT_BUILD_PHASE = "phase-production-build";

/**
 * /sitemap.xml (index) kaynağı OKUNAMADIĞINDA ne yapılır?
 * Index bir ISR ön-üretimidir (revalidate 300): Next, rota yanıtını DURUM KODUYLA birlikte ISR
 * kaydı yapar ve yanıtın `Cache-Control: no-store` başlığına bakmaz → 503 dönmek, son iyi
 * index'in yerine 503'ü saklatırdı.
 *   "throw"  (çalışma zamanı): rota hata fırlatır → yenileme başarısız sayılır; ISR SON İYİ
 *            kopyayı sunmayı sürdürür ve kısa süre sonra yeniden dener (hata saklanmaz).
 *   "legacy" (derleme): fırlatmak derlemeyi düşürür, 503 ise rotayı o dağıtımda ISR'dan çıkarıp
 *            istek başına çalışan fonksiyona çevirirdi → derlemede bugünkü render
 *            (renderSitemapIndex) kullanılır; ilk çalışma zamanı yenilemesi (≤ 5 dk) düzeltir.
 */
export function sitemapIndexFailureAction(phase: string | undefined): "throw" | "legacy" {
  return phase === NEXT_BUILD_PHASE ? "legacy" : "throw";
}

// ============================================================================
// EK (SEO YAYIN ZİNCİRİ — KATEGORİ YASASI, sitemap ayağı) — ADDITIVE.
//
// KURAL 4 — "Bir kategori sayfası yalnız en az bir aktif ürün listelediği sürece index'e
//   değerdir." 4 Eki 2026 taraması: categories.xml'deki 243 kategorinin 56'sında hiç aktif
//   ürün yok. categories.xml'in ÜRÜN KATEGORİSİ satırları GET /api/public/seo/category-urls
//   yanıtından gelir (yayınlı + index kategoriler; satır başına `active_products`) ve yalnız
//   active_products > 0 olanlar listelenir. Ucun KAPSAMADIĞI türler (category_location …)
//   envanterden bugünkü gibi eklenir (lib/sitemap.ts).
//   Uç henüz yayında değilse (404), hata verirse, yanıt EKSİKSE (bozuk satır / `total` > satır
//   sayısı) ya da hiçbir kategori ürün listelemiyor görünüyorsa kaynak KULLANILMAZ → bugünkü
//   envanter mantığı aynen (eksik ya da boş bir yanıt kategorileri sitemap'ten düşüremez).
// ============================================================================

/** GET /api/public/seo/category-urls satırı (yayınlı + index kategori başına bir tane). */
export interface CategoryUrlRow {
  url_path: string;
  updated_at: string | null;
  active_products: number;
}

export type CategoryUrlsResult =
  | { state: "ok"; rows: CategoryUrlRow[] }
  | { state: "missing" }
  | { state: "failed"; warning?: string };

/** Yalnız /kategori/<yol>: sorgu, hash, boşluk kabul edilmez. */
const CATEGORY_URL_PATH = /^\/kategori\/[^\s?#]+$/;

export function isCategoryUrlPath(path: unknown): path is string {
  return typeof path === "string" && CATEGORY_URL_PATH.test(path);
}

/** `active_products` → negatif olmayan tam sayı (sayı ya da rakam dizisi); değilse null. */
function activeProductCount(value: unknown): number | null {
  if (typeof value === "number") return Number.isInteger(value) && value >= 0 ? value : null;
  return typeof value === "string" && /^\d{1,9}$/.test(value) ? Number(value) : null;
}

/**
 * Durum kodu + gövde → sonuç. "ok" YALNIZ yanıt eksiksiz ve kullanılabilirse:
 *   • zarf `data` listesi taşır,
 *   • HER satır geçerli (yol /kategori/…, `active_products` negatif olmayan tam sayı),
 *   • `total` (varsa) gelen satır sayısını aşmaz,
 *   • en az bir satır ürün listeler (active_products > 0),
 *   • satır sayısı tek dosya sınırını (50.000) aşmaz.
 * Aksi hâlde "failed" + günlük satırı → çağıran bugünkü envanter mantığına düşer. Aynı yol bir kez
 * (ilk satır). 404 ("missing") ve 200 dışı durumlar uyarısızdır — uç yayınlanmadan önce beklenen hâl.
 */
export function categoryUrlsResultOf(status: number, json: unknown): CategoryUrlsResult {
  const state = upstreamStateOf(status);
  if (state !== "ok") return { state };
  const body = json as { data?: unknown; total?: unknown } | null;
  const data = body?.data;
  if (!Array.isArray(data)) return { state: "failed", warning: "200 döndü ama zarf bozuk (data listesi yok)" };
  const seen = new Set<string>();
  const rows: CategoryUrlRow[] = [];
  const samples: string[] = [];
  let invalid = 0;
  for (const raw of data) {
    const row = raw as { url_path?: unknown; updated_at?: unknown; active_products?: unknown } | null;
    const count = activeProductCount(row?.active_products);
    if (!row || !isCategoryUrlPath(row.url_path) || count === null) {
      invalid++;
      if (samples.length < AUDIT_SAMPLE_LIMIT) samples.push(JSON.stringify(raw ?? null).slice(0, 80));
      continue;
    }
    if (seen.has(row.url_path)) continue;
    seen.add(row.url_path);
    rows.push({
      url_path: row.url_path,
      updated_at: typeof row.updated_at === "string" && row.updated_at ? row.updated_at : null,
      active_products: count,
    });
  }
  if (invalid > 0) {
    return { state: "failed", warning: `yanıt eksik — ${invalid} satır geçersiz (örnek: ${samples.join(", ")}); envanter mantığı kullanılır` };
  }
  const total = typeof body?.total === "number" && Number.isFinite(body.total) ? body.total : null;
  if (total !== null && total > data.length) {
    return { state: "failed", warning: `yanıt eksik — total=${total} ama ${data.length} satır geldi; envanter mantığı kullanılır` };
  }
  if (!rows.some((row) => row.active_products > 0)) {
    return { state: "failed", warning: `200 döndü ama ürün listeleyen kategori yok (${data.length} satır geldi); envanter mantığı kullanılır` };
  }
  if (rows.length > SITEMAP_MAX_URLS) {
    return { state: "failed", warning: `${rows.length} satır tek sitemap dosyası sınırını (${SITEMAP_MAX_URLS}) aşıyor` };
  }
  return { state: "ok", rows };
}

/** Kategori satırı sitemap'e girer mi? (yasa: en az bir aktif ürün) */
export function isIndexWorthyCategoryRow(row: Pick<CategoryUrlRow, "active_products">): boolean {
  return row.active_products > 0;
}
