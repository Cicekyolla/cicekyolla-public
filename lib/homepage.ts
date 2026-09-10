// ============================================================================
// lib/homepage.ts — Homepage CMS published/preview DTO okuma (server-side).
// Güvenli: API hatası veya yayın yoksa null döner → çağıran mevcut çalışan
// (temizlenmiş) anasayfaya düşer. Draft ASLA public endpoint'ten gelmez.
// lib/api.ts ile aynı API_ORIGIN standardı.
// ============================================================================
import type { MediaDerivatives } from "./api";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export type HpSectionType =
  | 'collection_rail' | 'hero_delivery_bar' | 'hero' | 'trust_bar' | 'manifesto'
  | 'featured_collections' | 'urgency_strip' | 'feature_split' | 'same_day_delivery'
  | 'occasion_shopping' | 'best_sellers' | 'editors_picks' | 'brand_story'
  | 'testimonials' | 'instagram_gallery' | 'corporate_references'
  | 'district_delivery' | 'whatsapp_cta' | 'newsletter' | 'product_showcase'
  | 'workshop_today';

export interface HpProduct {
  id: number; name: string; slug: string; price_minor: number;
  sale_price_minor: number | null; is_new: boolean; cover_image_url: string | null; pinned: boolean;
  // ── EK (PERF, 9 Eyl 2026, Adım 3) — OPSİYONEL, additive ─────────────────
  // Backend medya pipeline'ı her ürün kapağı için 400/800/1500 px WebP + AVIF
  // türevi ve blurhash üretir; /api/products listesi bunları döndürür. Bu DTO
  // taşımadığı için ana sayfa kartları (ProductImage <picture>) hep orijinal
  // dosyayı (150–280 KB) indiriyordu. API DTO'su bu alanları vermezse undefined
  // kalır ve davranış bugünkü gibidir; lib/homepageDerivatives.ts doldurur.
  cover_derivatives?: MediaDerivatives | null;
  cover_blurhash?: string | null;
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

// ---- Kampanya banner'ı (090) ------------------------------------------------
// Admin → Homepage Admin → Banner Yönetimi. Yayın sürümünden BAĞIMSIZ: hero'nun
// kalıcı görseli yine CMS hero bölümünde; banner aktif + pencere içindeyse onun
// üzerine biner. Yoksa/hatada null → HomeHero CMS görseline düşer; kullanıcı
// asla boş/kırık hero görmez. Tarih/aktör alanı public'e gelmez.
export interface HomepageBannerDTO {
  id: number; image_url: string; title: string | null; alt_text: string | null; link_href: string | null;
}

export async function getActiveHomepageBanner(): Promise<HomepageBannerDTO | null> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/public/homepage/banner`, {
      headers: { Accept: 'application/json' }, next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { data?: HomepageBannerDTO | null };
    const d = j?.data;
    return d && typeof d.image_url === 'string' && d.image_url.trim() ? d : null;
  } catch {
    return null; // API erişilemezse: güvenli fallback (CMS görseli)
  }
}
