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

export interface RenderCtx {
  collections: ComponentProps<typeof FloatingCategoryRail>["items"];
  imagedCollections: ComponentProps<typeof FeaturedCollections>["items"];
}

function renderSection(s: HpSection, ctx: RenderCtx) {
  switch (s.type) {
    case "collection_rail":
      return <section aria-label="Koleksiyonlar" className="bg-white pt-5 pb-0"><FloatingCategoryRail items={ctx.collections} /></section>;
    case "hero_delivery_bar":   return <HeroDeliveryBar />;
    case "hero":               return <HomeHero />;
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
    case "district_delivery":   return <DistrictDelivery />;
    case "whatsapp_cta":        return <WhatsAppCTA />;
    case "newsletter":          return <Newsletter />;
    case "product_showcase":    return <ProductShowcase title={s.title?.trim() ? s.title : "Sizin İçin Seçtiklerimiz"} subtitle={s.subtitle?.trim() ? s.subtitle : "Her ana yakışan, özenle seçilmiş tasarımlar."} products={s.products} limit={16} />;
    default:                    return null;
  }
}

export function HomepageRenderer({ dto, ctx }: { dto: HomepageDTO; ctx: RenderCtx }) {
  const enabledSections = dto.sections.filter((s) => s.enabled);
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
          {renderSection(s, ctx)}
          {!hasUrgencyStrip && s.type === "featured_collections" ? <UrgencyStrip /> : null}
          {!hasEditorsPicks && s.type === editorFallbackAnchor ? <EditorsPicks config={{}} /> : null}
          {!hasFeatureSplit && s.type === fallbackAnchor ? <FeatureSplit /> : null}
        </Fragment>
      ))}
      {!hasEditorsPicks && editorFallbackAnchor === null ? <EditorsPicks config={{}} /> : null}
      {!hasFeatureSplit && fallbackAnchor === null ? <FeatureSplit /> : null}
    </>
  );
}
