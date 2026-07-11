import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchProductBySlug, fetchProducts, toCardProduct, formatMinorTRY } from "@/lib/api";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ProductReviews } from "@/components/product/ProductReviews";
import { ProductCard } from "@/components/home/ProductCard";

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
      <ProductReviews productId={product.id} productName={product.name} />
      {related.length > 0 ? (
        <section aria-label="İlgili ürünler" className="max-w-[1440px] mx-auto px-5 md:px-8 pb-20">
          <div className="border-t border-black/[0.06] pt-14">
            <p className="text-[10px] tracking-[0.3em] text-[#8B5CF6] uppercase font-bold mb-3">Keşfet</p>
            <h2 style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }} className="text-2xl lg:text-3xl font-semibold text-[#111827] mb-8">
              Bunları da Beğenebilirsiniz
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7">
              {related.map((p, idx) => (
                <ProductCard key={p.id} product={p} idx={idx} />
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
