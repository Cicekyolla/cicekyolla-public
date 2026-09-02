// ============================================================================
// KATEGORİ SAYFA ÇÖZÜCÜSÜ — PAYLAŞILAN KATMAN
//
// Bu modül, `app/[...slug]/page.tsx` içinde bulunan kategori dalının BİREBİR
// taşınmış halidir. Mantık DEĞİŞMEDİ; yalnız iki rotanın (kategori rotası ve
// catch-all rotası) aynı kodu paylaşabilmesi için ortak bir dosyaya alındı.
//
// NEDEN TAŞINDI (performans kök nedeni):
//   Next.js 14'te bir sayfa `searchParams` alıyorsa O ROTANIN TAMAMI zorla
//   dinamik render edilir; `export const revalidate` yok sayılır ve yanıt
//   `cache-control: private, no-cache, no-store` ile döner.
//   `searchParams`a yalnız kategori sayfaları (?sort / ?page) ihtiyaç duyuyordu,
//   ama kategori dalı catch-all rotanın İÇİNDE olduğu için 71.406 lokasyon
//   URL'i de aynı cezayı çekiyordu (canlı ölçüm: her istek x-vercel-cache=MISS,
//   mahalle sayfalarında ortalama 857 ms TTFB).
//   Kategori sayfaları kendi rotasına alınınca catch-all `searchParams`tan
//   kurtulur ve lokasyon sayfaları ISR önbelleğine girer.
// ============================================================================

import { unstable_noStore as noStore } from "next/cache";
import { fetchSeoPage, fetchCategoryById, type SeoPublicPage } from "@/lib/api";
import { getCategoryTree } from "@/lib/categories";
import { findCategoryNodeBySlug } from "@/lib/catalog";
import { needsCategorySeoFields, isLightCategoryNode, mergeCategoryNode } from "@/lib/categoryNodeEnrich";

// `app/[...slug]/page.tsx` içindeki prettySlug ile AYNI davranış. Oradaki kopya
// lokasyon yollarında (il/ilçe/-mah) kullanılmayı sürdürdüğü için bilinçli olarak
// dokunulmadı; burada yalnız kategori tree'sinin okunamadığı fallback yolunda
// kullanılır.
function prettySlug(value: string): string {
  const clean = value.replace(/-mah$/, "");
  const names: Record<string, string> = { istanbul: "İstanbul", ankara: "Ankara", izmir: "İzmir", bursa: "Bursa" };
  return names[clean] || clean.split("-").map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1)).join(" ");
}

export function syntheticCategoryPage(path: string, node: Record<string, unknown>): SeoPublicPage {
  const name = typeof node.name === "string" ? node.name : "Koleksiyon";
  const desc = typeof node.description === "string" ? node.description : "";
  const str = (k: string): string | undefined => (typeof node[k] === "string" ? (node[k] as string) : undefined);
  return {
    url_path: path,
    page_type: "category",
    lang: "tr",
    index_state: node.is_indexable === false ? "noindex" : "index",
    canonical_url: str("canonical_url") || path,
    // Marka EKLENMEZ: app/layout.tsx metadata şablonu zaten "%s | ÇiçekYolla"
    // uyguluyor. Buraya marka yazmak "Güller — Cicekyolla | ÇiçekYolla" gibi
    // çift markalı (ve diakritiksiz) başlık üretiyordu.
    title_tag: str("seo_title") || name,
    meta_description: str("seo_description") || desc || `${name} koleksiyonu — aynı gün teslimat.`,
    h1: str("h1_title") || name,
    intro_html: desc ? `<p>${desc}</p>` : null,
    body_blocks: [],
    faq: Array.isArray(node.faq_json) ? (node.faq_json as SeoPublicPage["faq"]) : [],
    schema_jsonld: {},
  };
}

// Admin'deki SEO kaydı yayında olduğu halde h1/title_tag/meta_description alanları
// boş bırakılmış olabilir. O durumda sayfa boş <h1> ve boş <title> ile yayınlanıyor,
// kategori rayının etiketi de "null Kategorileri" çıkıyordu. Boş alanları
// syntheticCategoryPage'in ürettiği (canlı kategori ağacından gelen) değerlerle
// tamamlar. DOLU gelen hiçbir alana dokunmaz → admin tek kaynak olmayı sürdürür.
export function withCategoryFallbacks(
  seo: SeoPublicPage,
  path: string,
  node: Record<string, unknown>
): SeoPublicPage {
  const blank = (v: string | null | undefined): boolean => !v || v.trim() === "";
  if (!blank(seo.h1) && !blank(seo.title_tag) && !blank(seo.meta_description)) return seo;
  const derived = syntheticCategoryPage(path, node);
  return {
    ...seo,
    h1: blank(seo.h1) ? derived.h1 : seo.h1,
    title_tag: blank(seo.title_tag) ? derived.title_tag : seo.title_tag,
    meta_description: blank(seo.meta_description) ? derived.meta_description : seo.meta_description,
  };
}

/**
 * `/kategori/...` yolunu SEO sayfasına çözer.
 *
 * Karar sırası `app/[...slug]/page.tsx::resolvePage` içindeki kategori dalıyla
 * BİREBİR aynıdır:
 *   1) Admin SEO kaydı varsa o kullanılır (boş alanlar ağaçtan tamamlanır),
 *   2) yoksa canlı kategori ağacındaki düğümden sentetik sayfa üretilir,
 *   3) ağaç hiç okunamadıysa (Render/API kısa kesinti) geçerli kategori URL'i
 *      404 olarak ÖNBELLEĞE ALINMAZ → noStore() + slug'dan sentetik sayfa,
 *   4) hiçbiri yoksa null → çağıran notFound() verir.
 *
 * Eski akışta 4. adım catch-all'ın geri kalanına düşüyordu; oradaki tüm dallar
 * (`deliveryParts`, `dynamicDeliveryParts`) `/kategori/` yolları için zaten null
 * döndüğü ve sonuç yine `null` olduğu için davranış aynıdır.
 */
export async function resolveCategoryPage(path: string): Promise<SeoPublicPage | null> {
  const [seo, tree] = await Promise.all([fetchSeoPage(path), getCategoryTree()]);
  const slug = path.replace(/^\/kategori\//, "").replace(/\/+$/, "");
  const found = tree ? findCategoryNodeBySlug(tree, slug) : null;
  // HAFİF AĞAÇ (maliyet #1): ağaç düğümünde description/faq_json/seo_* yoktur.
  // Bu alanlar yalnız SEO fallback'i gerekiyorsa (kayıt yok ya da başlık/h1/meta
  // boş) tek kategori için mevcut /api/categories/:id ucundan okunur → çıktı,
  // tam ağaçla üretilen sayfayla BİREBİR aynı kalır. Tam kayıt varsa ek istek yok.
  let node: Record<string, unknown> | null = found ? (found as unknown as Record<string, unknown>) : null;
  if (node && needsCategorySeoFields(seo) && isLightCategoryNode(node)) {
    node = mergeCategoryNode(node, await fetchCategoryById(Number(node.id)));
  }
  if (seo) return node ? withCategoryFallbacks(seo, path, node) : seo;
  if (node) return syntheticCategoryPage(path, node);
  if (!tree && slug) {
    noStore();
    return syntheticCategoryPage(path, { name: prettySlug(slug) });
  }
  return null;
}
