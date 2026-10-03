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

export type ProductUrlsResult =
  | { state: "ok"; rows: ProductUrlRow[] }
  | { state: "missing" }
  | { state: "failed" };

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

/**
 * Durum kodu + gövde → sonuç. 200 olsa bile zarf bozuksa ya da HİÇ geçerli satır
 * yoksa "failed": boş bir yanıt ürün sitemap'ini silemez, çağıran envanter
 * yoluna düşer.
 */
export function productUrlsResultOf(status: number, json: unknown): ProductUrlsResult {
  const state = upstreamStateOf(status);
  if (state !== "ok") return { state };
  const rows = parseProductUrlRows(json);
  return rows && rows.length > 0 ? { state: "ok", rows } : { state: "failed" };
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
}

/**
 * <image:loc> değeri: mevcut medya normalizasyonu + MUTLAK URL. Sitemap standardı
 * mutlak URL ister; "/r2/..." yolları aynen basılınca GSC "Geçersiz URL" veriyordu
 * (1294 örnek, 3 Ağu 2026). Boş değer → null (görsel etiketi basılmaz).
 */
export function sitemapImageLoc(raw: string | null | undefined, deps: SitemapUrlDeps): string | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  const url = deps.mediaUrl(value);
  if (!url) return null;
  return url.startsWith("http") ? url : deps.absoluteUrl(url);
}

/** 503'te tarayıcıya/Google'a "şu kadar sonra tekrar dene" (sn). CDN sitemap ömrüyle aynı. */
export const SITEMAP_RETRY_AFTER_SECONDS = 300;

/**
 * Sitemap rotalarının TEK yanıt üreticisi.
 *   xml === null → kaynak başarısız: 503, Retry-After, no-store (CDN/tarayıcı saklamaz).
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
