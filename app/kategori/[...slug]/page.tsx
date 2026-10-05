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
import { stripTrailingBrand } from "@/lib/titleBrand";
import { escapeJsonLdText } from "@/lib/jsonLdSafe";
import {
  categoryCanonicalPath,
  categoryIndexRule,
  categoryListingState,
  categoryPageTitle,
  EMPTY_CATEGORY_ROBOTS,
  isCategoryWithoutListing,
  isConfirmedEmptyCategory,
  parseCategoryPageParam,
  type CategoryListingState,
} from "@/lib/categoryPagination";
import { CATEGORY_DEFAULT_SORT } from "@/lib/categorySort";
import { CATEGORY_TREE_FALLBACK } from "@/lib/categoryFallback";
import { managedTitle, managedDescription } from "@/lib/managedSeoContent";
import { absoluteUrl, indexRobots, SITE_INDEXABLE } from "@/lib/site-config";
import { fetchProductsPaged, type SeoPublicPage } from "@/lib/api";
import { getCategoryTree } from "@/lib/categories";
import { findCategoryIdBySlug, findCategoryNodeBySlug } from "@/lib/catalog";
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

/**
 * EK: ?page=N (N ≥ 2) ana seride — sıralamasız / filtresiz liste; canonical'ın gösterdiği
 * seri — gerçekten var mı? İstek, CategoryLanding'in sıralamasız/filtresiz sayfada yaptığı
 * istekle AYNIDIR (aynı URL → istek içi tekilleştirme; ek upstream çağrısı yok). Sıralı /
 * filtreli istekte tek ek okuma Data Cache'lidir (revalidate 120).
 */
