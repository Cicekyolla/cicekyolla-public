// ============================================================================
// HomepageRenderer.tsx — Homepage CMS allowlist section registry/renderer.
// 20 section_type → gerçek mevcut bileşenlere bağlanır. Sıra/enabled/zaman
// penceresi API public DTO'sunda zaten uygulanmıştır; renderer DTO sırasını
// birebir izler ve savunmacı olarak enabled=false'ı atlar. product bölümleri
// gerçek ProductCard (ProductShowcase) ile, DTO'daki manuel sırayla render edilir.
// ============================================================================
import { Fragment } from "react";
import type { ComponentProps } from "react";
import type { HomepageDTO, HpSection } from "@/lib/homepage";
import type { DeliveryZoneCity } from "@/lib/api";

import { FloatingCategoryRail } from "./FloatingCategoryRail";
import HeroDeliveryBar from "./HeroDeliveryBar";
import { HomeHero } from "./HomeHero";
import { TrustBar } from "./TrustBar";
import { Manifesto } from "./Manifesto";
import { FeaturedCollections } from "./FeaturedCollections";
import { UrgencyStrip } from "./UrgencyStrip";
import { FeatureSplit } from "./FeatureSplit";
import { SameDayDelivery } from "./SameDayDelivery";
import { OccasionShopping } from "./OccasionShopping";
import { BrandStory } from "./BrandStory";
import { Testimonials } from "./Testimonials";
import { InstagramGallery } from "./InstagramGallery";
import { CorporateReferences } from "./CorporateReferences";
import { DistrictDelivery } from "./DistrictDelivery";
import { WhatsAppCTA } from "./WhatsAppCTA";
import { Newsletter } from "./Newsletter";
import { ProductShowcase } from "./ProductShowcase";
import { EditorsPicks } from "./EditorsPicks";
import { WorkshopToday } from "./WorkshopToday";
import { MoodPicker } from "./MoodPicker";
import type { ShowcaseFill } from "@/lib/homepageShowcase";

export interface RenderCtx {
  collections: ComponentProps<typeof FloatingCategoryRail>["items"];
  imagedCollections: ComponentProps<typeof FeaturedCollections>["items"];
  /** Teslimat bölgeleri (admin Delivery Motor) — DistrictDelivery tüketir (additive, opsiyonel). */
  zones?: DeliveryZoneCity[];
  /** V65: product_showcase bölümlerinin sıralı tema ailesi ve boş vitrin dolguları.
      DTO'da ürün VARSA DTO kazanır — admin üstünlüğü korunur. */
  showcaseFills?: ShowcaseFill[];
}

