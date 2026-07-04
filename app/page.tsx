import type { Metadata } from "next";
import { FloatingCategoryRail } from "../components/home/FloatingCategoryRail";
import { fetchCategoryTree, fetchProducts, toCardProduct } from "@/lib/api";
import { mapTreeToItems } from "@/lib/catalog";
import { HomeHero } from "../components/home/HomeHero";
import { TrustBar } from "../components/home/TrustBar";
import { Manifesto } from "../components/home/Manifesto";
import { FeaturedCollections } from "../components/home/FeaturedCollections";
import { UrgencyStrip } from "../components/home/UrgencyStrip";
import { FeatureSplit } from "../components/home/FeatureSplit";
import { SameDayDelivery } from "../components/home/SameDayDelivery";
import { OccasionShopping } from "../components/home/OccasionShopping";
import { BestSellers } from "../components/home/BestSellers";
import { EditorsPicks, type EditorPick } from "../components/home/EditorsPicks";
import { BrandStory } from "../components/home/BrandStory";
import { Testimonials } from "../components/home/Testimonials";
import { InstagramGallery } from "../components/home/InstagramGallery";
import { CorporateReferences } from "../components/home/CorporateReferences";
import { DistrictDelivery } from "../components/home/DistrictDelivery";
import { WhatsAppCTA } from "../components/home/WhatsAppCTA";
import { Newsletter } from "../components/home/Newsletter";

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

export default async function HomePage() {
  // Homepage Collections TEK KAYNAK: canlı Category Center ağacı; yetersizse fallback.
  const tree = await fetchCategoryTree();
  const liveItems = tree ? mapTreeToItems(tree) : [];
  const collections = liveItems.length >= 4 ? liveItems : undefined;

  // Çok Satan rail'i: canlı katalogdan (admin Ürün Merkezi > Çok Satan toggle'ı).
  // Kayıt yoksa boş → BestSellers bölümü kendini gizler (mock YOK).
  const bestSellerRows = await fetchProducts({ is_bestseller: true, page_size: 8 });
  const bestSellers = bestSellerRows
    .filter((p) => p.cover_image_url) // görselsiz ürün ana sayfada öne çıkmaz
    .map(toCardProduct);

  // Editör Seçimi rail'i: canlı katalogdan (admin > Öne Çıkan). Yetersizse mevcut
  // editorial korunur (regresyon YOK). Layout 3 kart → görselli öne çıkanları al.
  const featuredRows = await fetchProducts({ is_featured: true, page_size: 6 });
  const editorPicks: EditorPick[] = featuredRows
    .filter((p) => p.cover_image_url)
    .slice(0, 3)
    .map((p, i) => {
      const hasSale = p.sale_price_minor != null && Number(p.sale_price_minor) > 0 && Number(p.sale_price_minor) < Number(p.price_minor);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        subtitle: `Editör No. 0${i + 1}`,
        price: Math.round((hasSale ? Number(p.sale_price_minor) : Number(p.price_minor)) / 100),
        badge: p.is_new ? "Yeni" : "Editör Seçimi",
        image: p.cover_image_url as string,
      };
    });

  return (
    <>
      <HomeJsonLd />

      {/* §Koleksiyonlar — bağımsız section: Header'dan sonra, Hero'dan önce (TazeÇiçek düzeni).
          Hero'ya absolute/floating bağlı DEĞİL; normal akışta yatay slider.
          SPACING FIX: alt boşluk (pb) sıfırlandı → dark Hero slider'ın HEMEN altında başlar,
          aradaki beyaz gap kalkar, geçiş tek akış görünür. Üstte pt-5 (header'dan hafif nefes). */}
      <section aria-label="Koleksiyonlar" className="bg-white pt-5 pb-0">
        <FloatingCategoryRail items={collections} />
      </section>

      <HomeHero />
      <TrustBar />
      <Manifesto />
      <FeaturedCollections />
      <UrgencyStrip />
      <FeatureSplit />
      <SameDayDelivery />
      <OccasionShopping />
      <BestSellers products={bestSellers} />
      <EditorsPicks products={editorPicks} />
      <BrandStory />
      <Testimonials />
      <InstagramGallery />
      <CorporateReferences />
      <DistrictDelivery />
      <WhatsAppCTA />
      <Newsletter />
    </>
  );
}
