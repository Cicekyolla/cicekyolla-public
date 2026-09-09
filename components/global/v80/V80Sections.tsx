// ============================================================================
// GLOBAL VERSION 80 — sunucu bölümleri: Kategoriler · Teslimat · Koleksiyonlar ·
// Teslimat noktaları · Yolculuk · Kapanış CTA · Güven şeridi · SEO içeriği.
// Tümü gerçek motor verisiyle çalışır; sayı/fiyat/liste burada uydurulmaz.
// ============================================================================
import Image from "next/image";
import Link from "next/link";
import { ProductImage } from "@/components/product/ProductImage";
import { avifMediaFromSizes } from "@/lib/avifPolicy"; // Adım 3b: sizes'tan AVIF koşulu
import { interp } from "@/lib/global/v80/text";
import type { V80View, V80Category } from "@/lib/global/v80/view";
import type { V80Icon } from "@/lib/global/v80/schema";
import { sanitizeProductHtml, DESC_PROSE } from "@/lib/richText";
import { V80Money } from "./V80Money";
import { V80SelectedLocation } from "./V80SelectedLocation";
import { LineIcon, WhatsAppIcon } from "./V80Icons";

function Head({ eyebrow, title, right, reveal = true }: { eyebrow: string; title: React.ReactNode; right?: React.ReactNode; reveal?: boolean }) {
  return (
    <div data-v80-reveal={reveal ? true : undefined} style={{ marginBottom: 24, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div>
        <p className="v80-eyebrow">{eyebrow}</p>
        <h2 className="v80-h2">{title}</h2>
      </div>
      {right}
    </div>
  );
}

function CategoryImage({ c, sizes }: { c: V80Category; sizes: string }) {
  return <ProductImage src={c.image} alt={c.name} padding="0px" derivatives={c.meta.derivatives} blurhash={c.meta.blurhash} sizes={sizes} avifMedia={avifMediaFromSizes(sizes)} />;
}

// ---- Kategoriler: "Türe göre keşfet" ----------------------------------------
export function V80Categories({ view }: { view: V80View }) {
  const t = view.texts;
  if (!view.categories.length) return null;
  return (
    <section id="categories" className="v80-section" style={{ background: "var(--v80-bg2)" }}>
      <div className="v80-wrap">
        <Head eyebrow={t["categories.eyebrow"]} title={t["categories.title"]} right={<p style={{ fontSize: "0.6875rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--v80-ink-subtle)", marginBottom: 4 }}>{t["categories.pick"]}</p>} />
        <div className="v80-cat-grid" data-v80-reveal>
          {view.categories.map((c) => (
            <Link key={c.slug} href={c.href} className="v80-card" style={{ display: "block" }}>
              <div className="v80-frame" style={{ aspectRatio: "3/4", marginBottom: 14, borderRadius: "var(--v80-radius-sm)", background: "#fff" }}>
                <CategoryImage c={c} sizes="(max-width:768px) 50vw, 25vw" />
              </div>
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--v80-ink)", letterSpacing: "-0.01em", marginBottom: 4 }}>{c.name}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.6875rem", color: "var(--v80-ink-subtle)", letterSpacing: "0.04em" }}>
                <span>{interp(t["categories.kinds"], { n: c.live })}</span>
                {c.minPriceMinor != null ? (
                  <>
                    <span style={{ width: 2, height: 2, borderRadius: "50%", background: "var(--v80-ink-subtle)", flexShrink: 0 }} />
                    <span>{interp(t["categories.from"], { price: "" })}<V80Money minor={c.minPriceMinor} /></span>
                  </>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- Teslimat seçenekleri ---------------------------------------------------
export function V80Delivery({ view }: { view: V80View }) {
  const t = view.texts;
  const items = view.structure.delivery.items.filter((i) => i.enabled);
  if (!items.length) return null;
  return (
    <div id="delivery" style={{ background: "var(--v80-bg2)", borderTop: "1px solid var(--v80-border)", borderBottom: "1px solid var(--v80-border)" }}>
      <div className="v80-wrap">
        <div data-v80-reveal style={{ paddingTop: 28, paddingBottom: 20, borderBottom: "1px solid var(--v80-border)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="v80-eyebrow">{t["delivery.eyebrow"]}</p>
            <h2 className="v80-h2" style={{ marginTop: 6 }}>{t["delivery.title"]} <em style={{ fontStyle: "italic", color: "var(--v80-primary)" }}>{t["delivery.titleEm"]}</em></h2>
          </div>
          <V80SelectedLocation t={t} />
        </div>
        <div className="v80-delivery-grid">
          {items.map((it) => {
            const green = it.key === "istanbul";
            return (
              <div key={it.key}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: green ? "var(--v80-delivery)" : "var(--v80-ink-subtle)", flexShrink: 0 }} />
                  <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: green ? "var(--v80-delivery)" : "var(--v80-ink-subtle)" }}>{t[`delivery.items.${it.key}.label`]}</p>
                </div>
                <p style={{ fontSize: "1.0625rem", fontWeight: 600, color: "var(--v80-ink)", marginBottom: 8, letterSpacing: "-0.01em" }}>{t[`delivery.items.${it.key}.title`]}</p>
                <p style={{ fontSize: "0.8125rem", color: "var(--v80-ink-muted)", lineHeight: 1.65 }}>{t[`delivery.items.${it.key}.sub`]}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---- Koleksiyonlar: "Aradığını bulalım" ------------------------------------
export function V80Collections({ view }: { view: V80View }) {
  const t = view.texts;
  if (!view.collections.length) return null;
  return (
    <section id="collections" className="v80-section" style={{ background: "var(--v80-warm)" }}>
      <div className="v80-wrap">
        <div data-v80-reveal style={{ marginBottom: 36 }}>
          <p className="v80-eyebrow">{t["collections.eyebrow"]}</p>
          <h2 className="v80-h2">{t["collections.title"]}</h2>
          <p style={{ marginTop: 10, fontSize: "0.875rem", color: "var(--v80-ink-muted)", lineHeight: 1.65, maxWidth: 640 }}>{t["collections.sub"]}</p>
        </div>
        <div className="v80-collections-grid">
          {view.collections.map((col, i) => (
            <div key={col.key} data-v80-reveal data-d={i}>
              <Link href={col.category.href} className="v80-card" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div className="v80-frame" style={{ aspectRatio: "4/5", marginBottom: 16, background: "#fff", borderRadius: "var(--v80-radius-sm)" }}>
                  {col.image && col.image !== col.category.image ? (
                    <Image src={col.image} alt={col.category.name} fill sizes="(max-width:768px) 100vw, 33vw" className="v80-img" unoptimized={!col.image.startsWith("/")} />
                  ) : (
                    <CategoryImage c={col.category} sizes="(max-width:768px) 100vw, 33vw" />
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                  <h3 className="v80-serif" style={{ fontSize: "1.125rem", fontWeight: 300, letterSpacing: "-0.02em", color: "var(--v80-ink)" }}>{col.category.name}</h3>
                  <p className="v80-explore" style={{ paddingTop: 3, flexShrink: 0 }}>{t["collections.view"]}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 12, marginTop: "auto", borderTop: "1px solid var(--v80-border)", fontSize: "0.75rem", color: "var(--v80-ink-subtle)" }}>
                  <span>{interp(t["categories.kinds"], { n: col.category.live })}</span>
                  {col.category.minPriceMinor != null ? (<><span style={{ color: "var(--v80-border)" }}>·</span><span>{interp(t["categories.from"], { price: "" })}<V80Money minor={col.category.minPriceMinor} /></span></>) : null}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- Teslimat noktaları -----------------------------------------------------
export function V80Destinations({ view }: { view: V80View }) {
  const t = view.texts;
  if (!view.destinations.length) return null;
  return (
    <section id="destinations" className="v80-section" style={{ background: "var(--v80-bg2)", borderTop: "1px solid var(--v80-border)" }}>
      <div className="v80-wrap">
        <div data-v80-reveal style={{ marginBottom: 24 }}>
          <p className="v80-eyebrow">{t["destinations.eyebrow"]}</p>
          <h2 className="v80-h2">{t["destinations.title"]}</h2>
        </div>
        <div className="v80-destinations-grid">
          {view.destinations.map((d, i) => {
            const inner = (
              <>
                <div className="v80-frame" style={{ aspectRatio: "3/4", marginBottom: 10, position: "relative", borderRadius: "var(--v80-radius-sm)" }}>
                  {d.image ? <Image src={d.image} alt={d.name} fill sizes="(max-width:768px) 72vw, 25vw" className="v80-img" unoptimized={!d.image.startsWith("/")} /> : null}
                  <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(26,18,32,0.78) 0%, rgba(26,18,32,0.35) 35%, transparent 60%)" }} />
                  <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(139,92,246,0.14)", mixBlendMode: "multiply" }} />
                  <h3 style={{ position: "absolute", bottom: 10, insetInlineStart: 12, fontSize: "1rem", fontWeight: 600, color: "var(--v80-bg)", letterSpacing: "-0.01em", margin: 0 }}>{d.name}</h3>
                </div>
                <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: d.sameDay ? "#2F7A55" : "var(--v80-ink-subtle)" }}>{d.sameDay ? t["destinations.sameDay"] : t["destinations.cargo"]}</p>
                <p style={{ fontSize: "0.6875rem", color: "var(--v80-ink-subtle)", marginTop: 2 }}>{d.sub}</p>
                {d.districts ? <p style={{ fontSize: "0.6875rem", color: "var(--v80-ink-subtle)", marginTop: 4, letterSpacing: "0.04em" }}>{interp(t["destinations.districts"], { n: d.districts })}</p> : null}
              </>
            );
            return d.href ? (
              <Link key={d.city} href={d.href} data-v80-reveal data-d={i} className="v80-card" style={{ display: "block" }}>{inner}</Link>
            ) : (
              <div key={d.city} data-v80-reveal data-d={i}>{inner}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---- Yolculuk (koyu bölüm) --------------------------------------------------
export function V80Journey({ view }: { view: V80View }) {
  const t = view.texts;
  const steps = [0, 1, 2, 3].map((i) => ({ n: `0${i + 1}`, t: t[`journey.steps.${i}.t`], d: t[`journey.steps.${i}.d`] })).filter((s) => s.t);
  return (
    <section id="journey" style={{ background: "var(--v80-dark)", padding: "0 0 44px", borderTop: "1px solid var(--v80-primary)", scrollMarginTop: 96 }}>
      <div className="v80-wrap">
        <div className="v80-trust-intro-grid">
          <h2 data-v80-reveal className="v80-serif" style={{ fontWeight: 200, fontSize: "clamp(1.5rem, 2.6vw, 2.5rem)", lineHeight: 1.06, letterSpacing: "-0.04em", color: "var(--v80-bg)" }}>
            <span style={{ display: "block" }}>{t["journey.title1"]}</span>
            <em style={{ fontStyle: "italic", color: "rgba(250,248,245,0.25)" }}>{t["journey.title2"]}</em>
          </h2>
          <div data-v80-reveal>
            <p style={{ color: "rgba(250,248,245,0.62)", fontSize: "0.875rem", lineHeight: 1.7, marginBottom: 24, maxWidth: "38ch" }}>{t["journey.body"]}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: i === 0 ? "var(--v80-delivery)" : "var(--v80-on-dark-muted)", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.6875rem", color: "var(--v80-on-dark)", letterSpacing: "0.02em" }}>{t[`journey.bullets.${i}`]}</span>
                </div>
              ))}
            </div>
            {view.journey.href ? (
              <a href={view.journey.href} style={{ display: "inline-flex", alignItems: "center", gap: 12, fontSize: "0.875rem", fontWeight: 500, color: "var(--v80-bg)", textDecoration: "none" }}>
                {t["journey.cta"]}
                <span style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--v80-on-dark-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.875rem" }} aria-hidden="true">↗</span>
              </a>
            ) : null}
          </div>
        </div>
        <div className="v80-journey-grid">
          {steps.map((s, i) => (
            <div key={s.n} data-v80-reveal data-d={i}>
              <p style={{ fontSize: "0.6875rem", color: "var(--v80-on-dark-muted)", letterSpacing: "0.26em", marginBottom: 16 }}>{s.n}</p>
              <p className="v80-serif" style={{ fontSize: "0.9375rem", fontWeight: 400, color: "var(--v80-bg)", marginBottom: 8, letterSpacing: "-0.01em" }}>{s.t}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--v80-on-dark)", lineHeight: 1.7 }}>{s.d}</p>
            </div>
          ))}
        </div>
        <div data-v80-reveal style={{ borderTop: "1px solid rgba(250,248,245,0.06)", paddingTop: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
          <p className="v80-serif" style={{ fontStyle: "italic", fontWeight: 200, fontSize: "clamp(1rem, 1.6vw, 1.375rem)", lineHeight: 1.4, letterSpacing: "-0.02em", color: "var(--v80-on-dark)", maxWidth: "52ch" }}>{t["journey.quote"]}</p>
          <div style={{ flexShrink: 0, textAlign: "end" }}>
            <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--v80-on-dark-muted)", marginBottom: 8 }}>{t["journey.help"]}</p>
            <a href={view.whatsapp} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.8125rem", fontWeight: 500, color: "rgba(250,248,245,0.72)", textDecoration: "none" }}>
              <WhatsAppIcon size={14} /> {t["journey.wa"]}
            </a>
            <p style={{ fontSize: "0.6875rem", color: "var(--v80-on-dark-muted)", marginTop: 5, letterSpacing: "0.02em" }}>{t["journey.waNote"]}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 44, borderTop: "1px solid rgba(250,248,245,0.06)", paddingTop: 32, marginTop: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
          {[["1986", t["journey.facts.founded"]], ["100%", t["journey.facts.local"]]].map(([v, l], i) => (
            <div key={l} data-v80-reveal data-d={i}>
              <p className="v80-serif" style={{ fontSize: "2rem", fontWeight: 200, color: "var(--v80-bg)", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 8 }}>{v}</p>
              <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--v80-on-dark-muted)" }}>{l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- Kapanış CTA ------------------------------------------------------------
export function V80Cta({ view }: { view: V80View }) {
  const t = view.texts;
  return (
    <section id="cta" style={{ background: "var(--v80-bg)", borderTop: "1px solid var(--v80-border)", borderBottom: "1px solid var(--v80-border)" }}>
      <div className="v80-wrap v80-cta-grid">
        <div data-v80-reveal>
          <p className="v80-eyebrow">{t["cta.eyebrow"]}</p>
          <h2 className="v80-serif" style={{ fontWeight: 200, fontSize: "clamp(1.75rem, 3vw, 3.25rem)", letterSpacing: "-0.04em", lineHeight: 1.06, color: "var(--v80-ink)", margin: "12px 0 20px" }}>
            <span style={{ display: "block" }}>{t["cta.title1"]}</span>
            <em style={{ fontStyle: "italic", color: "var(--v80-primary)" }}>{t["cta.titleEm"]}</em>
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--v80-ink-muted)", lineHeight: 1.76, maxWidth: 360 }}>{t["cta.body"]}</p>
        </div>
        <div data-v80-reveal style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          {view.ctaHref ? <a href={view.ctaHref} className="v80-btn" style={{ fontWeight: 600, marginTop: 8 }}>{t["cta.button"]}</a> : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--v80-border)" }}>
            {[0, 1].map((i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: i === 0 ? "var(--v80-delivery)" : "var(--v80-ink-subtle)", flexShrink: 0 }} />
                <span style={{ fontSize: "0.6875rem", color: "var(--v80-ink-muted)", letterSpacing: "0.01em" }}>{t[`cta.bullets.${i}`]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- Güven şeridi (4 madde) -------------------------------------------------
export function V80TrustStrip({ view }: { view: V80View }) {
  if (!view.trust.length) return null;
  return (
    <section id="trust" style={{ background: "var(--v80-bg)", borderTop: "1px solid #E0DBD4", borderBottom: "1px solid #E0DBD4" }}>
      <div className="v80-wrap v80-trust-strip-grid">
        {view.trust.map((it) => (
          <div key={it.key}>
            <span style={{ flexShrink: 0, marginTop: 2, color: "var(--v80-primary)", display: "flex" }}><LineIcon name={it.icon as V80Icon} /></span>
            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--v80-ink)", marginBottom: 3, letterSpacing: "-0.01em" }}>{it.title}</p>
              <p style={{ fontSize: "0.6875rem", color: "var(--v80-ink-subtle)", letterSpacing: "0.01em", wordBreak: "break-word" }}>{it.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- SEO içeriği (Global Merkezi 'home' satırı: giriş + alt içerik + SSS) ---
export function V80Content({ view }: { view: V80View }) {
  const t = view.texts;
  const { intro, body, faq } = view.content;
  if (!intro && !body && !faq.length) return null;
  return (
    <section id="content" className="v80-section" style={{ background: "var(--v80-bg)" }}>
      <div className="v80-wrap">
        <div style={{ maxWidth: 720 }}>
          {intro ? <div className={DESC_PROSE} style={{ fontSize: 15, lineHeight: 1.75, color: "var(--v80-ink-muted)" }} dangerouslySetInnerHTML={{ __html: sanitizeProductHtml(intro) }} /> : null}
          {body ? <div className={DESC_PROSE} style={{ marginTop: 24, fontSize: 14, lineHeight: 1.7, color: "var(--v80-ink-muted)" }} dangerouslySetInnerHTML={{ __html: sanitizeProductHtml(body) }} /> : null}
          {faq.length ? (
            <div style={{ marginTop: 32 }}>
              <h2 className="v80-h2" style={{ fontSize: "1.375rem", marginBottom: 14 }}>{t["content.faq"]}</h2>
              {faq.map((f, i) => (
                <details key={i} style={{ marginBottom: 8, border: "1px solid var(--v80-border)", borderRadius: 10, padding: "10px 14px", background: "#fff" }}>
                  <summary style={{ cursor: "pointer", fontSize: 14.5, fontWeight: 600, color: "var(--v80-ink)" }}>{f.q}</summary>
                  <p style={{ fontSize: 14, lineHeight: 1.65, marginTop: 8, color: "var(--v80-ink-muted)" }}>{f.a}</p>
                </details>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
