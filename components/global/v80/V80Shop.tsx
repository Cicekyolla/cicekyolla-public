"use client";
// GLOBAL VERSION 80 — "Seçkiler" vitrini: sekmeler (o dilde canlı kategoriler),
// keşif filtreleri, gerçek ürün kartları, atölye tanıtım kutusu, "daha fazla".
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { interp } from "@/lib/global/v80/text";
import { applyFilters } from "@/lib/global/v80/filters";
import type { V80View } from "@/lib/global/v80/view";
import { useV80Filter } from "./V80FilterContext";
import { V80ProductCard } from "./V80ProductCard";

export function V80Shop({ view }: { view: V80View }) {
  const t = view.texts;
  const f = useV80Filter();
  const [showAll, setShowAll] = useState(false);
  const all = view.shop.products;
  const filtered = applyFilters(all, { category: f.category, destination: f.destination });
  const limit = view.shop.limit;
  const visible = showAll ? filtered : filtered.slice(0, limit);
  const intentLabel = f.intent ?? f.categoryLabel ?? f.destinationLabel;
  const activeTab = view.shop.tabs.find((tb) => tb.slug === f.category) ?? null;
  const labels = [f.intent, f.categoryLabel && f.categoryLabel !== f.intent ? f.categoryLabel : null, f.destinationLabel].filter(Boolean) as string[];

  return (
    <section id="shop" className="v80-section" style={{ background: "var(--v80-bg)", scrollMarginTop: 96 }}>
      <div className="v80-wrap">
        <div data-v80-reveal style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="v80-eyebrow">{f.active ? t["shop.eyebrowFor"] : t["shop.eyebrow"]}</p>
            <h2 className="v80-h2">{intentLabel ? interp(t["shop.titleFor"], { x: intentLabel }) : t["shop.title"]}</h2>
            {labels.length ? <p style={{ fontSize: "0.6875rem", fontWeight: 500, color: "var(--v80-ink-subtle)", letterSpacing: "0.04em", marginTop: 6 }}>{labels.join(" · ")}</p> : null}
          </div>
          {view.shop.allHref ? <Link href={view.shop.allHref} className="v80-link-caps" style={{ marginBottom: 3 }}>{t["shop.all"]}</Link> : null}
        </div>

        {f.active ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {labels.map((l) => (
              <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--v80-primary-strong)", color: "var(--v80-bg)", borderRadius: 999, padding: "4px 12px", fontSize: "0.6875rem", fontWeight: 500 }}>{l}</span>
            ))}
            <button type="button" onClick={f.clear} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "0.6875rem", color: "var(--v80-ink-subtle)", textDecoration: "underline" }}>{t["discovery.clear"]}</button>
          </div>
        ) : null}

        <div className="v80-tabs" data-v80-reveal role="tablist">
          <div style={{ display: "flex", alignItems: "center", minWidth: "max-content" }}>
            <button type="button" role="tab" className="v80-tab" aria-selected={!f.category} onClick={() => f.setCategory(null)}>{t["shop.tabAll"]}</button>
            {view.shop.tabs.map((tb) => (
              <button key={tb.key} type="button" role="tab" className="v80-tab" aria-selected={activeTab?.key === tb.key} onClick={() => f.setCategory(tb.slug, tb.label, null)}>{tb.label}</button>
            ))}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: "0.6875rem", color: "var(--v80-ink-subtle)", letterSpacing: "0.06em", paddingInlineEnd: 4, paddingInlineStart: 12 }}>{filtered.length} {t["shop.unit"]}</span>
          </div>
        </div>

        {visible.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "var(--v80-ink-subtle)", padding: "24px 0" }}>{t["shop.empty"]}</p>
        ) : (
          <div className="v80-product-grid">
            {visible.map((p, i) => (
              <div key={p.id} data-v80-reveal data-d={i % 4}>
                <V80ProductCard p={p} t={t} eager={i < 4} />
              </div>
            ))}
            {view.shop.promo && visible.length >= Math.min(8, limit) ? (
              <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: "var(--v80-radius-sm)", overflow: "hidden", border: "1px solid var(--v80-border)", marginTop: 8, marginBottom: 8 }} className="v80-promo">
                <div style={{ background: "var(--v80-warm)", aspectRatio: "3/1", overflow: "hidden", position: "relative", width: "100%", minWidth: 0 }}>
                  {view.shop.promo.image ? <Image src={view.shop.promo.image} alt="" fill sizes="(max-width:768px) 100vw, 50vw" className="v80-img" style={{ objectFit: "cover" }} unoptimized={!view.shop.promo.image.startsWith("/")} /> : null}
                </div>
                <div style={{ background: "var(--v80-warm)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 40px" }}>
                  <p className="v80-serif" style={{ fontStyle: "italic", fontWeight: 200, fontSize: "clamp(1.1rem, 1.8vw, 1.75rem)", letterSpacing: "-0.03em", color: "var(--v80-ink)", marginBottom: 12, lineHeight: 1.15 }}>{t["shop.promoTitle"]}</p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--v80-ink-muted)", lineHeight: 1.65, marginBottom: 20 }}>{t["shop.promoBody"]}</p>
                  {view.shop.promo.href ? <a href={view.shop.promo.href} style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--v80-primary-strong)", textDecoration: "none", letterSpacing: "0.02em" }}>{t["shop.promoCta"]}</a> : null}
                </div>
                <style>{`.v80 .v80-promo>div{min-width:0}@media (max-width:768px){.v80 .v80-promo{grid-template-columns:1fr!important}.v80 .v80-promo>div:first-child{aspect-ratio:2/1!important}.v80 .v80-promo>div:last-child{padding:22px 20px!important}}`}</style>
              </div>
            ) : null}
          </div>
        )}

        {!showAll && filtered.length > limit ? (
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <button type="button" className="v80-btn-ghost" onClick={() => setShowAll(true)}>{interp(t["shop.more"], { n: filtered.length - limit })}</button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
