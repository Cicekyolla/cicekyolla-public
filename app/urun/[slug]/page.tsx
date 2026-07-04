import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchProductBySlug, formatMinorTRY } from "@/lib/api";
import { ProductDetail } from "@/components/product/ProductDetail";

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

  // Product JSON-LD (schema) — gerçek üründen.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short_description || product.long_description || product.name,
    image: cover ? [cover] : undefined,
    sku: product.sku || undefined,
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
      {/* Fiyat özeti (SSR erişilebilirlik / no-JS fallback) */}
      <span className="sr-only">{formatMinorTRY(price)}</span>
    </>
  );
}
