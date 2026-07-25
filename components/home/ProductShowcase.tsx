"use client";
// DTO ürün bölümü (best_sellers/editors_picks/product_showcase) → gerçek ProductCard grid.
// Manuel ürün sırası DTO'dan gelen sırayla korunur. Boşsa güvenli gizlenir (null).
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard, type Product, type ProductDeliveryPromise } from "./ProductCard";
import { SectionLabel, SectionTitle } from "./SectionHeading";
import type { HpProduct } from "@/lib/homepage";
import type { ShowcaseTheme } from "@/lib/homepageShowcase";

// ── V65 cila: vitrin başına premium renk atmosferi (yalnız görsel katman) ──
// Zeminler yumuşak geçişli; glow'lar düşük opaklıkta; kampanya PEMBE/LİLA
// ailesinde kalır (ucuz kırmızı YOK); premium koyu mor gece + dot texture.
const THEMES: Record<ShowcaseTheme, {
  section: React.CSSProperties;
  glow: string;
  light: boolean;
  dots: boolean;
  cta: React.CSSProperties;
}> = {
  orchid: {
    section: { background: "linear-gradient(180deg, #FFFFFF 0%, #F5F3FF 100%)" },
    glow: "radial-gradient(ellipse at 85% 8%, rgba(139,92,246,0.10) 0%, transparent 55%)",
    light: false, dots: false,
    cta: { background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)", boxShadow: "0 10px 30px rgba(139,92,246,0.35)" },
  },
  deal: {
    section: { background: "linear-gradient(180deg, #FDF4FF 0%, #F5F3FF 100%)" },
    glow: "radial-gradient(ellipse at 12% 12%, rgba(217,70,239,0.10) 0%, transparent 55%)",
    light: false, dots: false,
    cta: { background: "linear-gradient(135deg, #A855F7 0%, #D946EF 100%)", boxShadow: "0 10px 30px rgba(168,85,247,0.35)" },
  },
  botanic: {
    section: { background: "linear-gradient(180deg, #ECFDF5 0%, #F5F3FF 100%)" },
    glow: "radial-gradient(ellipse at 85% 10%, rgba(52,211,153,0.10) 0%, transparent 55%)",
    light: false, dots: false,
    cta: { background: "linear-gradient(135deg, #34D399 0%, #8B5CF6 100%)", boxShadow: "0 10px 30px rgba(52,211,153,0.30)" },
  },
  noir: {
    section: { background: "#0A0118" },
    glow: "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.18) 0%, transparent 60%)",
    light: true, dots: true,
    cta: { background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)", boxShadow: "0 14px 40px rgba(139,92,246,0.5), 0 0 0 1px rgba(255,255,255,0.10)" },
  },
};

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

export function ProductShowcase({ title, subtitle, products, limit, ctaLabel, ctaHref, tone, theme }: {
  title?: string | null; subtitle?: string | null; products?: HpProduct[]; limit?: number;
  /** V65 vitrin teması (additive, opsiyonel): CTA + zemin varyantı. Mevcut kullanım değişmez. */
  ctaLabel?: string; ctaHref?: string; tone?: "white" | "lilac"; theme?: ShowcaseTheme;
}) {
  const items = (limit ? (products ?? []).slice(0, limit) : (products ?? [])).map(toCard);
  const [deliveryPromise, setDeliveryPromise] = useState<ProductDeliveryPromise>();

  useEffect(() => {
    let active = true;
    void resolveDeliveryPromise().then((value) => {
      if (active) setDeliveryPromise(value);
    });
    return () => { active = false; };
  }, []);
  if (items.length === 0) return null;
  const t = theme ? THEMES[theme] : null;
  return (
    <section
      className={`relative overflow-hidden py-16 ${t ? "" : tone === "lilac" ? "bg-[#F5F3FF]" : "bg-white"}`}
      style={t ? t.section : undefined}
    >
      {t ? (
        <div className="absolute inset-0" style={{ background: t.glow, pointerEvents: "none" }} />
      ) : null}
      {t?.dots ? (
        // Lüks dot texture — yalnız koyu (noir) temada, çok düşük opaklıkta
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(139,92,246,0.16) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            pointerEvents: "none",
          }}
        />
      ) : null}
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="mb-8">
          {subtitle && <SectionLabel light={t?.light}>{subtitle}</SectionLabel>}
          <SectionTitle light={t?.light}>{title || "Ürünler"}</SectionTitle>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {items.map((product, idx) => (
            <ProductCard key={product.id} product={product} idx={idx} deliveryPromise={deliveryPromise} polish={!!t} />
          ))}
        </div>
        {ctaLabel && ctaHref ? (
          <div className="mt-10 text-center">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2.5 rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={t ? t.cta : {
                background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)",
                boxShadow: "0 10px 30px rgba(139,92,246,0.35)",
              }}
            >
              {ctaLabel}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
