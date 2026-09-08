// GLOBAL VERSION 80 — Hero (Figma: 44/56 ızgara, editorial serif H1, intent kartı).
import Image from "next/image";
import type { V80View } from "@/lib/global/v80/view";
import { V80HeroCard } from "./V80HeroCard";
import { Flourish } from "./V80Icons";

export function V80Hero({ view }: { view: V80View }) {
  const t = view.texts;
  const occasionGroup = view.discovery.find((g) => g.key === "occasion") ?? null;
  const h = view.heroTitle;
  return (
    <section className="v80-hero-grid" id="hero">
      <div className="v80-hero-text">
        <div className="v80-hero-words">
          <p className="v80-eyebrow" style={{ marginBottom: 20, letterSpacing: "0.08em" }}>{t["hero.eyebrow"]}</p>
          <h1 className="v80-serif" style={{ fontWeight: 200, lineHeight: 0.96, letterSpacing: "-0.04em", fontSize: h.source === "seo" ? "clamp(36px, 4.4vw, 68px)" : "clamp(44px, 5.5vw, 88px)", margin: "0 0 28px", color: "var(--v80-ink)" }}>
            {h.lines.map((l, i) => <span key={i} style={{ display: "block" }}>{l}</span>)}
            {h.em ? <em style={{ fontStyle: "italic", color: "var(--v80-primary)" }}>{h.em}</em> : null}
          </h1>
          <Flourish />
          <p style={{ fontSize: "0.9375rem", color: "var(--v80-ink-subtle)", lineHeight: 1.72, marginBottom: 32, maxWidth: 400 }}>{t["hero.body"]}</p>
          <V80HeroCard t={t} occasionGroup={occasionGroup} categories={view.categories} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
            {view.heroCtaHref ? <a href={view.heroCtaHref} className="v80-btn">{t["hero.cta"]}</a> : null}
            {view.heroCta2Href ? <a href={view.heroCta2Href} className="v80-btn-ghost">{t["hero.cta2"]}</a> : null}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--v80-border)" }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--v80-delivery)", flexShrink: 0 }} />
            <p style={{ fontSize: "0.6875rem", fontWeight: 500, color: "var(--v80-ink-subtle)", letterSpacing: "0.04em", lineHeight: 1.6 }}>{t["hero.founded"]}</p>
          </div>
        </div>
      </div>
      <div className="v80-frame v80-hero-image">
        <div className="v80-hero-scale">
          {view.heroImage ? (
            <Image src={view.heroImage} alt="" fill priority sizes="(max-width: 768px) 100vw, 56vw" className="v80-hero-img" style={{ objectFit: "cover", objectPosition: "center top" }} unoptimized={!view.heroImage.startsWith("/")} />
          ) : null}
        </div>
        <div aria-hidden="true" style={{ position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: "28%", background: "linear-gradient(to right, var(--v80-bg) 0%, var(--v80-on-dark-muted) 60%, rgba(250,248,245,0) 100%)", zIndex: 2, pointerEvents: "none" }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(237,232,245,0.22) 0%, rgba(237,232,245,0.08) 35%, transparent 65%)", zIndex: 2, pointerEvents: "none" }} />
      </div>
    </section>
  );
}
