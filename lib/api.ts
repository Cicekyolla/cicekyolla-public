// ---------------------------------------------------------------------------
// CICEKYOLLA PUBLIC — API katmanı
// Mevcut backend public endpoint'ini tüketir. Backend DEĞİŞMEZ.
// Şema, canlı endpoint çıktısına birebir uyumludur:
// GET /api/public/seo/page?path=/istanbul/besiktas/akat-mah
// { data: { url_path, page_type, lang, index_state, canonical_url,
//   title_tag, meta_description, h1, intro_html, body_blocks[], faq[], schema_jsonld } }
// ---------------------------------------------------------------------------

// Backend origin (Render). Env ile override edilebilir.
const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

// Body bloğu — şu an yalnız "paragraph" tipi geliyor; ileride additive genişler.
export interface BodyBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

// FAQ öğesi — şu an boş dizi ([]); M9.6'da dolacak. Şimdiden hazır.
export interface FaqItem {
  q?: string;
  a?: string;
  [key: string]: unknown;
}

// Public SEO sayfası DTO — endpoint'in döndürdüğü "data" objesi.
export interface SeoPublicPage {
  url_path: string;
  page_type: string;
  lang: string;
  index_state: string; // "index" | "noindex"
  canonical_url: string; // path döner (ör. "/istanbul/kadikoy") — domain YOK
  title_tag: string;
  meta_description: string;
  h1: string;
  intro_html: string | null;
  body_blocks: BodyBlock[];
  faq: FaqItem[];
  schema_jsonld: Record<string, unknown>;
}

// Tek sayfa çeker. published değilse backend not_found döndürür → null.
export async function fetchSeoPage(
  path: string
): Promise<SeoPublicPage | null> {
  const url = `${API_ORIGIN}/api/public/seo/page?path=${encodeURIComponent(
    path
  )}`;

  let res: Response;
  try {
    res = await fetch(url, {
      // ISR: sayfayı belirli aralıkla yeniden üret (public site tazeliği).
      next: { revalidate: 300 },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return null;
  }

  // Zarf: { data: {...} } — not_found ise { error: "not_found" }.
  const data = (json as { data?: SeoPublicPage } | null)?.data;
  if (!data || typeof data.url_path !== "string") return null;

  return data;
}

// ---------------------------------------------------------------------------
// CATEGORY TREE — canlı Category Center okuması
// ---------------------------------------------------------------------------
// MEVCUT okuma mekanizmasının BİREBİR aynısını kullanır (aynı API_ORIGIN, aynı
// { data } zarfı, aynı revalidate). YENİ endpoint ÜRETİLMEZ; admin panelin
// okuduğu canlı yol tüketilir. Okuma yolu env ile verilir (tıpkı API_ORIGIN
// gibi) → kod değişmeden canlıya bağlanır, kategori verisi frontend'de TUTULMAZ.
//
// Kurulum: Vercel env → NEXT_PUBLIC_CATEGORIES_PATH = <admin'in kategori okuma path'i>
//   (ör. admin Network sekmesinde 266 kategoriyi döndüren istek yolu).
// Env set edilmezse fetchCategoryTree() null döner → çağıranlar mevcut
// davranışa güvenle geri düşer (production bozulmaz).

const CATEGORIES_PATH = process.env.NEXT_PUBLIC_CATEGORIES_PATH ?? "";

// Category Center düğümü — ekranda DOĞRULANMIŞ alanlar (name, slug) zorunlu;
// hiyerarşi/SEO/görsel/durum alanları opsiyonel ve şemaya göre esnektir.
// Backend kategori ağacını DEĞİŞTİRMEZ; yalnızca olduğu gibi okur.
export interface CategoryNode {
  name: string;
  slug: string;
  parent_slug?: string | null;
  children?: CategoryNode[];
  status?: string;
  [key: string]: unknown;
}

// Canlı kategori ağacını çeker. Env path yoksa veya backend not_found/hata
// dönerse null → çağıran taraf mevcut kaynağa güvenle geri düşer.
export async function fetchCategoryTree(): Promise<CategoryNode[] | null> {
  if (!CATEGORIES_PATH) return null;

  const url = `${API_ORIGIN}${CATEGORIES_PATH}`;

  let res: Response;
  try {
    res = await fetch(url, { next: { revalidate: 300 } });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return null;
  }

  // Zarf esnek: { data: [...] } ya da düz [...] — ikisini de kabul et.
  const payload =
    (json as { data?: unknown } | null)?.data ?? (json as unknown);
  if (!Array.isArray(payload)) return null;

  // Yalnız geçerli düğümleri (name + slug) al; şema-dışı alanlar korunur.
  const nodes = payload.filter(
    (n): n is CategoryNode =>
      !!n &&
      typeof (n as CategoryNode).name === "string" &&
      typeof (n as CategoryNode).slug === "string"
  );
  return nodes.length > 0 ? nodes : null;
}
