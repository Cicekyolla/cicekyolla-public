// ============================================================================
// googleReviews.ts — GERÇEK Google işletme değerlendirmeleri: TEK SEÇİM KAYNAĞI.
// ----------------------------------------------------------------------------
// Hem canlı ana sayfa (components/home/Testimonials) hem GLOBAL vitrin
// (lib/global) buradan beslenir: tek kaynak, tek gerçek.
//
// DEĞİŞMEZ KURALLAR
//  • Yorum metni, yazar adı ve puanı ASLA değiştirilmez — yalnızca SEÇİLİR.
//    selectFiveStar nesneleri yeniden kurmaz, gelen referansı aynen döndürür;
//    böylece "premiumlaştırma / yeniden yazma" teknik olarak mümkün değildir.
//  • Seçim ölçütü: Google'ın verdiği rating === 5 ve metni boş olmayan yorumlar.
//  • place.rating / userRatingCount GOOGLE'IN İŞLETME TOPLAMIDIR; seçilen
//    kartlardan YENİDEN HESAPLANMAZ. 5★ süzgeci işletme puanını 5,0 göstermez.
//  • Uydurma/fallback yorum üretilmez. 5★ yoksa çağıran bölüm gizlenir.
//  • Bu veri MARKA sosyal kanıtıdır (Google Business). product_reviews,
//    products.rating_avg/rating_count ve Product.aggregateRating ile HİÇBİR
//    bağı yoktur; oraya asla yazılmaz.
//
// Yaprak modül: yalnız tip düzeyinde bağımlılık taşır → hem Next RSC bundler'ı
// hem `node --test` yükleyebilir.
// ============================================================================

/** Google'ın 5 üzerinden tam puanı. Seçim ölçütü budur. */
export const FIVE_STAR = 5;

export interface GoogleReviewItem {
  author: string;
  authorUri: string | null;
  rating: number | null;
  body: string;
  relativeTime: string | null;
  publishTime: string | null;
}

export interface GoogleReviewsPlace {
  id: string;
  name: string;
  address: string | null;
  /** Google'ın işletme ortalaması (ör. 4,8) — kartlardan hesaplanmaz. */
  rating: number;
  /** Google'daki TOPLAM değerlendirme sayısı — seçilen kart sayısı değil. */
  userRatingCount: number;
  googleMapsUri: string;
}

export interface GoogleReviewsPayload {
  source: "google";
  place: GoogleReviewsPlace;
  reviews: GoogleReviewItem[];
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * /api/reviews (GET) yanıtı gerçek Google şeklinde mi?
 * Eksik/bozuk yanıtta false → çağıran bölüm sessizce gizlenir, sahte üretmez.
 */
export function isGoogleReviewsPayload(value: unknown): value is GoogleReviewsPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<GoogleReviewsPayload>;
  const p = v.place;
  return (
    v.source === "google" &&
    !!p &&
    typeof p === "object" &&
    typeof p.rating === "number" &&
    Number.isFinite(p.rating) &&
    typeof p.userRatingCount === "number" &&
    Number.isFinite(p.userRatingCount) &&
    hasText(p.googleMapsUri) &&
    Array.isArray(v.reviews)
  );
}

/**
 * Gösterilecek havuz: YALNIZ gerçek 5 yıldızlı ve metni olan yorumlar.
 * Google'ın kendi sırası korunur (yeniden sıralanmaz, kırpılmaz).
 * 4★ ve altı bu seçimin dışında kalır.
 */
export function selectFiveStar(
  reviews: readonly GoogleReviewItem[] | null | undefined,
): GoogleReviewItem[] {
  if (!Array.isArray(reviews)) return [];
  return reviews.filter(
    (review) => !!review && review.rating === FIVE_STAR && hasText(review.body),
  );
}

/**
 * Bölümün gösterilip gösterilmeyeceği + gösterilecek yorumlar, tek yerde.
 * `visible: false` → çağıran null döner (boş/hatalı durumda asla sahte içerik).
 */
export function selectTrustReviews(
  payload: unknown,
): { visible: false } | { visible: true; place: GoogleReviewsPlace; reviews: GoogleReviewItem[] } {
  if (!isGoogleReviewsPayload(payload)) return { visible: false };
  const reviews = selectFiveStar(payload.reviews);
  if (reviews.length === 0) return { visible: false };
  return { visible: true, place: payload.place, reviews };
}
