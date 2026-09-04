// ---------------------------------------------------------------------------
// PRODUCT / OFFER / AGGREGATERATING JSON-LD — ürün sayfasının TEK schema kaynağı.
//
// ⚠ TEK KAYNAK KURALI: buradaki her değer gerçek ürün verisinden gelir
//   (products tablosu + product_images + onaylı product_reviews agregatı).
//   Fiyat, stok ve puan schema için İKİNCİ KEZ yazılmaz; sayfada müşterinin
//   gördüğü değerlerin ta kendisidir.
//
// ⚠ PUAN KURALI (en önemlisi): `aggregateRating` YALNIZCA ürünün gerçekten
//   ONAYLANMIŞ müşteri değerlendirmesi varsa üretilir. Yorumu olmayan ürüne
//   yıldız UYDURULMAZ; sabit 5.0 yazılmaz. Ortalama neyse o gider (5.0 ise 5.0,
//   4.8 ise 4.8). Kaynak: products.rating_avg / rating_count — bunlar
//   `reviewsRepository.recomputeRating()` tarafından SADECE
//   `status = 'approved'` yorumlardan hesaplanır.
//
// EKLENMEYENLER (bilerek): priceValidUntil, shippingDetails,
// hasMerchantReturnPolicy. Bunlar taahhüt/vaattir; sitede karşılığı olmayan bir
// ticari vaadi schema'ya yazmak yanlış beyandır (marka kuralı: iade vaadi yok).
// ---------------------------------------------------------------------------
// ÇALIŞMA ZAMANI İTHALİ YOK — bilerek. Bu dosya yaprak modüldür: hem Next
// paketleyicisi hem `node --test` onu doğrudan yükleyebilsin diye bağımlılıklar
// DIŞARIDAN verilir. Test, sayfanın kullandığı GERÇEK fonksiyonları enjekte eder;
// böylece test ile production aynı kodu çalıştırır.
export interface SchemaDeps {
  /** lib/site-config.ts → absoluteUrl */
  absolute: (path: string) => string;
  /** lib/richText.ts → toPlainText */
  plainText: (html: string | null | undefined) => string;
}

/** Mağaza markası. products tablosunda brand kolonu YOK; ürünleri ÇiçekYolla
 *  kendi atölyesinde hazırlayıp satıyor, dolayısıyla marka mağazanın kendisidir. */
export const BRAND_NAME = "ÇiçekYolla";

export interface ProductSchemaImage {
  url: string;
  role?: string | null;
}

export interface ProductSchemaInput {
  name: string;
  slug: string;
  productId: number | string;
  /** Gösterilen fiyat (kuruş) — indirimli varsa o. Sayfadakiyle AYNI değer. */
  priceMinor: number | string;
  currency?: string | null;
  stockQuantity: number;
  images: ProductSchemaImage[];
  shortDescription?: string | null;
  longDescription?: string | null;
  sku?: string | null;
  /** products.rating_avg — yalnız onaylı yorumların ortalaması. */
  ratingAvg?: number | string | null;
  /** products.rating_count — onaylı yorum sayısı. */
  ratingCount?: number | string | null;
}

/** Kapak görseli önce, sonra galeri; hepsi MUTLAK URL, tekrarsız.
 *  Google structured data'da göreli URL kabul ETMEZ — canlıda "/r2/..." gidiyordu. */
function buildImageList(images: ProductSchemaImage[], absolute: SchemaDeps["absolute"]): string[] {
  const cover = images.filter((i) => i?.role === "cover");
  const rest = images.filter((i) => i?.role !== "cover");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const img of [...cover, ...rest]) {
    const raw = img?.url?.trim();
    if (!raw) continue;
    const abs = absolute(raw);
    if (seen.has(abs)) continue;
    seen.add(abs);
    out.push(abs);
  }
  return out;
}

/**
 * Gerçek onaylı puan varsa AggregateRating döner, yoksa `null`.
 *
 * İki koşul da şart:
 *   • en az 1 onaylı değerlendirme
 *   • ortalama geçerli aralıkta (1–5)
 * İkinci koşul, veri tutarsızlığında (count>0 ama avg=0) schema'ya geçersiz
 * bir yıldız yazılmasını engeller — sessizce yanlış puan göstermektense
 * hiç göstermemek doğrudur.
 */
export function buildAggregateRating(
  ratingAvg: number | string | null | undefined,
  ratingCount: number | string | null | undefined,
): Record<string, unknown> | null {
  const count = Math.trunc(Number(ratingCount ?? 0));
  const avg = Number(ratingAvg ?? 0);
  if (!Number.isFinite(count) || count < 1) return null;
  if (!Number.isFinite(avg) || avg < 1 || avg > 5) return null;
  return {
    "@type": "AggregateRating",
    ratingValue: avg.toFixed(1),
    reviewCount: count,
    bestRating: "5",
    worstRating: "1",
  };
}

/** Ürün sayfasının Product JSON-LD nesnesi. */
export function buildProductJsonLd(input: ProductSchemaInput, deps: SchemaDeps): Record<string, unknown> {
  const productUrl = deps.absolute(`/urun/${input.slug}`);
  const images = buildImageList(input.images ?? [], deps.absolute);
  // Açıklama: kısa → uzun → ad. Düz metne indirgenir (schema HTML beklemez).
  const description =
    deps.plainText(input.shortDescription) ||
    deps.plainText(input.longDescription) ||
    input.name;

  const priceMinor = Number(input.priceMinor);
  const rating = buildAggregateRating(input.ratingAvg, input.ratingCount);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description,
    // Tek görsel varsa da dizi bırakılır: Google birden çok en-boy oranını sever
    // ve dizi tek/çok ayrımı yapmaz.
    ...(images.length ? { image: images } : {}),
    ...(input.sku ? { sku: String(input.sku) } : {}),
    productID: String(input.productId),
    url: productUrl,
    brand: { "@type": "Brand", name: BRAND_NAME },
    ...(rating ? { aggregateRating: rating } : {}),
    offers: {
      "@type": "Offer",
      // Biçim BİLEREK değişmedi: EcommerceViewItemTracker bu string'i okuyup
      // GA4 view_item value'sunu üretiyor.
      price: (priceMinor / 100).toFixed(2),
      priceCurrency: input.currency || "TRY",
      availability:
        Number(input.stockQuantity) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: productUrl,
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

/**
 * JSON-LD'yi <script> gövdesine güvenle gömer.
 *
 * Ürün açıklamaları HTML içeriyor; içlerinde geçebilecek bir `</script>` dizisi
 * script etiketini ERKEN KAPATIR ve sayfayı bozar. `<` kaçırılarak bu kapatılır.
 * (Aynı koruma app/site-haritasi/page.tsx içinde zaten kullanılıyor.)
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
