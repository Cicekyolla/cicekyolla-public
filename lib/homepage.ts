// ============================================================================
// lib/homepage.ts — Homepage CMS published/preview DTO okuma (server-side).
// Güvenli: API hatası veya yayın yoksa null döner → çağıran mevcut çalışan
// (temizlenmiş) anasayfaya düşer. Draft ASLA public endpoint'ten gelmez.
// lib/api.ts ile aynı API_ORIGIN standardı.
// ============================================================================
const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export type HpSectionType =
  | 'collection_rail' | 'hero_delivery_bar' | 'hero' | 'trust_bar' | 'manifesto'
  | 'featured_collections' | 'urgency_strip' | 'feature_split' | 'same_day_delivery'
  | 'occasion_shopping' | 'best_sellers' | 'editors_picks' | 'brand_story'
  | 'testimonials' | 'instagram_gallery' | 'corporate_references'
  | 'district_delivery' | 'whatsapp_cta' | 'newsletter' | 'product_showcase';

export interface HpProduct {
  id: number; name: string; slug: string; price_minor: number;
  sale_price_minor: number | null; is_new: boolean; cover_image_url: string | null; pinned: boolean;
}
export interface HpSection {
  id: number; type: HpSectionType; title: string | null; subtitle: string | null;
  config: Record<string, unknown>; device_visibility: string; selection_mode: string;
  enabled: boolean; locked: boolean;
  rule?: { flag: string; limit: number }; products?: HpProduct[];
}
export interface HomepageDTO {
  version_id: number; version_no: number; status: string; revision: number;
  published_at: string | null; sections: HpSection[];
}

async function safeGet(url: string, init?: RequestInit): Promise<HomepageDTO | null> {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, ...init });
    if (!res.ok) return null;
    const j = (await res.json()) as { data: HomepageDTO | null };
    return j?.data ?? null;
  } catch {
    return null; // API erişilemezse: güvenli fallback
  }
}

/** Yayınlanan snapshot (published-only). Yoksa/hatada null. */
export async function getPublishedHomepage(): Promise<HomepageDTO | null> {
  return safeGet(`${API_ORIGIN}/api/public/homepage`, { next: { revalidate: 60 } });
}

/** Kısa ömürlü GRANT ile taslak önizleme (kalıcı token YOK). Yoksa/hatada null. */
export async function getPreviewHomepage(grant: string): Promise<HomepageDTO | null> {
  const u = `${API_ORIGIN}/api/public/homepage/preview?grant=${encodeURIComponent(grant)}`;
  return safeGet(u, { cache: 'no-store' });
}
