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
import { categoryCanonicalPath, categoryPageTitle, parseCategoryPageParam } from "@/lib/categoryPagination";
import { managedTitle, managedDescription } from "@/lib/managedSeoContent";
import { absoluteUrl, indexRobots } from "@/lib/site-config";
import type { SeoPublicPage } from "@/lib/api";
import { getCategoryTree } from "@/lib/categories";
import { findCategoryNodeBySlug } from "@/lib/catalog";
import { categoryHreflangFamily } from "@/lib/global/hreflangFamily";
import { fetchCategoryLocaleVersions } from "@/lib/hreflangSources";

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

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const path = categoryPath(params.slug);
  const page = await resolveCategoryPage(path);
  // EK (SEO YAYIN ZİNCİRİ): `?page` pozitif tam sayı değilse sayfa 404 verir (aşağıda Page).
  const pageNo = parseCategoryPageParam(searchParams?.page);
  if (!page || pageNo === null) return { title: "Sayfa bulunamadı", robots: { index: false, follow: false } };
  // Lokasyon SEO Merkezi entegrasyonu: OPERATÖR-ONAYLI içerik (content_source
  // kapısı, bkz. lib/managedSeoContent.ts) şablonun ÖNÜNE geçer.
  // NOT: eski akıştaki getLocationMetadata() çağrısı buraya TAŞINMADI — o
  // fonksiyon `/kategori/` yolları için her koşulda null döndürüyordu
  // (deliveryParts → null, dynamicDeliveryParts → null, fallbackLocationParts
  // zaten `path.startsWith("/kategori/")` ile korumalı). Sonuç birebir aynı,
  // gereksiz bir fetchDeliveryZones() çağrısı ortadan kalktı.
  // EK (SEO YAYIN ZİNCİRİ): sayfalı seride her sayfa KENDİ başlığını taşır
  // (sayfa 1 aynen; N ≥ 2 → " – Sayfa N").
  const title = categoryPageTitle(managedTitle(page) || page.title_tag, pageNo);
  const description = managedDescription(page) || page.meta_description;
  // Kategori sayfaları her zaman kendi yolunu canonical alır; kataloğdaki bayat
  // canonical'lar artık 404 veren /cicekler/* yollarını gösterebiliyordu.
  // EK (SEO YAYIN ZİNCİRİ): sayfa 1 çıplak yol (bugünkü hâl). N ≥ 2 → yol + YALNIZ
  // "?page=N": ilk sayfa diğer sayfaların canonical'ı olamaz (Google sayfalama
  // rehberi); sort/filtre parametreleri canonical'a girmez.
  const canonicalPath = categoryCanonicalPath(path, pageNo);
  // EK (SEO YAYIN ZİNCİRİ — hreflang ailesi): YALNIZ 1. sayfa ve YALNIZ sayfa indexlenebilirken
  // tr (kendi canonical'ı) + indexlenebilir locale kategori sayfaları + locale kardeşleriyle
  // aynı x-default. Locale kategori sayfaları `tr`yi yalnız bu sayfa kesin indexlenebilirken
  // ekler → bağ karşılıklı. Kategori kimliği layout'un zaten okuduğu ağaçtan (ek istek yok);
  // locale sürümleri yeni category-locales ucundan (önbellekli, süre sınırlı; uç yok / hata →
  // null → hreflang basılmaz). Kural: lib/global/hreflangFamily.ts.
  let languages: Record<string, string> | null = null;
  if (pageNo === 1 && page.index_state === "index") {
    const tree = await getCategoryTree();
    const node = tree ? findCategoryNodeBySlug(tree, path.replace(/^\/kategori\//, "")) : null;
    if (node) languages = categoryHreflangFamily(path, (await fetchCategoryLocaleVersions(node.id))?.locales, absoluteUrl);
  }
  const meta: Metadata = {
    title,
    description,
    alternates: { canonical: absoluteUrl(canonicalPath) },
    robots: indexRobots(page.index_state),
    openGraph: { title, description, url: absoluteUrl(canonicalPath), locale: page.lang === "tr" ? "tr_TR" : page.lang, type: "website" },
  };
  return languages ? { ...meta, alternates: { ...meta.alternates, languages } } : meta;
}

export default async function Page({ params, searchParams }: PageProps) {
  const path = categoryPath(params.slug);
  const page = await resolveCategoryPage(path);
  if (!page) notFound();
  // EK (SEO YAYIN ZİNCİRİ): `?page` pozitif tam sayı değilse (0, -1, abc, 1.5 …)
  // sayfa 1'in kopyası 200 ile sunulmaz → 404. "?page=1" geçerlidir (çıplak yola
  // eşit). Son sayfanın ötesi kontrolü ürün sayısı bilinen yerde: CategoryLanding.
  if (parseCategoryPageParam(searchParams?.page) === null) notFound();
  const faqLd = faqJsonLd(page);
  const rawSchema = page.schema_jsonld && Object.keys(page.schema_jsonld).length > 0 ? JSON.stringify(page.schema_jsonld) : null;
  const jsonLd = <>{rawSchema ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: rawSchema }} /> : null}{faqLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} /> : null}</>;
  return <><CategoryLanding page={page} path={path} searchParams={searchParams} />{jsonLd}</>;
}
