"use client";
// ============================================================================
// GLOBAL VERSION 80 — başlık (Figma birebir): logo · arama · WhatsApp · para
// birimi · dil · sepet + alışveriş navigasyonu (o dilde canlı kategoriler).
// Motorlar mevcut: /api/search (canlı katalog), useCart (mevcut sepet),
// useCurrency (mevcut kur motoru), LanguageSelector (mevcut 14-dil seçici).
// ============================================================================
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import { useCurrency, CURRENCIES, type Currency } from "@/lib/currency";
import { Num } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import { SEGMENTS, type GlobalLocale } from "@/lib/global/config";
import { BrandMark, WhatsAppIcon, SearchIcon, BagIcon, MenuIcon } from "./V80Icons";

export interface V80HeaderProps {
  locale: GlobalLocale;
  nav: { key: string; label: string; href: string }[];
  /** header.* metinleri (13 dil varsayılan + admin geçersiz kılması). */
  t: Record<string, string>;
  whatsapp: string;
  /** TR slug → o dildeki ürün slug'ı (arama sonucu locale PDP'ye gitsin). */
  localeSlugByTr: Record<string, string>;
}

interface SearchProduct { slug: string; name: string; cover_image_url: string | null; price_minor: number | string }

const CURRENCY_ORDER: Currency[] = ["USD", "EUR", "TRY"];

