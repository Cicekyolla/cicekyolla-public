// ============================================================================
// GLOBAL Faz 2 — locale sayfa motoru (server components).
// app/de/[[...path]] ve app/en/[[...path]] ince sarmalayıcıları buraya gelir.
//
// Sayfa türleri:
//   home                → global_pages 'home' (approved ise DB; yoksa foundation metni)
//   page (istanbul, istanbul/<ilçe>) → global_pages (yalnız approved render)
//   category            → category_translations yüzeyi + locale-içi ürün zinciri
//   product             → product_translations yüzeyi + TR core (fiyat/görsel)
//
// SEO kuralları (kanun):
//  - URL locale = SEO source of truth; self-canonical; TR canonical koduna dokunulmaz.
//  - robots: yalnız approved + indexable yüzeyler index; geri kalan noindex.
//  - hreflang: yalnız GERÇEK yayınlanmış (approved+indexable) karşılıklar arasında,
//    en az 2 üye varsa; TR return-link'i TR sayfalarına eklenene kadar TR cluster'a girmez.
//  - İç bağlantı zinciri locale ailesi İÇİNDE kalır (DE sayfadan TR yüzeyine düşme yok).
// ============================================================================
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { absoluteUrl } from "@/lib/site-config";
import { fetchProductBySlug, formatMinorTRY } from "@/lib/api";
import {
  type GlobalLocale,
  parseLocalePath,
  localeProductPath,
  isGlobalLocale,
  SEGMENTS,
} from "./config";
import {
  fetchProductSurface,
  fetchProductLocaleCluster,
  fetchGlobalPage,
  fetchCategorySurface,
  fetchLocaleCatalog,
  type GlobalPage,
  type LocaleCatalog,
} from "./api";

// Foundation yedek metinleri — global_pages 'home' onaylanana kadar (noindex).
const HOME_FALLBACK: Record<GlobalLocale, { title: string; h1: string; p: string }> = {
  de: {
    title: "ÇiçekYolla — Blumen nach Istanbul verschicken",
    h1: "Blumen nach Istanbul verschicken",
    p: "ÇiçekYolla ist ein Blumenladen in Istanbul. Taggleiche Lieferung in Istanbul, türkeiweiter Versand in 1–3 Werktagen.",
  },
  en: {
    title: "ÇiçekYolla — Send Flowers to Istanbul",
    h1: "Send Flowers to Istanbul",
    p: "ÇiçekYolla is a florist based in Istanbul. Same-day delivery in Istanbul, nationwide shipping across Turkey in 1–3 business days.",
  },
};

const UI: Record<GlobalLocale, { categories: string; popular: string; faq: string; orderCta: string; orderNote: string }> = {
  de: { categories: "Kategorien", popular: "Beliebte Blumen für Istanbul", faq: "Häufige Fragen", orderCta: "Jetzt bestellen →", orderNote: "Die Bestellung wird in unserem Shop abgeschlossen (Türkisch; internationale Visa/Mastercard werden akzeptiert)." },
  en: { categories: "Categories", popular: "Popular flowers for Istanbul delivery", faq: "Frequently asked questions", orderCta: "Order now →", orderNote: "Checkout completes in our store (Turkish; international Visa/Mastercard accepted)." },
};

const NOINDEX = { index: false, follow: false } as const;

// ---- Metadata -------------------------------------------------------------

function pageLanguages(locale: GlobalLocale, row: GlobalPage): Record<string, string> | null {
  if (!row.indexable) return null;
  const languages: Record<string, string> = {};
  for (const alt of row.locales ?? []) {
    if (alt.indexable && isGlobalLocale(alt.locale)) {
      const path = row.page_key === "home" ? `/${alt.locale}` : `/${alt.locale}/${row.page_key}`;
      languages[alt.locale] = absoluteUrl(path);
    }
  }
  return Object.keys(languages).length > 1 ? languages : null;
}

