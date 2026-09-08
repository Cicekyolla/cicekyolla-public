"use client";
// GLOBAL VERSION 80 — "Ne söylemek istiyorsun?" duygu sahnesi (5 sekme).
// CTA gerçek hedefe gider: kategori filtresi (+ vitrine kaydırma) ya da bağlantı.
import Image from "next/image";
import { useState } from "react";
import type { V80View } from "@/lib/global/v80/view";
import { useV80Filter } from "./V80FilterContext";

export function V80Mood({ view }: { view: V80View }) {
  const t = view.texts;
  const f = useV80Filter();
  const [i, setI] = useState(0);
  const items = view.mood;
  if (!items.length) return null;
  const cur = items[Math.min(i, items.length - 1)];
  return (
    <section id="mood" style={{ background: "var(--v80-soft)", borderTop: "1px solid #D9C8C0" }}>
      <div className="v80-mood-stage" style={{ position: "relative", height: "64vh", minHeight: 420, overflow: "hidden" }}>
        {items.map((m, k) => (
          <div key={m.key} aria-hidden={k !== i} style={{ position: "absolute", inset: 0, opacity: k === i ? 1 : 0, transition: "opacity var(--v80-motion-reveal) cubic-bezier(0.25,1,0.5,1)", pointerEvents: "none" }}>
            {m.image ? <Image src={m.image} alt="" fill sizes="100vw" priority={false} style={{ objectFit: "cover", filter: "saturate(0.72) brightness(1.07) contrast(0.91) sepia(0.09)" }} unoptimized={!m.image.startsWith("/")} /> : null}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(16,8,6,0.42) 0%, transparent 38%, rgba(16,8,6,0) 50%, rgba(16,8,6,0.82) 100%)" }} />
          </div>
        ))}
        <div className="v80-mood-text" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", paddingInlineStart: "var(--v80-gutter)", paddingInlineEnd: "40%", zIndex: 2 }}>
          <p style={{ fontSize: "0.6875rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(250,248,245,0.62)", marginBottom: 14 }}>{t["mood.eyebrow"]}</p>
          <h2 className="v80-serif" style={{ fontWeight: 200, fontStyle: "italic", fontSize: "clamp(1.125rem,1.8vw,1.5rem)", letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--v80-bg)", marginBottom: 28 }}>{t["mood.title"]}</h2>
          <div style={{ position: "relative", minHeight: 160 }} aria-live="polite">
            <p className="v80-serif" style={{ fontStyle: "italic", fontWeight: 200, color: "var(--v80-bg)", fontSize: "clamp(1.75rem, 4vw, 4rem)", lineHeight: 1, letterSpacing: "-0.04em", marginBottom: 10 }}>“{cur.line}”</p>
            <p style={{ fontSize: "0.6875rem", color: "rgba(250,248,245,0.62)", letterSpacing: "0.04em", marginBottom: 16 }}>{cur.sub}</p>
            {cur.filter ? (
              <button type="button" onClick={() => { if (cur.filter?.kind === "category") f.setCategory(cur.filter.slug, cur.filter.label, cur.word); else if (cur.filter?.kind === "destination") f.setDestination(cur.filter.city, cur.filter.label); f.goShop(); }} className="v80-mood-cta">{cur.cta} →</button>
            ) : cur.href ? (
              <a href={cur.href} className="v80-mood-cta">{cur.cta} →</a>
            ) : null}
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid rgba(26,23,20,0.09)" }}>
        <div className="v80-wrap v80-mood-tabs" style={{ padding: 0 }} role="tablist">
          {items.map((m, k) => (
            <button key={m.key} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)}>
              <p className="v80-serif" style={{ fontSize: "clamp(0.875rem, 1.4vw, 1.25rem)", fontWeight: 200, fontStyle: k === i ? "italic" : "normal", letterSpacing: "-0.02em", color: k === i ? "var(--v80-ink)" : "var(--v80-ink-muted)" }}>{m.word}</p>
            </button>
          ))}
        </div>
      </div>
      <style>{`.v80 .v80-mood-cta{display:inline-flex;align-items:center;gap:8px;height:52px;padding:0 24px;border-radius:var(--v80-radius-md);border:1px solid rgba(250,248,245,0.62);background:rgba(250,248,245,0.14);font-size:0.875rem;font-weight:600;letter-spacing:0.01em;color:var(--v80-bg);text-decoration:none;cursor:pointer;font-family:inherit;transition:border-color var(--v80-motion-base) ease,background var(--v80-motion-base) ease}.v80 .v80-mood-cta:hover{border-color:rgba(250,248,245,0.88);background:rgba(250,248,245,0.22)}`}</style>
    </section>
  );
}
