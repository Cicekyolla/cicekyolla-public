"use client";
// GLOBAL VERSION 80 — "Kartına ne yazalım?" DÜRÜST sürüm: mesaj burada saklanmaz
// (mevcut akışta kart mesajı ödeme adımında yazılır; ikinci bir mesaj state'i
// kurulmaz). Bölüm ilham verir: vesile → örnek satırlar → kart önizlemesi →
// vitrine geç. Yanıltıcı "mesaj kaydedildi" izlenimi YOKTUR.
import { useState } from "react";
import type { V80View } from "@/lib/global/v80/view";

export function V80CardMessage({ view }: { view: V80View }) {
  const t = view.texts;
  const occ = view.card.occasions;
  const [k, setK] = useState(0);
  const [line, setLine] = useState<string | null>(null);
  if (!occ.length) return null;
  const cur = occ[Math.min(k, occ.length - 1)];
  const shown = line && cur.lines.includes(line) ? line : cur.lines[0] ?? null;
  return (
    <section id="card" className="v80-section" style={{ background: "var(--v80-bg)", borderTop: "1px solid #E0DBD4" }}>
      <div className="v80-wrap">
        <div data-v80-reveal style={{ marginBottom: 32 }}>
          <p className="v80-eyebrow" style={{ letterSpacing: "0.2em" }}>{t["card.eyebrow"]}</p>
          <h2 className="v80-h2">{t["card.title"]}</h2>
          <p style={{ marginTop: 10, fontSize: "0.875rem", color: "var(--v80-ink-muted)", lineHeight: 1.65, maxWidth: 560 }}>{t["card.sub"]}</p>
        </div>
        <div className="v80-card-message-grid">
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 8 }}>
            <div aria-live="polite" style={{ width: "100%", maxWidth: 380, aspectRatio: "4/3", background: "#FBF7F1", borderRadius: "var(--v80-radius-sm)", boxShadow: "0 4px 32px rgba(42,33,48,0.10), 0 1px 4px rgba(42,33,48,0.06)", transform: "rotate(-1.5deg)", display: "flex", flexDirection: "column", padding: "28px 32px 24px", position: "relative" }}>
              <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)" }} aria-hidden="true">
                <svg width="16" height="22" viewBox="0 0 40 52" fill="none"><ellipse cx="20" cy="14" rx="9" ry="13" fill="var(--v80-brand-soft)" /><ellipse cx="11" cy="22" rx="9" ry="13" fill="var(--v80-brand-soft)" transform="rotate(-45 11 22)" /><ellipse cx="29" cy="22" rx="9" ry="13" fill="var(--v80-brand-soft)" transform="rotate(45 29 22)" /><circle cx="20" cy="22" r="5" fill="var(--v80-primary)" /><rect x="19" y="26" width="2" height="18" rx="1" fill="var(--v80-delivery)" /></svg>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", marginTop: 16 }}>
                <p className="v80-serif" style={{ fontStyle: "italic", fontWeight: 200, fontSize: "clamp(0.875rem, 1.6vw, 1.125rem)", letterSpacing: "-0.02em", lineHeight: 1.55, color: shown ? "var(--v80-ink)" : "#C4BAB2" }}>{shown ?? t["card.preview"]}</p>
              </div>
              <p style={{ position: "absolute", bottom: 10, insetInlineEnd: 16, fontSize: "0.6875rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#C4BAB2" }}>{t["card.brand"]}</p>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }} role="tablist">
              {occ.map((o, i) => (
                <button key={o.key} type="button" role="tab" aria-selected={i === k} className="v80-pill" aria-pressed={i === k} onClick={() => { setK(i); setLine(null); }}>{o.label}</button>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
              {cur.lines.map((l) => (
                <button key={l} type="button" onClick={() => setLine(l)} className="v80-pill" style={{ fontSize: "0.6875rem", padding: "5px 12px", background: shown === l ? "var(--v80-brand-soft)" : undefined, borderColor: shown === l ? "var(--v80-primary-strong)" : undefined, color: shown === l ? "var(--v80-primary)" : undefined }}>{l}</button>
              ))}
            </div>
            <p style={{ fontSize: "0.6875rem", color: "var(--v80-ink-subtle)", marginBottom: 20, letterSpacing: "0.03em" }}>{t["card.note"]}</p>
            {view.card.href ? <a href={view.card.href} className="v80-btn">{t["card.cta"]}</a> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
