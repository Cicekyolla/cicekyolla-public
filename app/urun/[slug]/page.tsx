import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchProductBySlug, fetchProducts, toCardProduct, formatMinorTRY } from "@/lib/api";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ProductReviews } from "@/components/product/ProductReviews";
import { ProductImage } from "@/components/product/ProductImage";

/* ============================================================================
   CICEKYOLLA PUBLIC — Ürün Detay Route  /urun/[slug]
   CTO Decision: Admin Ürün Merkezi → API → DB → BURASI → müşteri görür.
   Veri gerçek backend'den (GET /api/products/slug/:slug). Mock/hardcode YOK.
   SEO: admin Ürün Merkezi > SEO sekmesinde yönetilen alanlardan üretilir.
   Yalnız 'active' ürün gösterilir (fetchProductBySlug gate eder → null → 404).
   ============================================================================ */

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await fetchProductBySlug(params.slug);
  if (!data) return { title: "Ürün bulunamadı — Cicekyolla" };
  const { product, seo } = data;
  const title = seo?.meta_title || `${product.name} — Cicekyolla`;
  const description =
    seo?.meta_description ||
    product.short_description ||
    `${product.name} — aynı gün teslimat ve güvenli ödeme ile Cicekyolla'da.`;
  const ogImage = seo?.og_image || data.images.find((i) => i.role === "cover")?.url || data.images[0]?.url;
  return {
    title,
    description,
    alternates: seo?.canonical_url ? { canonical: seo.canonical_url } : undefined,
    openGraph: {
      title: seo?.og_title || title,
      description: seo?.og_description || description,
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const data = await fetchProductBySlug(params.slug);
  if (!data) notFound();

  const { product, images } = data;
  const cover = images.find((i) => i.role === "cover")?.url || images[0]?.url;
  const price = data.product.sale_price_minor && Number(data.product.sale_price_minor) > 0
    ? data.product.sale_price_minor
    : data.product.price_minor;

  // ── İLGİLİ ÜRÜNLER (Cross-Sell) — aynı kategoriden, canlı katalog ──
  // Admin: ürünün kategorisi → /api/products?category_id= → BURASI. Mock YOK.
  const primaryCat = data.categories.find((c) => c.is_primary) ?? data.categories[0];
  const relatedRows = primaryCat
    ? await fetchProducts({ category_id: primaryCat.category_id, page_size: 8, sort: "created_at_desc" })
    : [];
  const related = relatedRows
    .filter((p) => p.slug !== product.slug && p.cover_image_url)
    .slice(0, 4)
    .map(toCardProduct);

  // Product JSON-LD (schema) — gerçek üründen.
  const ratingCount = Number((product as { rating_count?: number }).rating_count ?? 0);
  const ratingAvg = Number((product as { rating_avg?: number }).rating_avg ?? 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short_description || product.long_description || product.name,
    image: cover ? [cover] : undefined,
    sku: product.sku || undefined,
    ...(ratingCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: ratingAvg.toFixed(1), reviewCount: ratingCount } } : {}),
    offers: {
      "@type": "Offer",
      price: (Number(price) / 100).toFixed(2),
      priceCurrency: product.currency || "TRY",
      availability: product.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductDetail data={data} />
      {(() => {
        const fn = (product as { florist_note?: string | null; florist_note_status?: string | null });
        if (!fn.florist_note || fn.florist_note_status !== "approved") return null;
        return (
          <section aria-label="Çiçek Yolla Önerisi" className="max-w-[1440px] mx-auto px-5 md:px-8 pb-4">
            <div className="rounded-[22px] border border-[#EDE9FE] bg-gradient-to-br from-[#FBFAFF] to-[#F5F3FF] p-6 lg:p-7">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#7C3AED] text-white text-[13px]">✿</span>
                <span className="text-[11px] tracking-[0.28em] text-[#6D28D9] uppercase font-bold">Çiçek Yolla Önerisi</span>
              </div>
              <p className="text-[15px] lg:text-[16px] leading-relaxed text-[#3F3A52]" style={{ fontFamily: "var(--font-display)" }}>
                {fn.florist_note}
              </p>
            </div>
          </section>
        );
      })()}
      <ProductReviews productId={product.id} productName={product.name} />
      {related.length > 0 ? (
        <section aria-label="Sıkça birlikte alınan ürünler" className="max-w-[1440px] mx-auto px-5 md:px-8 pb-20">
          <div
            className="overflow-hidden rounded-[32px] border border-white/10 px-5 py-7 sm:px-7 lg:px-10 lg:py-10"
            style={{
              background: "linear-gradient(135deg, #0B001F 0%, #19063A 52%, #35136D 100%)",
              boxShadow: "0 24px 70px rgba(39, 10, 86, 0.22)",
            }}
          >
            <div className="mb-7 flex items-center gap-4 border-b border-white/10 pb-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6]/25 text-xl text-[#C4B5FD]">
                ✦
              </span>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#C4B5FD]">
                  Sıkça Birlikte Alınanlar
                </p>
                <h2 className="text-xl font-semibold text-white lg:text-2xl" style={{ fontFamily: "var(--font-display)" }}>
                  Müşteriler Bunları da İnceledi
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {related.map((p) => (
                <Link
                  key={p.id}
                  href={`/urun/${p.slug}`}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.06] transition duration-300 hover:-translate-y-1 hover:border-[#A78BFA]/60 hover:bg-white/[0.10]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-white">
                    <ProductImage
                      src={p.image}
                      alt={p.name}
                      padding="0px"
                      derivatives={p.derivatives}
                      blurhash={p.blurhash}
                      sizes="(max-width:640px) 50vw, 25vw"
                    />
                    {p.badge ? (
                      <span className="absolute left-3 top-3 rounded-full bg-[#8B5CF6] px-2.5 py-1 text-[9px] font-bold text-white">
                        {p.badge}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex min-h-[132px] flex-1 flex-col p-4">
                    <h3
                      className="text-[13px] font-semibold leading-snug text-white sm:text-[14px]"
                      style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                    >
                      {p.name}
                    </h3>
                    <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                      <span className="text-lg font-bold text-[#D8B4FE]" style={{ fontFamily: "var(--font-display)" }}>
                        ₺{p.price}
                      </span>
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-xl text-white transition group-hover:border-[#A78BFA] group-hover:bg-[#8B5CF6]"
                      >
                        +
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-7 grid overflow-hidden rounded-[22px] border border-white/10 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["🌸", "Taze Çiçek Garantisi", "7–10 gün taze kalma garantisi"],
                ["⚡", "Aynı Gün Teslimat", "14:00'a kadar verilen siparişlerde"],
                ["🔒", "Güvenli Ödeme", "256-bit SSL ile korunan ödeme"],
                ["📦", "Özel Paketleme", "Özenli ve premium sunum"],
              ].map(([icon, title, text]) => (
                <div key={title} className="border-b border-white/10 p-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0">
                  <span className="mb-3 block text-xl">{icon}</span>
                  <p className="mb-1 text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs leading-relaxed text-[#B9A8D1]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      {/* Fiyat özeti (SSR erişilebilirlik / no-JS fallback) */}
      <span className="sr-only">{formatMinorTRY(price)}</span>
    </>
  );
}
