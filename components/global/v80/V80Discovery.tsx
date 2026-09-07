"use client";
// GLOBAL VERSION 80 — "Birlikte bulalım": güven mini şeridi + 4 keşif grubu.
// Çipler GERÇEK filtre (kategori üyeliği / teslimat profili) ya da gerçek bağlantıdır.
import Link from "next/link";
import { interp } from "@/lib/global/v80/text";
import { applyFilters } from "@/lib/global/v80/filters";
import type { V80View } from "@/lib/global/v80/view";
import { useV80Filter } from "./V80FilterContext";
import { LineIcon } from "./V80Icons";
import type { V80Icon } from "@/lib/global/v80/schema";

export function V80Discovery({ view }: { view: V80View }) {
  const t = view.texts;
  const f = useV80Filter();
  const count = applyFilters(view.shop.products, { category: f.category, destination: f.destination }).length;
  return (
    <div style={{ overflow: "hidden" }} id="discovery">
      <div style={{ background: "var(--v80-brand-soft)", borderTop: "1px solid rgba(224,219,212,0.4)" }}>
        <div className="v80-wrap" style={{ padding: "18px var(--v80-gutter) 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <p style={{ fontSize: "0.6875rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--v80-ink-subtle)" }}>{t["discovery.eyebrow"]}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            {view.trustMini.map((m) => (
              <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--v80-ink-subtle)" }}>
                <LineIcon name={m.icon as V80Icon} size={10} />
                <span style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{m.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="v80-wrap" style={{ padding: 0 }}>
          <div className="v80-paths-grid" style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, view.discovery.length))}, 1fr)` }}>
            {view.discovery.map((g) => (
              <div key={g.key}>
                <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--v80-ink)", marginBottom: 10 }}>{g.title}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {g.chips.map((c) => {
                    if (c.filter) {
                      const sel = c.filter.kind === "category" ? f.category === c.filter.slug && (f.intent === c.label || f.categoryLabel === c.label || g.key === "what") : f.destination === c.filter.city;
                      const fl = c.filter;
                      return (
                        <button key={c.key} type="button" className="v80-pill" aria-pressed={sel}
                          onClick={() => {
                            if (fl.kind === "category") f.setCategory(sel ? null : fl.slug, fl.label, g.key === "what" ? null : c.label);
                            else f.setDestination(sel ? null : fl.city, fl.label);
                          }}>
                          {c.label}
                        </button>
                      );
                    }
                    return c.href ? <Link key={c.key} href={c.href} className="v80-pill" style={{ textDecoration: "none" }}>{c.label}</Link> : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="v80-wrap" style={{ padding: "14px var(--v80-gutter) 18px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16, borderTop: "1px solid rgba(224,219,212,0.5)", flexWrap: "wrap" }}>
          {f.active ? (
            <p style={{ fontSize: "0.75rem", color: "var(--v80-ink-muted)", flex: 1 }} aria-live="polite">{interp(t["discovery.match"], { n: count })}</p>
          ) : null}
          <button type="button" className="v80-btn" style={{ fontWeight: 600 }} onClick={f.goShop}>{t["discovery.show"]}</button>
        </div>
      </div>
    </div>
  );
}
