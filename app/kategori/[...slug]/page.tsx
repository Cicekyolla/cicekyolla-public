// ============================================================================
// KATEGORİ ROTASI — /kategori/*
//
// Bu rota `app/[...slug]/page.tsx` içindeki kategori dalından AYRILDI.
// Render çıktısı, metadata'sı ve kullandığı bileşen (CategoryLanding) birebir
// aynıdır; tek fark artık `searchParams`ın (?sort / ?page) SADECE bu rotayı
// dinamik yapmasıdır. Catch-all rota böylece `searchParams`tan kurtuldu ve
// 71.406 lokasyon URL'i ISR önbelleğine girebiliyor.
// Ayrıntılı gerekçe: lib/categoryPage.ts dosya başlığı.
//
// ROTA ÖNCELİĞİ: Next.js daha spesifik segmenti önce eşler.
//   /kategori/turkiye-geneli-kargo → app/kategori/turkiye-geneli-kargo/page.tsx (statik, önce)
//   /kategori/<slug>               → BU dosya
//   /istanbul/maltepe/...          → app/[...slug]/page.tsx (değişmedi)
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryLanding } from "@/components/category/CategoryLanding";
import { resolveCategoryPage } from "@/lib/categoryPage";
import { managedTitle, managedDescription } from "@/lib/managedSeoContent";
import { absoluteUrl, indexRobots } from "@/lib/site-config";
import type { SeoPublicPage } from "@/lib/api";

export const revalidate = 300;
export const dynamicParams = true;

type PageProps = {
  params: { slug?: string[] };
  searchParams?: { [k: string]: string | string[] | undefined };
};

/** ["guller"] → "/kategori/guller" (catch-all'daki slugToPath ile aynı kodlama). */
function categoryPath(slug: string[] | undefined): string {
  const parts = (slug ?? []).map((s) => decodeURIComponent(s));
  return "/kategori" + (parts.length ? "/" + parts.join("/") : "");
}

function faqJsonLd(page: SeoPublicPage): string | null {
  if (!page.faq || page.faq.length === 0) return null;
  const entities = page.faq.filter((f) => f.q && f.a).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } }));
  if (entities.length === 0) return null;
  return JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: entities });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const path = categoryPath(params.slug);
  const page = await resolveCategoryPage(path);
  if (!page) return { title: "Sayfa bulunamadı", robots: { index: false, follow: false } };
  // Lokasyon SEO Merkezi entegrasyonu: OPERATÖR-ONAYLI içerik (content_source
  // kapısı, bkz. lib/managedSeoContent.ts) şablonun ÖNÜNE geçer.
  // NOT: eski akıştaki getLocationMetadata() çağrısı buraya TAŞINMADI — o
  // fonksiyon `/kategori/` yolları için her koşulda null döndürüyordu
  // (deliveryParts → null, dynamicDeliveryParts → null, fallbackLocationParts
  // zaten `path.startsWith("/kategori/")` ile korumalı). Sonuç birebir aynı,
  // gereksiz bir fetchDeliveryZones() çağrısı ortadan kalktı.
  const title = managedTitle(page) || page.title_tag;
  const description = managedDescription(page) || page.meta_description;
  // Kategori sayfaları her zaman kendi yolunu canonical alır; kataloğdaki bayat
  // canonical'lar artık 404 veren /cicekler/* yollarını gösterebiliyordu.
  const canonicalPath = path;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(canonicalPath) },
    robots: indexRobots(page.index_state),
    openGraph: { title, description, url: absoluteUrl(canonicalPath), locale: page.lang === "tr" ? "tr_TR" : page.lang, type: "website" },
  };
}

export default async function Page({ params, searchParams }: PageProps) {
  const path = categoryPath(params.slug);
  const page = await resolveCategoryPage(path);
  if (!page) notFound();
  const faqLd = faqJsonLd(page);
  const rawSchema = page.schema_jsonld && Object.keys(page.schema_jsonld).length > 0 ? JSON.stringify(page.schema_jsonld) : null;
  const jsonLd = <>{rawSchema ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: rawSchema }} /> : null}{faqLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} /> : null}</>;
  return <><CategoryLanding page={page} path={path} searchParams={searchParams} />{jsonLd}</>;
}
