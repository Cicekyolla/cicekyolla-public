const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

function apiHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  const token = process.env.API_READ_TOKEN;
  if (token) {
    h["Authorization"] = `Bearer ${token}`;
    h["x-user-role"] = "viewer";
  }
  return h;
}

export interface BodyBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface FaqItem {
  q?: string;
  a?: string;
  [key: string]: unknown;
}

export interface SeoPublicPage {
  url_path: string;
  page_type: string;
  lang: string;
  index_state: string;
  canonical_url: string;
  title_tag: string;
  meta_description: string;
  h1: string;
  intro_html: string | null;
  body_blocks: BodyBlock[];
  faq: FaqItem[];
  schema_jsonld: Record<string, unknown>;
}

export async function fetchSeoPage(path: string): Promise<SeoPublicPage | null> {
  const url = `${API_ORIGIN}/api/public/seo/page?path=${encodeURIComponent(path)}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: apiHeaders(), next: { revalidate: 300 } });
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

  const data = (json as { data?: SeoPublicPage } | null)?.data;
  if (!data || typeof data.url_path !== "string") return null;
  return data;
}

const CATEGORIES_PATH = process.env.NEXT_PUBLIC_CATEGORIES_PATH ?? "/api/categories";

export interface CategoryNode {
  name: string;
  slug: string;
  parent_slug?: string | null;
  children?: CategoryNode[];
  status?: string;
  [key: string]: unknown;
}

// Public karar kilidi: müşteriye yalnız active kategori görünür.
// draft/taslak veriyi göstermeye çalışmak yasak; gerçek katalog Admin/API tarafında active yapılmalıdır.
export function isCategoryVisible(node: { status?: unknown }): boolean {
  const s = typeof node?.status === "string" ? node.status.toLowerCase() : "";
  return s === "active";
}

export async function fetchCategoryTree(): Promise<CategoryNode[] | null> {
  const url = `${API_ORIGIN}${CATEGORIES_PATH}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: apiHeaders(), next: { revalidate: 300 } });
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

  const payload = (json as { data?: unknown } | null)?.data ?? json;
  if (!Array.isArray(payload)) return null;

  const nodes = payload.filter(
    (n): n is CategoryNode =>
      !!n &&
      typeof (n as CategoryNode).name === "string" &&
      typeof (n as CategoryNode).slug === "string",
  );
  return nodes.length > 0 ? nodes : null;
}

export interface PublicProductCore {
  id: number;
  name: string;
  slug: string;
  short_description: string | null;
  long_description: string | null;
  sku: string | null;
  barcode: string | null;
  price_minor: string | number;
  sale_price_minor: string | number | null;
  currency: string;
  stock_quantity: number;
  status: string;
  product_type: string;
  same_day_available: boolean;
  delivery_scope: string;
  height_cm: number | null;
  width_cm: number | null;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
}

export interface PublicProductSeo {
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
}

export interface PublicProductImage {
  id: number;
  url: string;
  alt: string | null;
  role: string;
  sort_order: number;
}

export interface PublicProductVariant {
  id: number;
  title: string;
  sku: string | null;
  price_minor: string | number | null;
  sale_price_minor: string | number | null;
  stock_quantity: number;
  status: string;
}

export interface PublicProductCategory {
  category_id: number;
  is_primary: boolean;
}

export interface PublicProductDetail {
  product: PublicProductCore;
  seo: PublicProductSeo | null;
  categories: PublicProductCategory[];
  images: PublicProductImage[];
  variants: PublicProductVariant[];
}

export async function fetchProductBySlug(slug: string): Promise<PublicProductDetail | null> {
  const url = `${API_ORIGIN}/api/products/slug/${encodeURIComponent(slug)}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: apiHeaders(), next: { revalidate: 120 } });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const data = (await res.json()) as PublicProductDetail;
  if (!data?.product) return null;
  if (data.product.status !== "active") return null;
  return data;
}

export interface PublicProductListItem extends PublicProductCore {
  cover_image_url?: string | null;
}

export interface FetchProductsParams {
  category_id?: number | null;
  is_featured?: boolean;
  is_bestseller?: boolean;
  page_size?: number;
}

export async function fetchProducts(params: FetchProductsParams = {}): Promise<PublicProductListItem[]> {
  const query = new URLSearchParams();
  if (params.category_id) query.set("category_id", String(params.category_id));
  if (params.is_featured) query.set("is_featured", "true");
  if (params.is_bestseller) query.set("is_bestseller", "true");
  if (params.page_size) query.set("page_size", String(params.page_size));
  const url = `${API_ORIGIN}/api/products${query.toString() ? `?${query.toString()}` : ""}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: apiHeaders(), next: { revalidate: 120 } });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  const json = await res.json();
  const rows = (json as { data?: unknown; products?: unknown })?.data ?? (json as { products?: unknown })?.products ?? json;
  return Array.isArray(rows) ? rows.filter((p) => (p as PublicProductListItem)?.status === "active") as PublicProductListItem[] : [];
}

export function toCardProduct(p: PublicProductListItem) {
  const sale = p.sale_price_minor != null && Number(p.sale_price_minor) > 0 && Number(p.sale_price_minor) < Number(p.price_minor);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Math.round(Number(sale ? p.sale_price_minor : p.price_minor) / 100),
    oldPrice: sale ? Math.round(Number(p.price_minor) / 100) : undefined,
    image: p.cover_image_url ?? "",
    badge: p.is_new ? "Yeni" : p.is_bestseller ? "Çok Satan" : p.is_featured ? "Öne Çıkan" : undefined,
  };
}