export async function localeMetadata(locale: GlobalLocale, path: string[]): Promise<Metadata> {
  const parsed = parseLocalePath(locale, path);

  if (parsed.kind === "home") {
    const row = await fetchGlobalPage(locale, "home");
    const self = absoluteUrl(`/${locale}`);
    if (!row) {
      return { title: HOME_FALLBACK[locale].title, robots: NOINDEX, alternates: { canonical: self } };
    }
    const languages = pageLanguages(locale, row);
    return {
      title: row.seo_title ?? row.h1 ?? HOME_FALLBACK[locale].title,
      description: row.meta_description ?? undefined,
      robots: row.indexable ? undefined : NOINDEX,
      alternates: languages ? { canonical: self, languages } : { canonical: self },
    };
  }

  if (parsed.kind === "page") {
    const row = await fetchGlobalPage(locale, parsed.key);
    if (!row) return { robots: NOINDEX };
    const self = absoluteUrl(`/${locale}/${row.page_key}`);
    const languages = pageLanguages(locale, row);
    return {
      title: row.seo_title ?? row.h1 ?? undefined,
      description: row.meta_description ?? undefined,
      robots: row.indexable ? undefined : NOINDEX,
      alternates: languages ? { canonical: self, languages } : { canonical: self },
    };
  }

  if (parsed.kind === "category") {
    const surface = await fetchCategorySurface(locale, parsed.slug);
    if (!surface) return { robots: NOINDEX };
    const self = absoluteUrl(`/${locale}/${SEGMENTS[locale].category}/${surface.slug}`);
    const meta: Metadata = {
      title: surface.seo_title ?? surface.name ?? undefined,
      description: surface.meta_description ?? undefined,
      robots: surface.indexable ? undefined : NOINDEX,
      alternates: { canonical: self },
    };
    if (surface.indexable) {
      const languages: Record<string, string> = {};
      for (const alt of surface.locales ?? []) {
        if (alt.indexable && isGlobalLocale(alt.locale)) {
          languages[alt.locale] = absoluteUrl(`/${alt.locale}/${SEGMENTS[alt.locale].category}/${alt.slug}`);
        }
      }
      if (Object.keys(languages).length > 1) meta.alternates = { canonical: self, languages };
    }
    return meta;
  }

  if (parsed.kind === "product") {
    const surface = await fetchProductSurface(locale, parsed.slug);
    if (!surface) return { robots: NOINDEX };
    const self = absoluteUrl(localeProductPath(locale, surface.slug));
    const meta: Metadata = {
      title: surface.seo_title ?? surface.name ?? undefined,
      description: surface.meta_description ?? undefined,
      robots: surface.indexable ? undefined : NOINDEX,
      alternates: { canonical: self },
    };
    if (surface.indexable) {
      const cluster = await fetchProductLocaleCluster(surface.product_id);
      const languages: Record<string, string> = {};
      for (const alt of cluster?.locales ?? []) {
        if (alt.indexable && isGlobalLocale(alt.locale)) {
          languages[alt.locale] = absoluteUrl(localeProductPath(alt.locale, alt.slug));
        }
      }
      if (Object.keys(languages).length > 1) meta.alternates = { canonical: self, languages };
    }
    return meta;
  }

  return { robots: NOINDEX };
}

// ---- Ortak parçalar -------------------------------------------------------

const S = {
  main: { maxWidth: 860, margin: "0 auto", padding: "40px 20px" } as const,
  h1: { fontSize: 28, lineHeight: 1.25, marginBottom: 14 } as const,
  h2: { fontSize: 19, marginTop: 32, marginBottom: 12 } as const,
  p: { fontSize: 15, lineHeight: 1.65 } as const,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 } as const,
  card: { border: "1px solid #E9E5F5", borderRadius: 12, padding: "12px 14px", fontSize: 14, textDecoration: "none", color: "#1F2937", display: "block" } as const,
  chip: { display: "inline-block", border: "1px solid #E9E5F5", borderRadius: 999, padding: "6px 14px", margin: "0 8px 8px 0", fontSize: 13.5, textDecoration: "none", color: "#6D28D9" } as const,
};

