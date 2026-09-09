"use client";
// GLOBAL VERSION 80 — ürün kartı (Figma `yt`): 4:5 kare, gerçek rozet, gerçek
// fiyat (mevcut kur motoru), gerçek teslimat etiketi (ürün profili), locale PDP linki.
// Sepete yazmaz: teslimat (nereye/ne zaman) olmadan sepet satırı anlamsızdır —
// mevcut commerce kuralı (ProductDetail → DeliveryPlanner → addItem → /sepet).
import Link from "next/link";
import { ProductImage } from "@/components/product/ProductImage";
import { avifMediaFromSizes } from "@/lib/avifPolicy";

// Adım 3b: Global vitrin kartı — yaygın ekranlarda responsive WebP (bkz. lib/avifPolicy.ts).
const V80_CARD_SIZES = "(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw";
const V80_CARD_AVIF_MEDIA = avifMediaFromSizes(V80_CARD_SIZES);
import type { V80Product } from "@/lib/global/v80/view";
import { V80Money } from "./V80Money";

export function V80ProductCard({ p, t, eager = false }: { p: V80Product; t: Record<string, string>; eager?: boolean }) {
  const badge = p.isBestseller ? t["shop.bestseller"] : p.isNew ? t["shop.new"] : p.hasSale ? t["shop.sale"] : null;
  const delivery = p.sameDay ? t["shop.sameDay"] : p.cargo ? t["shop.cargo"] : null;
  return (
    <Link href={p.href} className="v80-card" style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }} data-product-id={p.id}>
      <div className="v80-frame" style={{ aspectRatio: "4/5", marginBottom: 14, background: "#fff", borderRadius: "var(--v80-radius-sm)" }}>
        <ProductImage src={p.image} alt={p.name} priority={eager} padding="0px" derivatives={p.meta.derivatives} blurhash={p.meta.blurhash} sizes={V80_CARD_SIZES} avifMedia={V80_CARD_AVIF_MEDIA} />
        {badge ? (
          <div style={{ position: "absolute", top: 12, insetInlineStart: 12, zIndex: 3, background: "rgba(250,248,245,0.92)", borderRadius: 999, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4, backdropFilter: "blur(4px)" }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--v80-primary)", flexShrink: 0 }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 500, color: "var(--v80-ink)", letterSpacing: "0.03em", lineHeight: 1, whiteSpace: "nowrap" }}>{badge}</span>
          </div>
        ) : null}
      </div>
      <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, letterSpacing: "-0.015em", lineHeight: 1.2, marginBottom: 6, color: "var(--v80-ink)" }}>{p.name}</h3>
      <p className="v80-serif" style={{ fontSize: "1.375rem", fontWeight: 400, letterSpacing: "-0.01em", color: "var(--v80-ink)", lineHeight: 1, marginBottom: 10, fontVariantNumeric: "tabular-nums", display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <V80Money minor={p.priceMinor} />
        {p.originalPriceMinor ? <V80Money minor={p.originalPriceMinor} className="v80-strike" /> : null}
      </p>
      {delivery ? (
        <div style={{ marginBottom: 10 }}>
          <span style={{ display: "inline-flex", alignItems: "center", background: p.sameDay ? "#E8F7EE" : "#F3F1F6", color: p.sameDay ? "#1E7A45" : "var(--v80-ink-muted)", borderRadius: 999, padding: "3px 9px", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" }}>{delivery}</span>
        </div>
      ) : null}
      {p.stems ? (
        <p style={{ fontSize: "0.6875rem", color: "var(--v80-ink-subtle)", lineHeight: 1.6, marginBottom: 14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.stems}</p>
      ) : null}
      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--v80-ink)", padding: "11px 0 0", borderTop: "1px solid var(--v80-border-soft)", marginTop: "auto" }}>
        {t["shop.cardCta"]} <span className="v80-card-arrow" style={{ fontSize: "0.9375rem", fontWeight: 300 }} aria-hidden="true">→</span>
      </span>
      <style>{`.v80 .v80-strike{font-size:0.875rem;color:#C4B5FD;text-decoration:line-through;font-weight:400}`}</style>
    </Link>
  );
}
