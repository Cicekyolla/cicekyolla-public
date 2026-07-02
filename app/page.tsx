import type { Metadata } from "next";
import { HomeHero } from "../components/home/HomeHero";

/**
 * Ana sayfa (/) — 8B-2.2 Homepage, Adım 1: Hero.
 *
 * Mimari:
 * - Bu dosya SERVER component'tir → SEO metadata + JSON-LD server-side üretilir (SSR, SEO First).
 * - Header/Footer BURADA render EDİLMEZ; app/layout.tsx zaten sarmalıyor (8B-2.1, LOCKED).
 * - İnteraktif Hero (parallax / Ken Burns / motion) → ayrı client component: components/home/HomeHero.
 *
 * Not: Homepage SEO API'den beslenmez (mahalle/kategori değil). Tanıtım sayfasıdır.
 */

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cicekyolla-public.vercel.app"
).replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // absolute → layout'ta bir title template varsa dahi ana sayfa başlığını override eder.
  title: { absolute: "Çiçekyolla — Premium Çiçek & Aynı Gün Teslimat" },
  description:
    "Türkiye'nin en prestijli çiçek markası. Özenle seçilmiş premium aranjmanlar, zarif paketleme, aynı gün teslimat ve 81 ile ücretsiz kargo.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/",
    siteName: "Çiçekyolla",
    title: "Çiçekyolla — Premium Çiçek & Aynı Gün Teslimat",
    description:
      "Premium aranjmanlar, zarif paketleme, aynı gün teslimat. Her duygu bir çiçekle anlam kazanır.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Çiçekyolla — Premium Çiçek & Aynı Gün Teslimat",
    description: "Premium aranjmanlar, zarif paketleme, aynı gün teslimat.",
  },
  robots: { index: true, follow: true },
};

/** Organization + WebSite JSON-LD — ZIP Homepage şemasıyla aynı, fakat SSR edilir. */
function HomeJsonLd() {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Çiçekyolla",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      description:
        "Türkiye'nin premium çiçek ve hediye markası. Aynı gün teslimat, 81 ile kargo.",
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+90-555-123-45-67",
        contactType: "customer service",
        availableLanguage: "Turkish",
      },
      sameAs: [
        "https://instagram.com/cicekyolla",
        "https://facebook.com/cicekyolla",
      ],
      address: {
        "@type": "PostalAddress",
        addressCountry: "TR",
        addressLocality: "İstanbul",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Çiçekyolla",
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/arama?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function HomePage() {
  return (
    <>
      <HomeJsonLd />
      <HomeHero />
    </>
  );
}
