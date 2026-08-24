// ============================================================================
// GLOBAL Faz 1 — locale sayfa motoru (server components).
// app/de/[[...path]] ve app/en/[[...path]] ince sarmalayıcıları buraya gelir.
//
// SEO kuralları (kanun):
//  - URL locale = SEO source of truth (cookie sunum tercihidir, HTML'i değiştirmez).
//  - Self-canonical; TR canonical koduna dokunulmaz.
//  - robots: yalnız approved + indexable yüzeyler index; geri kalan her şey
//    noindex (kontrollü index açılışı — Faz 11 kapısı).
//  - hreflang: yalnız GERÇEK yayınlanmış (approved + indexable) locale
//    karşılıkları arasında; TR return-link'i Faz 4'te TR sayfalarına
//    eklenene kadar TR cluster'a DAHİL EDİLMEZ (tek yönlü hreflang üretmeyiz).
//    x-default körlemesine eklenmez.
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
} from "./config";
import { fetchProductSurface, fetchProductLocaleCluster } from "./api";

// Foundation placeholder metinleri — SERP araştırmasındaki gerçek sorgu diliyle
// (Fleurop H1 kalıpları); Faz 5'te doğal içerikle değişecek. Bu sayfalar noindex.
const HOME_COPY: Record<GlobalLocale, { title: string; h1: string; p: string; note: string }> = {
  de: {
    title: "ÇiçekYolla — Blumen nach Istanbul verschicken",
    h1: "Blumen nach Istanbul verschicken",
    p: "ÇiçekYolla ist ein Blumenladen in Istanbul. Taggleiche Lieferung in Istanbul, türkeiweiter Versand in 1–3 Werktagen.",
    note: "Diese Seite befindet sich im Aufbau.",
  },
  en: {
    title: "ÇiçekYolla — Send Flowers to Istanbul",
    h1: "Send Flowers to Istanbul",
    p: "ÇiçekYolla is a florist based in Istanbul. Same-day delivery in Istanbul, nationwide shipping across Turkey in 1–3 business days.",
    note: "This page is under construction.",
  },
};

const NOINDEX = { index: false, follow: false } as const;

function langOf(locale: GlobalLocale): string {
  return locale;
}

// ---- Metadata -------------------------------------------------------------

export async function localeMetadata(locale: GlobalLocale, path: string[]): Promise<Metadata> {
  const parsed = parseLocalePath(locale, path);

  if (parsed.kind === "home") {
    const copy = HOME_COPY[locale];
    return {
      title: copy.title,
      robots: NOINDEX,
      alternates: { canonical: absoluteUrl(`/${locale}`) },
    };
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
    // hreflang: yalnız indexable sayfada ve yalnız indexable karşılıklarla.
    if (surface.indexable) {
      const cluster = await fetchProductLocaleCluster(surface.product_id);
      const languages: Record<string, string> = {};
      for (const alt of cluster?.locales ?? []) {
        if (alt.indexable && isGlobalLocale(alt.locale)) {
          languages[langOf(alt.locale)] = absoluteUrl(localeProductPath(alt.locale, alt.slug));
        }
      }
      // Tek sayfalık "cluster" hreflang üretmez (kendinden başka üye yoksa).
      if (Object.keys(languages).length > 1) {
        meta.alternates = { canonical: self, languages };
      }
    }
    return meta;
  }

  return { robots: NOINDEX };
}

// ---- Sayfa ---------------------------------------------------------------

export async function LocalePage({ locale, path }: { locale: GlobalLocale; path: string[] }) {
  const parsed = parseLocalePath(locale, path);

  if (parsed.kind === "home") {
    const copy = HOME_COPY[locale];
    return (
      <main lang={langOf(locale)} dir="ltr" style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px" }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>{copy.h1}</h1>
        <p style={{ fontSize: 15, lineHeight: 1.6 }}>{copy.p}</p>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 24 }}>{copy.note}</p>
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
      <main lang={langOf(locale)} dir="ltr" style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px" }}>
        <h1 style={{ fontSize: 26, marginBottom: 12 }}>{surface.name ?? surface.tr_slug}</h1>
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
        {surface.short_description ? (
          <p style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 12 }}>{surface.short_description}</p>
        ) : null}
        {surface.long_description ? (
          <div
            style={{ fontSize: 14, lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: surface.long_description }}
          />
        ) : null}
        <p style={{ marginTop: 32 }}>
          <Link href={`/urun/${surface.tr_slug}`} style={{ fontSize: 13, color: "#8B5CF6" }}>
            {locale === "de" ? "Auf Türkisch ansehen / bestellen" : "View / order in Turkish"}
          </Link>
        </p>
      </main>
    );
  }

  notFound();
}