function renderSection(s: HpSection, ctx: RenderCtx, fill?: ShowcaseFill) {
  switch (s.type) {
    case "collection_rail":
      return <section aria-label="Koleksiyonlar" className="bg-white pt-5 pb-0"><FloatingCategoryRail items={ctx.collections} /></section>;
    case "hero_delivery_bar":   return <HeroDeliveryBar />;
    case "hero":               return <HomeHero config={s.config} />;
    case "trust_bar":           return <TrustBar />;
    case "manifesto":           return <Manifesto />;
    case "featured_collections":return <FeaturedCollections items={ctx.imagedCollections} config={s.config} />;
    case "urgency_strip":       return <UrgencyStrip title={s.title} subtitle={s.subtitle} config={s.config} />;
    case "feature_split":       return <FeatureSplit />;
    case "same_day_delivery":   return <SameDayDelivery />;
    case "occasion_shopping":   return <OccasionShopping items={ctx.imagedCollections} config={s.config} title={s.title} subtitle={s.subtitle} />;
    case "best_sellers":        return <ProductShowcase title={s.title?.trim() && s.title.trim() !== "Çok Satanlar" ? s.title : "En Çok Tercih Edilenler"} subtitle={s.subtitle ?? "Müşterilerimizin favori çiçekleri."} products={s.products} />;
    case "editors_picks":       return <EditorsPicks title={s.title} subtitle={s.subtitle} config={s.config} />;
    case "brand_story":         return <BrandStory />;
    case "testimonials":        return <Testimonials />;
    case "instagram_gallery":   return <InstagramGallery config={s.config} />;
    case "corporate_references":return <CorporateReferences />;
    case "district_delivery":   return <DistrictDelivery zones={ctx.zones} />;
    case "whatsapp_cta":        return <WhatsAppCTA />;
    case "newsletter":          return <Newsletter />;
    case "product_showcase": {
      const normalizeLimit = (v: unknown): number => {
        const n = Number(v);
        return [4, 8, 12].includes(n) ? n : 12;
      };
      const rule = s.config?.rule as { limit?: number } | undefined;
      const limit = normalizeLimit(rule?.limit ?? 12);
      const mode = s.selection_mode as 'manual' | 'rule' | 'hybrid' | undefined;

      let products = s.products ?? [];
      // V65 görsel ailesi vitrin sırasına aittir; ürün kaynağına değil.
      // Böylece Admin'den manuel seçilen gerçek ürünler de Orkide/Fırsat/
      // Botanik/Premium atmosferini korur. Ürün ve sıra üstünlüğü yine DTO'dadır.
      let theme = fill?.theme;
      let title = s.title?.trim() ? s.title.trim() : undefined;
      let subtitle = s.subtitle?.trim() ? s.subtitle.trim() : undefined;
      let ctaLabel = fill?.ctaLabel;
      let ctaHref = fill?.ctaHref;

      // Eski CMS genel placeholder'ı ilk seçki dışında V65 vitrin adını ezmesin.
      // Gerçek, özel Admin başlıkları değişmeden öncelikli kalır.
      const isGeneralFill = fill?.title === "Sizin İçin Seçtiklerimiz";
      if (fill && !isGeneralFill && title === "Sizin İçin Seçtiklerimiz") title = undefined;
      if (
        fill && !isGeneralFill &&
        (subtitle === "Her ana yakışan, özenle seçilmiş tasarımlar." ||
         subtitle === "Her ana yakışan, özenle seçilmiş premium tasarımlar.")
      ) subtitle = undefined;

      title ??= fill?.title;
      subtitle ??= fill?.subtitle;

      // manual: sadece DTO ürünleri, limit kadar
      if (mode === 'manual') {
        products = (s.products ?? []).slice(0, limit);
      }
      // rule: sadece auto-fill, limit kadar
      else if (mode === 'rule' && fill && fill.products.length > 0) {
        products = fill.products.slice(0, limit);
        theme = fill.theme;
        title ??= fill.title;
        subtitle ??= fill.subtitle;
        ctaLabel = fill.ctaLabel;
        ctaHref = fill.ctaHref;
      }
      // hybrid: manual first, then fill tamamlanır
      else if (mode === 'hybrid' && fill && fill.products.length > 0) {
        const seen = new Set((s.products ?? []).map(p => p.id));
        const manual = (s.products ?? []).slice(0, limit);
        const auto = fill.products.filter(p => !seen.has(p.id)).slice(0, limit - manual.length);
        products = [...manual, ...auto];
        theme = fill.theme;
        title ??= fill.title;
        subtitle ??= fill.subtitle;
        ctaLabel = fill.ctaLabel;
        ctaHref = fill.ctaHref;
      }
      // fallback (no mode / boş): rule-like behavior
      else if (fill && fill.products.length > 0) {
        products = fill.products.slice(0, limit);
        theme = fill.theme;
        title ??= fill.title;
        subtitle ??= fill.subtitle;
        ctaLabel = fill.ctaLabel;
        ctaHref = fill.ctaHref;
      }

      return (
        <ProductShowcase
          title={title ?? "Sizin İçin Seçtiklerimiz"}
          subtitle={subtitle ?? "Her ana yakışan, özenle seçilmiş tasarımlar."}
          products={products}
          limit={limit}
          ctaLabel={ctaLabel}
          ctaHref={ctaHref}
          theme={theme}
        />
      );
    }
    default:                    return null;
  }
}