function CatalogSections({ locale, catalog }: { locale: GlobalLocale; catalog: LocaleCatalog }) {
  const seg = SEGMENTS[locale];
  const ui = UI[locale];
  return (
    <>
      {catalog.categories.length > 0 && (
        <section>
          <h2 style={S.h2}>{ui.categories}</h2>
          <div>
            {catalog.categories.map((c) => (
              <Link key={c.slug} href={`/${locale}/${seg.category}/${c.slug}`} style={S.chip}>{c.name}</Link>
            ))}
          </div>
        </section>
      )}
      {catalog.products.length > 0 && (
        <section>
          <h2 style={S.h2}>{ui.popular}</h2>
          <div style={S.grid}>
            {catalog.products.slice(0, 12).map((p) => (
              <Link key={p.slug} href={`/${locale}/${seg.product}/${p.slug}`} style={S.card}>{p.name}</Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function FaqSection({ locale, faq }: { locale: GlobalLocale; faq: { q: string; a: string }[] | null }) {
  if (!faq?.length) return null;
  return (
    <section>
      <h2 style={S.h2}>{UI[locale].faq}</h2>
      {faq.map((f, i) => (
        <details key={i} style={{ marginBottom: 8, border: "1px solid #E9E5F5", borderRadius: 10, padding: "10px 14px" }}>
          <summary style={{ cursor: "pointer", fontSize: 14.5, fontWeight: 600 }}>{f.q}</summary>
          <p style={{ ...S.p, marginTop: 8 }}>{f.a}</p>
        </details>
      ))}
    </section>
  );
}

function GlobalPageBody({ locale, row, catalog }: { locale: GlobalLocale; row: GlobalPage; catalog: LocaleCatalog }) {
  return (
    <main lang={locale} dir="ltr" style={S.main}>
      <h1 style={S.h1}>{row.h1}</h1>
      {row.intro_html ? <div style={S.p} dangerouslySetInnerHTML={{ __html: row.intro_html }} /> : null}
      <CatalogSections locale={locale} catalog={catalog} />
      {row.content_html ? (
        <section style={{ marginTop: 32 }}>
          <div style={{ fontSize: 14, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: row.content_html }} />
        </section>
      ) : null}
      <FaqSection locale={locale} faq={row.faq} />
    </main>
  );
}

// ---- Sayfa ---------------------------------------------------------------

export async function LocalePage({ locale, path }: { locale: GlobalLocale; path: string[] }) {
  const parsed = parseLocalePath(locale, path);

  if (parsed.kind === "home") {
    const [row, catalog] = await Promise.all([fetchGlobalPage(locale, "home"), fetchLocaleCatalog(locale)]);
    if (row) return <GlobalPageBody locale={locale} row={row} catalog={catalog} />;
    const copy = HOME_FALLBACK[locale];
    return (
      <main lang={locale} dir="ltr" style={S.main}>
        <h1 style={S.h1}>{copy.h1}</h1>
        <p style={S.p}>{copy.p}</p>
        <CatalogSections locale={locale} catalog={catalog} />
      </main>
    );
  }

  if (parsed.kind === "page") {
    const [row, catalog] = await Promise.all([fetchGlobalPage(locale, parsed.key), fetchLocaleCatalog(locale)]);
    if (!row) notFound();
    return <GlobalPageBody locale={locale} row={row} catalog={catalog} />;
  }

  if (parsed.kind === "category") {
    const surface = await fetchCategorySurface(locale, parsed.slug);
    if (!surface) notFound();
    const seg = SEGMENTS[locale];
    return (
      <main lang={locale} dir="ltr" style={S.main}>
        <h1 style={S.h1}>{surface.name}</h1>
        {surface.description ? <p style={S.p}>{surface.description}</p> : null}
        <div style={{ ...S.grid, marginTop: 24 }}>
          {surface.products.map((p) => (
            <Link key={p.slug} href={`/${locale}/${seg.product}/${p.slug}`} style={S.card}>{p.name}</Link>
          ))}
        </div>
      </main>
    );
  }

  if (parsed.kind === "product") {
    const surface = await fetchProductSurface(locale, parsed.slug);
    if (!surface) notFound();
    const core = await fetchProductBySlug(surface.tr_slug);
    const image = core?.images?.slice().sort((a, b) => a.sort_order - b.sort_order)[0] ?? null;
    const priceMinor = core?.product ? (core.product.sale_price_minor ?? core.product.price_minor) : null;
    return (
      <main lang={locale} dir="ltr" style={{ ...S.main, maxWidth: 720 }}>
        <h1 style={{ ...S.h1, fontSize: 26 }}>{surface.name ?? surface.tr_slug}</h1>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={surface.name ?? image.alt ?? ""}
            style={{ maxWidth: "100%", borderRadius: 12, marginBottom: 16 }}
          />
        ) : null}
        {priceMinor != null ? (
          <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
            <bdi dir="ltr">{formatMinorTRY(priceMinor)}</bdi>
          </p>
        ) : null}
        {surface.short_description ? <p style={{ ...S.p, marginBottom: 12 }}>{surface.short_description}</p> : null}
        {surface.long_description ? (
          <div style={{ fontSize: 14, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: surface.long_description }} />
        ) : null}
        {/* Commerce handoff (kanun §6): içerik zinciri locale'de kalır; satın alma
            bilinçli olarak mevcut TR commerce core'una geçer (checkout localization
            sonraki faz). Bu bir content-fallback değil, sipariş CTA'sıdır. */}
        <div style={{ marginTop: 32 }}>
          <Link
            href={`/urun/${surface.tr_slug}`}
            style={{
              display: "inline-block", background: "#8B5CF6", color: "#fff",
              padding: "12px 28px", borderRadius: 10, fontSize: 15, fontWeight: 700,
              textDecoration: "none",
            }}
          >
            {UI[locale].orderCta}
          </Link>
          <p style={{ fontSize: 11.5, color: "#6b7280", marginTop: 8 }}>{UI[locale].orderNote}</p>
        </div>
      </main>
    );
  }

  notFound();
}
