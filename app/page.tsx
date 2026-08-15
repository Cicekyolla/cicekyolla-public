import type { Metadata } from "next";
import { FloatingCategoryRail } from "../components/home/FloatingCategoryRail";
import { fetchDeliveryZones, fetchProducts, fetchSeoPage, toCardProduct } from "@/lib/api";
import { getCategoryTree } from "@/lib/categories";
import { findCategoryIdBySlug, mapTreeToItems } from "@/lib/catalog";
import { buildCollectionSlider } from "@/lib/collectionSlider";
import { HomeHero } from "../components/home/HomeHero";
import HeroDeliveryBar from "../components/home/HeroDeliveryBar";
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
import { CorporateReferences, type CorporateClients } from "../components/home/CorporateReferences";
import { DistrictDelivery } from "../components/home/DistrictDelivery";
import { WhatsAppCTA } from "../components/home/WhatsAppCTA";
import { Newsletter } from "../components/home/Newsletter";
import { getPublishedHomepage } from "@/lib/homepage";
import { HomepageRenderer } from "../components/home/HomepageRenderer";
import { buildShowcaseFills, getShowcaseSlots } from "@/lib/homepageShowcase";
import { WorkshopToday } from "../components/home/WorkshopToday";
import { MoodPicker } from "../components/home/MoodPicker";
import { FlowerJourney } from "../components/home/FlowerJourney";
import { indexRobots, SITE_URL } from "@/lib/site-config";
import { isLegacyPleskMedia } from "@/lib/media";

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // SEO kurtarma (15 Ağu 2026, operatör onaylı): eski güçlü dönemin Wayback-kanıtlı
  // title'ı geri getirildi — "çiçek yolla" poz ~2 dönemi bu head ile kazanılmıştı.
  title: { absolute: "Çiçek Yolla - Online Çiçek Siparişi - Çiçek Gönder - Çiçekçi" },
  description:
    "Online çiçek siparişi verin, sevdiklerinize güvenle çiçek gönderin. Özel günlere uygun çiçekleri ÇiçekYolla ile kolayca sipariş edin.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "/",
    siteName: "Çiçekyolla",
    title: "Çiçek Yolla - Online Çiçek Siparişi - Çiçek Gönder - Çiçekçi",
    description:
      "Online çiçek siparişi verin, sevdiklerinize güvenle çiçek gönderin. Özel günlere uygun çiçekleri ÇiçekYolla ile kolayca sipariş edin.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "ÇiçekYolla — Premium Çiçekçi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Çiçek Yolla - Online Çiçek Siparişi - Çiçek Gönder - Çiçekçi",
    description: "Online çiçek siparişi verin, sevdiklerinize güvenle çiçek gönderin.",
    images: ["/twitter-image"],
  },
  robots: indexRobots(),
};

/** Organization + WebSite JSON-LD — ZIP Homepage şemasıyla aynı, SSR edilir.
 *  V65 fix: logo artık kırık /logo.png yerine GERÇEK logo URL'sine bağlanır
 *  (CMS hero config.logo_url — admin'in yüklediği logo; yoksa repo'daki marka SVG'si). */