export function HomepageRenderer({ dto, ctx }: { dto: HomepageDTO; ctx: RenderCtx }) {
  const enabledSections = dto.sections.filter((s) => s.enabled);
  // V65 vitrin ailesi tüm product_showcase bölümlerine sırayla eşlenir
  // (A Orkide → B Fırsat → C Saksı → D Premium). Admin'de ürün varsa
  // yalnız ürün kaynağı DTO olur; görsel tema ve güvenli başlık fallback'i kalır.
  const pendingFills = [...(ctx.showcaseFills ?? [])];
  const fillAssign = new Map<number, ShowcaseFill>();
  for (const s of enabledSections) {
    if (s.type === "product_showcase") {
      const fill = pendingFills.shift();
      if (fill) fillAssign.set(s.id, fill);
    }
  }
  // V65 premium bölüm çapaları: Atölyeden Bugün hero'nun hemen ardından,
  // Duyguna Göre Seç occasion_shopping'in (yoksa best_sellers'ın) ardından.
  const hasHeroSection = enabledSections.some((s) => s.type === "hero");
  const moodAnchor = enabledSections.some((s) => s.type === "occasion_shopping")
    ? "occasion_shopping"
    : enabledSections.some((s) => s.type === "best_sellers")
      ? "best_sellers"
      : null;
  const hasCollectionRail = enabledSections.some((s) => s.type === "collection_rail");
  const hasFeatureSplit = enabledSections.some((s) => s.type === "feature_split");
  const hasUrgencyStrip = enabledSections.some((s) => s.type === "urgency_strip");
  const hasEditorsPicks = enabledSections.some((s) => s.type === "editors_picks");
  const editorFallbackAnchor = enabledSections.some((s) => s.type === "best_sellers")
    ? "best_sellers"
    : enabledSections.some((s) => s.type === "occasion_shopping")
      ? "occasion_shopping"
      : null;
  const fallbackAnchor = enabledSections.some((s) => s.type === "urgency_strip")
    ? "urgency_strip"
    : enabledSections.some((s) => s.type === "featured_collections")
      ? "featured_collections"
      : null;

  return (
    <>
      {/* Koleksiyon rayı header ile hero arasındaki temel vitrin öğesidir.
          CMS sürümünde kayıt yoksa kaybolmaz; kayıt varsa ikinci kez gösterilmez. */}
      {!hasCollectionRail ? (
        <section aria-label="Koleksiyonlar" className="bg-white pt-5 pb-0">
          <FloatingCategoryRail items={ctx.collections} />
        </section>
      ) : null}
      {enabledSections.map((s) => (
        <Fragment key={s.id}>
          {renderSection(s, ctx, fillAssign.get(s.id))}
          {s.type === "hero" ? <WorkshopToday /> : null}
          {moodAnchor && s.type === moodAnchor ? <MoodPicker /> : null}
          {!hasUrgencyStrip && s.type === "featured_collections" ? <UrgencyStrip /> : null}
          {!hasEditorsPicks && s.type === editorFallbackAnchor ? <EditorsPicks config={{}} /> : null}
          {!hasFeatureSplit && s.type === fallbackAnchor ? <FeatureSplit /> : null}
        </Fragment>
      ))}
      {!hasHeroSection ? <WorkshopToday /> : null}
      {moodAnchor === null ? <MoodPicker /> : null}
      {!hasEditorsPicks && editorFallbackAnchor === null ? <EditorsPicks config={{}} /> : null}
      {!hasFeatureSplit && fallbackAnchor === null ? <FeatureSplit /> : null}
    </>
  );
}