export function V80Header({ locale, nav, t, whatsapp, localeSlugByTr }: V80HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { money, currency, available, setCurrency, ready } = useCurrency();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const [results, setResults] = useState<SearchProduct[] | null>(null);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const seg = SEGMENTS[locale];

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 80);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // Mevcut arama motoru (/api/search → canlı katalog), 250 ms debounce, ≥2 karakter.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(null); return; }
    let alive = true;
    const id = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        const j = (await r.json()) as { products?: SearchProduct[] };
        if (alive) setResults(Array.isArray(j.products) ? j.products : []);
      } catch {
        if (alive) setResults([]);
      }
    }, 250);
    return () => { alive = false; window.clearTimeout(id); };
  }, [q]);

  useEffect(() => { setMenuOpen(false); setMobileSearch(false); setFocus(false); setQ(""); }, [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setFocus(false); setMenuOpen(false); setActive(-1); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { setActive(-1); }, [q]);

  const productHref = useCallback((trSlug: string) => {
    const ls = localeSlugByTr[trSlug];
    return ls ? `/${locale}/${seg.product}/${ls}` : `/urun/${trSlug}`;
  }, [localeSlugByTr, locale, seg.product]);

  const submit = useCallback(() => {
    const term = q.trim();
    if (!term) return;
    if (active >= 0 && results && results[active]) { router.push(productHref(results[active].slug)); return; }
    router.push(`/arama?q=${encodeURIComponent(term)}`);
  }, [q, active, results, router, productHref]);

  const currencies = useMemo(() => CURRENCY_ORDER.filter((c) => available.includes(c)), [available]);
  const showCurrency = ready && currencies.length > 1;
  const panelOpen = focus && q.trim().length >= 2;

  return (
    <>
      <header style={{ position: "sticky", top: 0, zIndex: 400 }} onMouseLeave={() => undefined}>
        <a href="#main-content" className="v80-sr">{t["header.skip"]}</a>
        <div className={`v80-header-bar${scrolled ? " scrolled" : ""}`}>
          <button type="button" className="v80-mobile-only" aria-label={menuOpen ? t["header.closeMenu"] : t["header.menu"]} aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", color: "var(--v80-ink)" }}>
            <MenuIcon />
          </button>
          <Link href={`/${locale}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", justifySelf: "start" }} aria-label="ÇiçekYolla">
            <BrandMark size={22} color="var(--v80-primary)" />
            <span className="v80-serif" style={{ fontStyle: "italic", fontSize: "1.25rem", fontWeight: 400, color: "var(--v80-ink)", letterSpacing: "-0.03em" }}>çiçekyolla</span>
          </Link>

          <div className="v80-desktop-search" style={{ width: "clamp(300px, 34vw, 560px)", position: "relative" }}>
            <label htmlFor="v80-site-search" className="v80-sr">{t["header.search"]}</label>
            <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5, display: "flex", color: "var(--v80-ink)" }}><SearchIcon /></span>
            <input id="v80-site-search" ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" && results?.length) { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
                else if (e.key === "Enter") { e.preventDefault(); submit(); }
              }}
              placeholder={t["header.search"]} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={panelOpen} aria-controls="v80-search-listbox"
              className="v80-search"
              style={{ width: "100%", height: 34, background: "var(--v80-bg)", border: "1px solid #E6DFEA", borderRadius: "var(--v80-radius-sm)", paddingInline: "34px 36px", fontFamily: "var(--v80-font-ui)", fontSize: "0.75rem", color: "var(--v80-ink)", outline: "none", boxShadow: focus ? "0 0 0 2px #8B5CF640" : "none", letterSpacing: "0.01em" }} />
            {q ? (
              <button type="button" onClick={() => { setQ(""); inputRef.current?.focus(); }} aria-label="×"
                style={{ position: "absolute", insetInlineEnd: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--v80-ink-subtle)", fontSize: "0.875rem", lineHeight: 1, padding: 2 }}>×</button>
            ) : null}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "flex-end", justifySelf: "end" }}>
            <button type="button" className="v80-mobile-only" aria-label={t["header.search"]} onClick={() => setMobileSearch((v) => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", color: "var(--v80-ink)" }}>
              <SearchIcon size={16} />
            </button>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="v80-desktop-only" aria-label={t["header.whatsapp"]}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, minHeight: 44, padding: "0 4px", fontSize: "0.8125rem", fontWeight: 500, color: "var(--v80-ink-muted)", textDecoration: "none", letterSpacing: "0.01em", whiteSpace: "nowrap" }}>
              <WhatsAppIcon /> {t["header.whatsapp"]}
            </a>
            {showCurrency ? (
              <div className="v80-desktop-only" role="group" aria-label={t["header.currency"]} style={{ display: "flex", alignItems: "center", borderInlineStart: "1px solid var(--v80-border)", paddingInlineStart: 12 }}>
                {currencies.map((c, i) => (
                  <button key={c} type="button" onClick={() => setCurrency(c)} aria-pressed={c === currency} aria-label={`${t["header.currency"]}: ${c}`}
                    style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "0.6875rem", letterSpacing: "0.08em", color: c === currency ? "var(--v80-ink)" : "var(--v80-ink-subtle)", fontWeight: c === currency ? 600 : 400, minHeight: 44, padding: "0 6px", borderInlineEnd: i < currencies.length - 1 ? "1px solid var(--v80-border)" : "none" }}>
                    {c}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="v80-desktop-only" style={{ display: "flex", alignItems: "center" }}><LanguageSelector /></div>
            <Link href="/sepet" aria-label={t["header.cart"]} style={{ position: "relative", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--v80-ink)", opacity: 0.8 }}>
              <BagIcon />
              {itemCount > 0 ? (
                <span style={{ position: "absolute", top: 6, insetInlineEnd: 4, minWidth: 16, height: 16, borderRadius: 999, background: "var(--v80-primary-strong)", color: "#fff", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", padding: "0 4px" }}>
                  <Num>{String(itemCount)}</Num>
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        <nav aria-label={t["header.categories"]} className={`v80-shopping-nav${scrolled ? " hidden-nav" : ""}`}>
          {nav.map((n) => (
            <Link key={n.key} href={n.href} className="v80-nav-btn" aria-current={pathname === n.href ? "page" : undefined}>{n.label}</Link>
          ))}
        </nav>

        {mobileSearch ? (
          <div className="v80-mobile-search">
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} role="search">
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} placeholder={t["header.search"]} aria-label={t["header.search"]}
                style={{ width: "100%", height: 44, boxSizing: "border-box", background: "var(--v80-bg2)", border: "1px solid #E0DBD4", borderRadius: "var(--v80-radius-sm)", padding: "0 16px", fontFamily: "var(--v80-font-ui)", fontSize: "0.875rem", color: "var(--v80-ink)", outline: "none" }} />
            </form>
          </div>
        ) : null}

        {menuOpen ? (
          <div className="v80-mobile-menu">
            <nav aria-label={t["header.menu"]}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {nav.map((n) => (
                  <Link key={n.key} href={n.href} onClick={() => setMenuOpen(false)} style={{ borderBottom: "1px solid var(--v80-border)", padding: "16px 0", fontSize: "0.9375rem", color: "var(--v80-ink)", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {n.label}<span aria-hidden="true" style={{ color: "var(--v80-ink-subtle)", fontSize: 12 }}>›</span>
                  </Link>
                ))}
              </div>
              {showCurrency ? (
                <div style={{ marginTop: 28, display: "flex", gap: 8, flexWrap: "wrap" }} role="group" aria-label={t["header.currency"]}>
                  {currencies.map((c) => (
                    <button key={c} type="button" onClick={() => { setCurrency(c); setMenuOpen(false); }} aria-pressed={c === currency}
                      style={{ background: c === currency ? "var(--v80-primary-strong)" : "none", color: c === currency ? "var(--v80-bg)" : "var(--v80-ink-muted)", border: `1px solid ${c === currency ? "var(--v80-primary-strong)" : "var(--v80-border)"}`, borderRadius: 999, padding: "6px 16px", fontFamily: "inherit", fontSize: "0.8125rem", cursor: "pointer" }}>{c}</button>
                  ))}
                </div>
              ) : null}
              <div style={{ marginTop: 20 }}><LanguageSelector /></div>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, fontSize: "0.875rem", fontWeight: 500, color: "var(--v80-ink-muted)", textDecoration: "none" }}>
                <WhatsAppIcon /> {t["header.whatsapp"]}
              </a>
            </nav>
          </div>
        ) : null}
      </header>

      {panelOpen ? (
        <>
          <div className="v80-search-backdrop" onClick={() => { setFocus(false); setActive(-1); }} />
          <div className="v80-search-panel" style={{ top: scrolled ? 72 : 98 }}>
            {results && results.length > 0 ? (
              <>
                <div style={{ padding: "12px 16px 0", borderBottom: "1px solid rgba(224,219,212,0.4)" }}>
                  <p className="v80-eyebrow" style={{ marginBottom: 0, paddingBottom: 10 }}>{t["header.products"]}</p>
                </div>
                <ul id="v80-search-listbox" role="listbox" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {results.map((p, i) => (
                    <li key={p.slug} role="option" aria-selected={active === i} onMouseEnter={() => setActive(i)}>
                      <Link href={productHref(p.slug)} onClick={() => setFocus(false)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", textDecoration: "none", color: "inherit", background: active === i ? "rgba(139,92,246,0.06)" : "transparent", borderTop: i > 0 ? "1px solid rgba(224,219,212,0.35)" : "none" }}>
                        <span style={{ width: 48, height: 48, borderRadius: "var(--v80-radius-sm)", overflow: "hidden", background: "#EDE8E2", flexShrink: 0, display: "block" }}>
                          {p.cover_image_url ? <img src={p.cover_image_url} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
                        </span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: "0.875rem", fontWeight: 500, color: "var(--v80-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                        <span className="v80-serif" style={{ fontSize: "0.875rem", color: "var(--v80-ink)", flexShrink: 0 }}><Num>{money(p.price_minor)}</Num></span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div style={{ borderTop: "1px solid rgba(224,219,212,0.4)", padding: "12px 16px" }}>
                  <button type="button" onClick={submit} className="v80-link-caps" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600, color: "var(--v80-primary)" }}>{t["header.seeAll"]}</button>
                </div>
              </>
            ) : results ? (
              <div style={{ padding: "24px 20px", textAlign: "center" }}>
                <p style={{ fontSize: "0.875rem", color: "var(--v80-ink-subtle)", marginBottom: 8 }}>{t["header.noResults"]}</p>
                {nav.length ? <p style={{ fontSize: "0.8125rem", color: "var(--v80-ink-subtle)" }}>{t["header.popular"]}: {nav.slice(0, 4).map((n) => n.label).join(", ")}</p> : null}
              </div>
            ) : (
              <div style={{ padding: "16px 20px", fontSize: "0.8125rem", color: "var(--v80-ink-subtle)" }}>{t["header.searchHint"]}</div>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}
