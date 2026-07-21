"use client";
// DTO ürün bölümü (best_sellers/editors_picks/product_showcase) → gerçek ProductCard grid.
// Manuel ürün sırası DTO'dan gelen sırayla korunur. Boşsa güvenli gizlenir (null).
import { useEffect, useState } from "react";
import { ProductCard, type Product, type ProductDeliveryPromise } from "./ProductCard";
import { SectionLabel, SectionTitle } from "./SectionHeading";
import type { HpProduct } from "@/lib/homepage";

type DeliveryData = { same_day?: { available?: boolean; slots?: Array<{ remaining?: number }> } };

const DELIVERY_REFS = [
  { lat: 40.9224, lng: 29.1309, side: "anadolu" },
  { lat: 41.043, lng: 28.987, side: "avrupa" },
] as const;

function deliveryDate(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function deliveryFor(offset: number): Promise<DeliveryData[]> {
  return Promise.all(DELIVERY_REFS.map(async (ref) => {
    try {
      const response = await fetch("/api/delivery-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ref, date: deliveryDate(offset) }),
      });
      const json = await response.json().catch(() => null) as { data?: DeliveryData } | null;
      return response.ok && json?.data ? json.data : {};
    } catch {
      return {};
    }
  }));
}

async function resolveDeliveryPromise(): Promise<ProductDeliveryPromise | undefined> {
  const today = await deliveryFor(0);
  if (today.some((item) => item.same_day?.available)) return "today";

  const tomorrow = await deliveryFor(1);
  if (tomorrow.some((item) => item.same_day?.slots?.some((slot) => Number(slot.remaining) > 0))) return "tomorrow";

  return undefined;
}

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
  const [deliveryPromise, setDeliveryPromise] = useState<ProductDeliveryPromise>();

  useEffect(() => {
    let active = true;
    void resolveDeliveryPromise().then((value) => {
      if (active) setDeliveryPromise(value);
    });
    return () => { active = false; };
  }, []);
  if (items.length === 0) return null;
  return (
    <section className="py-16 bg-white">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="mb-8">
          {subtitle && <SectionLabel>{subtitle}</SectionLabel>}
          <SectionTitle>{title || "Ürünler"}</SectionTitle>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {items.map((product, idx) => <ProductCard key={product.id} product={product} idx={idx} deliveryPromise={deliveryPromise} />)}
        </div>
      </div>
    </section>
  );
}
