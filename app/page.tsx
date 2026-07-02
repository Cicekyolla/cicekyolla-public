import type { Metadata } from "next";
import { FloatingCategoryRail } from "../components/home/FloatingCategoryRail";
import { HomeHero } from "../components/home/HomeHero";
import { TrustBar } from "../components/home/TrustBar";

/**
 * Ana sayfa (/) — 8B-2.2 Homepage.
 *
 * SAYFA SIRASI (spec section-order fix):
 *   Announcement Bar + Header (layout, LOCKED)
 *   → §Koleksiyon Slider (bağımsız section, Header'dan sonra / Hero'dan önce — TazeÇiçek düzeni)
 *   → §Hero Banner
 *   → §USP / Güven (TrustBar)
 *   → … (§Kampanyalar, vitrinler, sıradaki adımlar)
 *
 * Mimari:
 * - Bu dosya SERVER component → SEO metadata + JSON-LD SSR (SEO First, dokunulmadı).
 * - Header/Footer BURADA render EDİLMEZ; app/layout.tsx sarıyor (8B-2.1, LOCKED).
 * - Koleksiyon slider artık Hero'ya bağlı DEĞİL; kendi section'ında bağımsız akışta.
 */

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cicekyolla-public.vercel.app"
).replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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

/** Organization + WebSite JSON-LD — ZIP Homepage şemasıyla aynı, SSR edilir. */
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

      {/* §Koleksiyonlar — bağımsız section: Header'dan sonra, Hero'dan önce (TazeÇiçek düzeni).
          Hero'ya absolute/floating bağlı DEĞİL; normal akışta yatay slider.
          SPACING FIX: alt boşluk (pb) sıfırlandı → dark Hero slider'ın HEMEN altında başlar,
          aradaki beyaz gap kalkar, geçiş tek akış görünür. Üstte pt-5 (header'dan hafif nefes). */}
      <section aria-label="Koleksiyonlar" className="bg-white pt-5 pb-0">
        <FloatingCategoryRail />
      </section>

      <HomeHero />
      <TrustBar />
    </>
  );
}