function HomeJsonLd({ logoUrl }: { logoUrl: string }) {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Çiçekyolla",
     foundingDate: "1986",
      slogan: "1986'dan beri, her çiçekte bir usta dokunuşu.",
      knowsAbout: ["Çiçek tasarımı", "Özel tasarım buket ve aranjman", "Saksı bitkileri toptan ve perakende", "Canlı ve yapay çiçek dekorasyonu", "Peyzaj tasarım ve bakım", "Düğün, davet ve kurumsal organizasyon çiçekçiliği", "Online çiçek gönderimi"],
      areaServed: [{ "@type": "City", name: "İstanbul" }, { "@type": "Country", name: "Türkiye" }],
      url: SITE_URL,
      logo: logoUrl,
      description:
        "Çiçekyolla, 1986 yılında kurulan, çiçekçilik sektöründe kırk yıla yaklaşan tecrübeye sahip köklü bir markadır. Özel tasarım buket ve aranjmanlar, saksı bitkileri, düğün ve kurumsal organizasyon çiçekçiliği ile peyzaj tasarımı sunar. İstanbul'da aynı gün, Türkiye genelinde güvenli kargo ile teslimat.",
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+90-507-441-3474",
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
  // Homepage Collections TEK KAYNAK: canlı Category Center ağacı (getCategoryTree).
  const tree = await getCategoryTree();
  const liveItems = tree ? mapTreeToItems(tree) : [];
  // Rail: Hero'dan bağımsız SATIŞ-ODAKLI slider (root+child+grandchild, ≤50).
  const collectionItems = buildCollectionSlider(tree, 50);
  // Kategori kayıtlarında Vercel cutover öncesinden kalan Plesk görseli varsa,
  // aynı kategorideki ilk aktif ve görselli ürünün gerçek CDN/R2 kapağını otomatik
  // kullan. Hardcoded eşleme yoktur; kategori adı/sırası/linki aynen korunur.
  // fetchProducts ISR cache kullanır; ürün bulunamazsa premium placeholder kalır.
  const collections = await Promise.all(
    collectionItems.map(async (item) => {
      if (item.image && !isLegacyPleskMedia(item.image)) return item;
      const categoryId = findCategoryIdBySlug(tree ?? [], item.id);
      if (!categoryId) return { ...item, image: "" };
      const candidates = await fetchProducts({ category_id: categoryId, page_size: 1 });
      const image = candidates.find((product) => product.cover_image_url)?.cover_image_url;
      return { ...item, image: image ?? "" };
    })
  );
  const imagedCollections = liveItems.filter((c) => c.image); // Featured/Occasion görsel ister

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

  // Teslimat Bölgeleri: admin Delivery Motor'daki aktif bölgeler (additive).
  // API erişilemezse [] döner → DistrictDelivery kendi fallback'iyle çalışır.
  const deliveryZones = await fetchDeliveryZones();

  // Kurumsal referanslar ana sayfada Instagram'ın hemen altında gösterilir ve
  // admin > Mağaza Ön Yüzü > Kurumsal kaydından okunur.
  const corporatePage = await fetchSeoPage("/kurumsal");
  const corporateBlocks = corporatePage?.body_blocks ?? [];
  const corporateSettings = corporateBlocks.find((b) => b.type === "corporate-clients-settings");
  const corporateClients: CorporateClients = {
    enabled: corporateSettings?.value === "true",
    eyebrow: String(corporateSettings?.label || "Kurumsal Müşterilerimiz"),
    title: String(corporateSettings?.title || "İş Ortaklarımız ve Kurumsal Çözümlerimiz"),
    description: String(corporateSettings?.text || ""),
    stats: corporateBlocks
      .filter((b) => b.type === "corporate-stat")
      .map((b) => ({ value: String(b.value || ""), label: String(b.title || "") }))
      .filter((item) => item.value && item.label),
    references: corporateBlocks
      .filter((b) => b.type === "corporate-reference" && b.value !== "false")
      .map((b) => ({ title: String(b.title || ""), description: String(b.text || ""), category: String(b.kind || ""), imageUrl: String(b.note || "") }))
      .filter((item) => item.title),
  };

  // CMS: yayınlanan snapshot varsa onu render et (sıra/enabled/zaman penceresi
  // API tarafında uygulanır; ürün bölümleri DTO ürünleriyle ProductCard olarak
  // gelir). Yayın yoksa VEYA API hatasında aşağıdaki mevcut (temizlenmiş)
  // tasarım güvenli biçimde çalışmaya devam eder. Draft ASLA public'e çıkmaz.
  const publishedHomepage = await getPublishedHomepage();

  // V65: Organization schema logosu — CMS hero'daki gerçek logo (admin yüklemesi);
  // yayın/DTO yoksa repo'daki marka SVG'sine düşer. Kırık /logo.png bağı kalktı.
  const heroSection = publishedHomepage?.sections.find((s) => s.type === "hero");
  const cmsLogoUrl = typeof heroSection?.config?.logo_url === "string" ? (heroSection.config.logo_url as string) : null;
  const schemaLogoUrl = cmsLogoUrl ?? `${SITE_URL}/brand/cicekyolla-brand.svg`;

  // V65: her product_showcase başlık/CTA/tema slotunu alır. Yalnız boş vitrin
  // varsa canlı katalog dolgusu için ürün istekleri atılır; tamamı manuelse
  // salt slot metadata'sı kullanılır ve ürün/sıra Admin DTO'sundan aynen kalır.
  const hasShowcases = publishedHomepage?.sections.some(
    (s) => s.enabled && s.type === "product_showcase"
  ) ?? false;
  const needsShowcaseProducts = publishedHomepage?.sections.some(
    (s) => s.enabled && s.type === "product_showcase" && (!s.products || s.products.length === 0)
  ) ?? false;
  const showcaseFills = needsShowcaseProducts
    ? await buildShowcaseFills(tree)
    : hasShowcases
      ? getShowcaseSlots()
      : [];

  if (publishedHomepage && publishedHomepage.sections.length > 0) {
    // Google yorumları + Instagram, kullanıcı kararına göre ana akışın sonunda
    // daima bu sırada yaşar. CMS kaydı varsa config/enabled korunur; iki bölüm
    // renderer'dan çıkarıldığı için duplicate oluşmaz.
    const testimonialsSection = publishedHomepage.sections.find(
      (section) => section.type === "testimonials"
    );
    const instagramSection = publishedHomepage.sections.find(
      (section) => section.type === "instagram_gallery"
    );
    const contentHomepage = {
      ...publishedHomepage,
      sections: publishedHomepage.sections.filter(
        (section) =>
          section.type !== "testimonials" &&
          section.type !== "instagram_gallery"
      ),
    };
    const showTestimonials = testimonialsSection?.enabled !== false;
    const showInstagram = instagramSection?.enabled !== false;

    return (
      <>
        <HomeJsonLd logoUrl={schemaLogoUrl} />
        <HomepageRenderer dto={contentHomepage} ctx={{ collections, imagedCollections, zones: deliveryZones, showcaseFills }} />
        {showTestimonials && <Testimonials />}
        {showInstagram && <InstagramGallery config={instagramSection?.config} />}
        <CorporateReferences clients={corporateClients} />
        {/* Çiçeğin Yolculuğu — vitrinlerden sonra, footer'dan hemen önce (Figma Servis Deneyimi) */}
        <FlowerJourney />
      </>
    );
  }

  return (
    <>
      <HomeJsonLd logoUrl={schemaLogoUrl} />

      {/* §Koleksiyonlar — bağımsız section: Header'dan sonra, Hero'dan önce (TazeÇiçek düzeni).
          Hero'ya absolute/floating bağlı DEĞİL; normal akışta yatay slider.
          SPACING FIX: alt boşluk (pb) sıfırlandı → dark Hero slider'ın HEMEN altında başlar,
          aradaki beyaz gap kalkar, geçiş tek akış görünür. Üstte pt-5 (header'dan hafif nefes). */}
      <section aria-label="Koleksiyonlar" className="bg-white pt-5 pb-0">
        <FloatingCategoryRail items={collections} variant="light" allHref="/kategori/koleksiyonlar" />
      </section>

      <HeroDeliveryBar />
      <HomeHero />
      {/* V65: Atölyeden Bugün — hero'nun hemen ardından (CMS'siz fallback'te de) */}
      <WorkshopToday />
      <TrustBar />
      <Manifesto />
      <FeaturedCollections items={imagedCollections} />
      <UrgencyStrip />
      <FeatureSplit />
      <SameDayDelivery />
      <OccasionShopping items={imagedCollections} />
      {/* V65: Duyguna Göre Seç — occasion_shopping'in ardından (CMS'siz fallback'te de) */}
      <MoodPicker />
      <BestSellers products={bestSellers} />
      <EditorsPicks products={editorPicks} />
      <BrandStory />
      <Testimonials />
      <InstagramGallery />
      <CorporateReferences clients={corporateClients} />
      <DistrictDelivery zones={deliveryZones} />
      <WhatsAppCTA />
      <Newsletter />
      {/* Çiçeğin Yolculuğu — footer'dan hemen önce (CMS'siz fallback'te de aynı konum) */}
      <FlowerJourney />
    </>
  );
}