async function mainSeriesState(path: string, pageNo: number): Promise<CategoryListingState> {
  const tree = await getCategoryTree();
  const categoryId = tree ? findCategoryIdBySlug(tree, path.replace(/^\/kategori\//, "").replace(/\/+$/, "")) : null;
  if (!categoryId) return "unknown";
  const listing = await fetchProductsPaged({ category_id: categoryId, page_size: 50, page: pageNo, sort: CATEGORY_DEFAULT_SORT });
  return categoryListingState(pageNo, listing.pagination);
}

/**
 * EK (KATEGORİ YASASI): kategorinin FİLTRESİZ listesi KESİN boş mu? ("Kategori sayfası yalnız en az
 * bir aktif ürün listelediği sürece index'e değerdir.") İstek, CategoryLanding'in sıralamasız /
 * filtresiz 1. sayfa isteğiyle AYNIDIR (istek içi tekilleştirme). Yalnız sıralı / filtreli 1. sayfa
 * isteğinde tek ek okuma olur (Data Cache'li, kategorinin çıplak sayfasıyla aynı kayıt — kategorinin
 * en sık okunan kaydı).
 * EK: karar YALNIZ 1. sayfada verilir. Liste ucu `total`'ı satırlardan sayar: son sayfanın ötesindeki
 * bir sayfa dolu kategoride de total 0 döner → sayfa N ≥ 2'nin yanıtı "kategori boş" kanıtı değildir
 * (gerçekten boş kategorinin sayfa ≥ 2 adresi zaten 404 verir). Kural: isConfirmedEmptyCategory.
 * EK: ÜRÜN KATEGORİSİ sayfası canlı ağaçta çözülemiyorsa (yalnız SEO kaydından çizilen sayfa) hiç ürün
 * listelemez → aynı yasa gereği index'e değmez (kural: isCategoryWithoutListing; konum + kategori
 * sayfalarına dokunulmaz).
 * FAIL-OPEN: ağaç okunamadıysa (statik yedek) ya da ürün okuması başarısızsa false → bugünkü robots
 * (API kesintisi dolu bir kategoriyi index dışına itmez).
 */
// EK (KATEGORİ YAYIN KURALI — 5 Eki 2026): ürün SAYISI tek başına index durumunu değiştirmez
// (kural: lib/categoryPagination.ts categoryIndexRule). Bu işlev artık yalnız şu üç durumda true döner:
//   1) kategori canlı ağaçta ama AKTİF DEĞİL (taslak …) → her sayfasında index dışı,
//   2) ürün kategorisi sayfası canlı ağaçta çözülemiyor (yalnız SEO kaydı kalmış) → listesi yok (eski kural aynen),
//   3) sayfa KAYITSIZ (ağaçtan üretilen sentetik sayfa) ve filtresiz listesi kesin boş → kendi içeriği de ürünü de yok.
// SEO kaydı olan AKTİF kategori ürünsüz olsa da robots kaydın index_state'idir (ürün okuması yapılmaz).
async function isCategoryConfirmedEmpty(path: string, pageNo: number, pageType?: string | null, synthetic = false): Promise<boolean> {
  const tree = await getCategoryTree();
  if (!tree || tree === CATEGORY_TREE_FALLBACK) return false;
  const slug = path.replace(/^\/kategori\//, "").replace(/\/+$/, "");
  const node = findCategoryNodeBySlug(tree, slug);
  const rule = categoryIndexRule({ status: (node as { status?: unknown } | null)?.status, synthetic });
  if (node && rule === "noindex") return true;
  if (pageNo !== 1) return false;
  const categoryId = findCategoryIdBySlug(tree, slug);
  if (!categoryId) return isCategoryWithoutListing({ liveTree: true, categoryId, pageType });
  if (rule !== "count") return false;
  return isConfirmedEmptyCategory(
    pageNo,
    await fetchProductsPaged({ category_id: categoryId, page_size: 50, page: pageNo, sort: CATEGORY_DEFAULT_SORT }),
  );
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
  // EK: sayfa N ≥ 2 kendi canonical'ını + başlık ekini yalnız ana seride o sayfa GERÇEKTEN
  // varsa alır. Liste durumu bilinmiyorsa (okuma başarısız / kategori ağaçta çözülemedi) ya da
  // sayfa son sayfanın ötesindeyse çıplak yol + düz başlık (önceki hâl) → 1. sayfanın kopyası
  // kendi adresiyle index'e önerilmez. Kural: lib/categoryPagination.ts categoryListingState.
  const seoPage = pageNo > 1 && (await mainSeriesState(path, pageNo)) !== "ok" ? 1 : pageNo;
  // EK (SEO YAYIN ZİNCİRİ): sayfalı seride her sayfa KENDİ başlığını taşır
  // (sayfa 1 aynen; N ≥ 2 → " – Sayfa N").
  const title = categoryPageTitle(stripTrailingBrand(managedTitle(page) || page.title_tag), seoPage);
  const description = managedDescription(page) || page.meta_description;
  // Kategori sayfaları her zaman kendi yolunu canonical alır; kataloğdaki bayat
  // canonical'lar artık 404 veren /cicekler/* yollarını gösterebiliyordu.
  // EK (SEO YAYIN ZİNCİRİ): sayfa 1 çıplak yol (bugünkü hâl). N ≥ 2 → yol + YALNIZ
  // "?page=N": ilk sayfa diğer sayfaların canonical'ı olamaz (Google sayfalama
  // rehberi); sort/filtre parametreleri canonical'a girmez.
  const canonicalPath = categoryCanonicalPath(path, seoPage);
  // EK (SEO YAYIN ZİNCİRİ — hreflang ailesi): YALNIZ 1. sayfa ve YALNIZ sayfa indexlenebilirken
  // tr (kendi canonical'ı) + indexlenebilir locale kategori sayfaları + locale kardeşleriyle
  // aynı x-default. Locale kategori sayfaları `tr`yi yalnız bu sayfa kesin indexlenebilirken
  // ekler → bağ karşılıklı. Kategori kimliği layout'un zaten okuduğu ağaçtan (ek istek yok);
  // locale sürümleri yeni category-locales ucundan (önbellekli, süre sınırlı; uç yok / hata →
  // null → hreflang basılmaz). Kural: lib/global/hreflangFamily.ts.
  // EK (KATEGORİ YASASI): sayfa bugün indexlenebilirken filtresiz liste KESİN boşsa (API başarıyla
  // yanıt verdi, total 0) robots "noindex, follow" olur ve hreflang kümesi basılmaz (noindex sayfa aile
  // üyesi olamaz). Zaten index dışı sayfada (önizleme / noindex kayıt) okuma yapılmaz, robots aynen.
  // Karar yalnız 1. sayfada verilir (sayfa N ≥ 2'nin yanıtı kategori için kanıt değildir).
  const emptyCategory = SITE_INDEXABLE && page.index_state === "index" && (await isCategoryConfirmedEmpty(path, pageNo, page.page_type, page.synthetic === true));
  let languages: Record<string, string> | null = null;
  if (pageNo === 1 && page.index_state === "index" && !emptyCategory) {
    const tree = await getCategoryTree();
    const node = tree ? findCategoryNodeBySlug(tree, path.replace(/^\/kategori\//, "")) : null;
    if (node) languages = categoryHreflangFamily(path, (await fetchCategoryLocaleVersions(node.id))?.locales, absoluteUrl);
  }
  const meta: Metadata = {
    title,
    description,
    alternates: { canonical: absoluteUrl(canonicalPath) },
    robots: emptyCategory ? EMPTY_CATEGORY_ROBOTS : indexRobots(page.index_state),
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
  const jsonLd = <>{rawSchema ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: escapeJsonLdText(rawSchema) }} /> : null}{faqLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: escapeJsonLdText(faqLd) }} /> : null}</>;
  return <><CategoryLanding page={page} path={path} searchParams={searchParams} />{jsonLd}</>;
}
