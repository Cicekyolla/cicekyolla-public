"use client";
// DTO ürün bölümü (best_sellers/editors_picks/product_showcase) → gerçek ProductCard grid.
// Manuel ürün sırası DTO'dan gelen sırayla korunur. Boşsa güvenli gizlenir (null).
import { ProductCard, type Product } from "./ProductCard";
import { SectionLabel, SectionTitle } from "./SectionHeading";
import type { HpProduct } from "@/lib/homepage";

function toCard(p: HpProduct): Product {
  const hasSale = p.sale_price_minor != null;
  return {
    id: p.id, name: p.name, slug: p.slug,
    price: Math.round((hasSale ? Number(p.sale_price_minor) : Number(p.price_minor)) / 100),
    originalPrice: hasSale ? Math.round(Number(p.price_minor) / 100) : undefined,
    hasSale,
    image: p.cover_image_url ?? "",
    badge: p.is_new ? "Yeni" : undefined,
  };
}

export function ProductShowcase({ title, subtitle, products }: { title?: string | null; subtitle?: string | null; products?: HpProduct[] }) {
  const items = (products ?? []).map(toCard);
  if (items.length === 0) return null;
  return (
    <section className="py-16 bg-white">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="mb-8">
          {subtitle && <SectionLabel>{subtitle}</SectionLabel>}
          <SectionTitle>{title || "Ürünler"}</SectionTitle>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {items.map((product, idx) => <ProductCard key={product.id} product={product} idx={idx} />)}
        </div>
      </div>
    </section>
  );
}
