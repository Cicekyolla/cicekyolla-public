import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Check, Clock3, MapPin, MessageCircle, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { fetchCityDistricts, fetchDeliveryZones, fetchDistrictNeighborhoods, fetchLocationProducts, fetchProducts, fetchSeoPage, toCardProduct, type BodyBlock, type CityDistrictSummary, type DistrictNeighborhoods, type LocationProductsPage, type SeoPublicPage } from "@/lib/api";
import { NeighborhoodCards } from "@/components/location/NeighborhoodCards";
import { CrossLinkBlock } from "@/components/location/CrossLinkBlock";
import { LocationProducts } from "@/components/location/LocationProducts";
import { KOMSU_ILCELER } from "@/lib/istanbulKomsuIlceler";
import { yonelme } from "@/lib/turkish";
import { managedTitle, managedDescription, managedH1 } from "@/lib/managedSeoContent";
import { getCategoryTree } from "@/lib/categories";
import { findCategoryNodeBySlug } from "@/lib/catalog";
import { CategoryLanding } from "@/components/category/CategoryLanding";
import { absoluteUrl, indexRobots } from "@/lib/site-config";
import { getLinkData } from "@/lib/linkData";
import { injectLinksIntoHtml } from "@/lib/linkInjector";

function syntheticCategoryPage(path: string, node: Record<string, unknown>): SeoPublicPage {
  const name = typeof node.name === "string" ? node.name : "Koleksiyon";
  const desc = typeof node.description === "string" ? node.description : "";
  const str = (k: string): string | undefined => (typeof node[k] === "string" ? (node[k] as string) : undefined);
  return {
    url_path: path,
    page_type: "category",
    lang: "tr",
    index_state: node.is_indexable === false ? "noindex" : "index",
    canonical_url: str("canonical_url") || path,
    // Marka EKLENMEZ: app/layout.tsx metadata şablonu zaten "%s | ÇiçekYolla"
    // uyguluyor. Buraya marka yazmak "Güller — Cicekyolla | ÇiçekYolla" gibi
    // çift markalı (ve diakritiksiz) başlık üretiyordu.
    title_tag: str("seo_title") || name,
    meta_description: str("seo_description") || desc || `${name} koleksiyonu — aynı gün teslimat.`,
    h1: str("h1_title") || name,
    intro_html: desc ? `<p>${desc}</p>` : null,
    body_blocks: [],
    faq: Array.isArray(node.faq_json) ? (node.faq_json as SeoPublicPage["faq"]) : [],
    schema_jsonld: {},
  };
}

// Admin'deki SEO kaydı yayında olduğu halde h1/title_tag/meta_description alanları
// boş bırakılmış olabilir. O durumda sayfa boş <h1> ve boş <title> ile yayınlanıyor,
// kategori rayının etiketi de "null Kategorileri" çıkıyordu. Boş alanları
// syntheticCategoryPage'in ürettiği (canlı kategori ağacından gelen) değerlerle
// tamamlar. DOLU gelen hiçbir alana dokunmaz → admin tek kaynak olmayı sürdürür.
function withCategoryFallbacks(
  seo: SeoPublicPage,
  path: string,
  node: Record<string, unknown>
): SeoPublicPage {
  const blank = (v: string | null | undefined): boolean => !v || v.trim() === "";
  if (!blank(seo.h1) && !blank(seo.title_tag) && !blank(seo.meta_description)) return seo;
  const derived = syntheticCategoryPage(path, node);
  return {
    ...seo,
    h1: blank(seo.h1) ? derived.h1 : seo.h1,
    title_tag: blank(seo.title_tag) ? derived.title_tag : seo.title_tag,
    meta_description: blank(seo.meta_description) ? derived.meta_description : seo.meta_description,
  };
}

const DELIVERY_CITIES = new Set(["istanbul", "ankara", "izmir", "bursa"]);
const DELIVERY_DATA: Record<string, { label: string; districts: Record<string, { label: string; time: string; cutoff: string; neighborhoods: string[]; description: string }> }> = {
  istanbul: {
    label: "İstanbul",
    districts: {
      kadikoy: { label: "Kadıköy", time: "2–3 saat", cutoff: "14:00", neighborhoods: ["Moda", "Fenerbahçe", "Göztepe", "Bostancı", "Suadiye", "Erenköy", "Caferağa", "Koşuyolu", "Caddebostan", "Feneryolu", "Acıbadem", "Sahrayıcedit"], description: "Kadıköy'ün her köşesine taptaze, premium çiçeklerle sevdiklerinizi mutlu edin." },
      besiktas: { label: "Beşiktaş", time: "2–3 saat", cutoff: "14:00", neighborhoods: ["Levent", "Etiler", "Bebek", "Ortaköy", "Arnavutköy", "Akat", "Ulus", "Gayrettepe"], description: "Beşiktaş ve çevresine zarif buketler, orkide ve özel tasarım çiçekleri aynı gün ulaştırın." },
      sisli: { label: "Şişli", time: "2–3 saat", cutoff: "14:00", neighborhoods: ["Teşvikiye", "Nişantaşı", "Mecidiyeköy", "Bomonti", "Fulya", "Esentepe", "Harbiye"], description: "Şişli bölgesinde iş, ev ve özel gün adreslerine premium çiçek teslimatı planlayın." },
      uskudar: { label: "Üsküdar", time: "3–4 saat", cutoff: "14:00", neighborhoods: ["Kuzguncuk", "Altunizade", "Acıbadem", "Çengelköy", "Beylerbeyi", "Kısıklı"], description: "Üsküdar'ın seçili mahallelerine taze çiçek ve saksı aranjmanlarını güvenle gönderin." },
    },
  },
  ankara: {
    label: "Ankara",
    districts: {
      cankaya: { label: "Çankaya", time: "2–3 saat", cutoff: "12:00", neighborhoods: ["Kızılay", "Bahçelievler", "Çukurambar", "Ayrancı", "Gaziosmanpaşa", "Oran"], description: "Çankaya'da ofis, ev ve özel kutlama adreslerine premium çiçek seçeneklerini ulaştırın." },
      kecioren: { label: "Keçiören", time: "3–4 saat", cutoff: "12:00", neighborhoods: ["Etlik", "Kalaba", "Ovacık", "Şenlik", "Aktepe", "Ufuktepe"], description: "Keçiören bölgesine taze ve özenli çiçek aranjmanları gönderin." },
    },
  },
  izmir: {
    label: "İzmir",
    districts: {
      konak: { label: "Konak", time: "2–3 saat", cutoff: "12:00", neighborhoods: ["Alsancak", "Göztepe", "Güzelyalı", "Kültür", "Pasaport", "Hatay"], description: "Konak ve çevresine modern, zarif ve taze çiçek teslimatı yapın." },
      karsiyaka: { label: "Karşıyaka", time: "3–4 saat", cutoff: "12:00", neighborhoods: ["Bostanlı", "Mavişehir", "Alaybey", "Nergiz", "Atakent", "Bahriye Üçok"], description: "Karşıyaka'nın sevilen mahallelerine premium çiçek seçeneklerini güvenle gönderin." },
    },
  },
  bursa: {
    label: "Bursa",
    districts: {
      nilufer: { label: "Nilüfer", time: "3–4 saat", cutoff: "12:00", neighborhoods: ["Özlüce", "Görükle", "Ertuğrul", "Balat", "Beşevler", "İhsaniye"], description: "Nilüfer bölgesine özel günler için taze çiçek ve aranjman gönderimi yapın." },
    },
  },
};

function prettySlug(value: string): string {
  const clean = value.replace(/-mah$/, "");
  const names: Record<string, string> = { istanbul: "İstanbul", ankara: "Ankara", izmir: "İzmir", bursa: "Bursa" };
  return names[clean] || clean.split("-").map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1)).join(" ");
}
function slugifyTR(value: string): string {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function deliveryParts(path: string): string[] | null {
  const parts = path.split("/").filter(Boolean);
  return parts.length >= 1 && parts.length <= 3 && DELIVERY_CITIES.has(parts[0]) ? parts : null;
}
function getDeliveryInfo(parts: string[]) {
  const city = DELIVERY_DATA[parts[0]];
  const district = parts[1] ? city?.districts[parts[1]] : undefined;
  return { city, district };
}
function locationLabel(page: SeoPublicPage, fallback: string): string {
  const fromHeading = page.h1
    ?.replace(/\s+Mahallesi.*$/i, "")
    .replace(/\s+Çiçekçi.*$/i, "")
    .replace(/\s+Çiçek Siparişi.*$/i, "")
    .replace(/\s+Çiçek Gönder.*$/i, "")
    .trim();
  return fromHeading || fallback;
}

function locationSeoDescription(parts: string[], cityName: string, districtName: string, neighborhood: string): string {
  const isIstanbul = parts[0] === "istanbul";
  const location = neighborhood
    ? `${cityName} ${districtName} ${neighborhood} Mahallesi`
    : districtName
      ? `${cityName} ${districtName}`
      : cityName;
  return isIstanbul
    ? `${location} bölgesine taze çiçekler, premium buketler ve özel tasarım aranjmanlarla aynı gün hızlı teslimat.`
    : `${location} bölgesine taze çiçekler, premium buketler ve özel tasarım aranjmanlar 1–3 iş günü içinde güvenli kargoyla ulaştırılır.`;
}

function syntheticDeliveryPage(path: string, parts: string[]): SeoPublicPage {
  const { city, district } = getDeliveryInfo(parts);
  const cityName = city?.label || prettySlug(parts[0]);
  const districtName = parts[1] ? district?.label || prettySlug(parts[1]) : "";
  const neighborhood = parts[2] ? prettySlug(parts[2]) : "";
  const place = [neighborhood, districtName, cityName].filter(Boolean).join(", ");
  const titlePlace = neighborhood || districtName || cityName;
  return {
    url_path: path,
    page_type: "delivery_info",
    lang: "tr",
    // SEO: bu üretici DOĞRULAMA YAPMAZ — deliveryParts() yalnız parts[0]'ın 4 sabit
    // ilden biri olmasına bakar, ilçe/mahalle adını hiç kontrol etmez. Yani
    // /istanbul/<uydurma>/<uydurma> gibi SONSUZ bir URL uzayının tamamı 200 dönüyordu.
    // noindex, o uzayın indexlenmesini durdurur. Gerçek yayınlanmış sayfalar
    // etkilenmez: resolvePage() önce fetchSeoPage()'i dener, buraya yalnız admin'de
    // karşılığı OLMAYAN yollar düşer. Dinamik üretici (admin Delivery Motor'dan
    // çözülen syntheticDynamicDeliveryPage) BİLEREK "index" kalıyor — orada il/ilçe
    // varlığı zones verisiyle doğrulanıyor.
    index_state: "noindex",
    canonical_url: path,
    // SEO: "çiçekçi" + "çiçek siparişi" arama kalıpları — il/ilçe/mahalle aynı mantık.
    // MARKA EKLENMEZ: app/layout.tsx metadata şablonu zaten "%s | ÇiçekYolla"
    // uyguluyor (bkz. syntheticCategoryPage yorum satırı, aynı kök neden).
    title_tag: `${titlePlace} Çiçekçi — ${titlePlace} Çiçek Siparişi`,
    meta_description: locationSeoDescription(parts, cityName, districtName, neighborhood),
    h1: `${titlePlace} Çiçekçi — Çiçek Siparişi`,
    intro_html: `<p>${district?.description || `${place} için özenle hazırlanan taze çiçekler ve premium aranjmanlar.`}</p>`,
    body_blocks: [],
    faq: [],
    schema_jsonld: {},
  };
}

// ── Dinamik teslimat landing'i (ADDITIVE) ────────────────────────────────────
// Hardcoded DELIVERY_CITIES dışındaki il/ilçe linkleri admin Delivery Motor
// bölgelerinden (GET /api/public/delivery/zones) çözülür. Böylece adminden
// eklenen her bölgenin /{il}/{ilçe} linki 404 olmadan çalışır. İstanbul dışı
// iller varsayılan 1–3 iş günü kargo olarak sunulur (same_day admin verisi).
type DynDelivery = { parts: string[]; cityName: string; districtName: string; sameDay: boolean };

function fallbackLocationParts(page: SeoPublicPage, path: string): DynDelivery | null {
  const type = page.page_type.toLowerCase();
  const locationType = ["city", "district", "neighborhood", "delivery_info"]
    .some((prefix) => type === prefix || type.startsWith(`${prefix}_`));
  const parts = path.split("/").filter(Boolean);
  if (!locationType || parts.length < 1 || parts.length > 3 || path.startsWith("/kategori/")) return null;
  const pageLabel = locationLabel(page, prettySlug(parts.at(-1) || parts[0]));
  return {
    parts,
    cityName: parts.length === 1 ? pageLabel : prettySlug(parts[0]),
    districtName: parts[1] ? (parts.length === 2 ? pageLabel : prettySlug(parts[1])) : "",
    sameDay: parts[0] === "istanbul",
  };
}

async function dynamicDeliveryParts(path: string): Promise<DynDelivery | null> {
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 1 || parts.length > 3) return null;
  if (DELIVERY_CITIES.has(parts[0])) return null; // hardcoded yol zaten karşılıyor
  const zones = await fetchDeliveryZones();
  const city = zones.find((c) => c.city_slug === parts[0]);
  if (!city) return null;
  const district = parts[1] ? city.districts.find((d) => d.slug === parts[1]) : undefined;
  if (parts[1] && !district) return null;
  // ── EK (MAHALLE DOĞRULAMASI) — ADDITIVE, DAR KAPSAM ──────────────────────
  // Bu üretici il ve ilçeyi doğruluyordu ama mahalle segmentini HİÇ kontrol
  // etmiyordu; syntheticDynamicDeliveryPage ise index_state:"index" veriyor.
  // Sonuç canlıda kanıtlandı: /adana/ceyhan/asdfghjkl → 200 + index + self
  // canonical. Yani il/ilçe geçerli olduğu sürece SONSUZ bir URL uzayının
  // tamamı indexlenebilirdi (sabit-il yolunda aynı risk noindex ile
  // kapatılmıştı, dinamik yolda açık kalmış).
  // Mahalle artık location core'a (Delivery Motor) karşı doğrulanır:
  //   gerçek mahalle -> 200 (davranış değişmez)
  //   uydurma mahalle -> null -> 404
  // Yayınlanmış sayfalar etkilenmez: resolvePage() önce fetchSeoPage()'i dener,
  // buraya yalnız seo_page kaydı OLMAYAN yollar düşer.
  // FAIL-SAFE: core erişilemezse (null) doğrulama yapılmaz ve bugünkü davranış
  // birebir sürer — geçici API kesintisi gerçek sayfaları 404 yapmaz.
  if (parts[2]) {
    const core = await fetchDistrictNeighborhoods(parts[0], parts[1]);
    if (core && !core.neighborhoods.some((n) => n.slug === parts[2])) return null;
  }
  return {
    parts,
    cityName: city.city,
    districtName: district?.name || "",
    // İş kuralı: aynı gün hızlı teslimat yalnız İstanbul için geçerlidir.
    sameDay: parts[0] === "istanbul",
  };
}

function syntheticDynamicDeliveryPage(path: string, dyn: DynDelivery): SeoPublicPage {
  const neighborhood = dyn.parts[2] ? prettySlug(dyn.parts[2]) : "";
  const place = [neighborhood, dyn.districtName, dyn.cityName].filter(Boolean).join(", ");
  const titlePlace = neighborhood || dyn.districtName || dyn.cityName;
  return {
    url_path: path,
    page_type: "delivery_info",
    lang: "tr",
    index_state: "index",
    canonical_url: path,
    // SEO: "çiçekçi" + "çiçek siparişi" arama kalıpları — il/ilçe/mahalle aynı mantık.
    // MARKA EKLENMEZ (bkz. syntheticDeliveryPage yorumu — aynı kök neden).
    title_tag: `${titlePlace} Çiçekçi — ${titlePlace} Çiçek Siparişi`,
    meta_description: locationSeoDescription(dyn.parts, dyn.cityName, dyn.districtName, neighborhood),
    h1: `${titlePlace} Çiçekçi — Çiçek Siparişi`,
    intro_html: `<p>${place} için özenle hazırlanan taze çiçekler ve premium aranjmanlar.</p>`,
    body_blocks: [],
    faq: [],
    schema_jsonld: {},
  };
}

async function resolvePage(path: string): Promise<SeoPublicPage | null> {
  if (path.startsWith("/kategori/")) {
    const [seo, tree] = await Promise.all([fetchSeoPage(path), getCategoryTree()]);
    const slug = path.replace(/^\/kategori\//, "").replace(/\/+$/, "");
    const node = tree ? findCategoryNodeBySlug(tree, slug) : null;
    // SEO kaydı VAR ama h1/title_tag/meta_description alanları boş olabilir
    // (canlıda tüm kategorilerde null'dı → boş <h1>, boş <title>, "null Kategorileri").
    // Bu alanları canlı kategori ağacından türet; hardcoded veri YOK, admin tek
    // kaynak kalır. Dolu gelen her alan AYNEN korunur.
    if (seo) return node ? withCategoryFallbacks(seo, path, node as unknown as Record<string, unknown>) : seo;
    if (node) return syntheticCategoryPage(path, node as unknown as Record<string, unknown>);
    // Render/API kısa süreli erişilemezse geçerli kategori URL'lerini 404 olarak
    // önbelleğe alma. Ağaç geri geldiğinde admin verisi yeniden tek kaynak olur.
    if (!tree && slug) {
      noStore();
      return syntheticCategoryPage(path, { name: prettySlug(slug) });
    }
  }
  const seo = await fetchSeoPage(path);
  if (seo) return seo;
  const location = deliveryParts(path);
  if (location) return syntheticDeliveryPage(path, location);
  const dyn = await dynamicDeliveryParts(path);
  if (dyn) return syntheticDynamicDeliveryPage(path, dyn);
  return null;
}

async function DeliveryLanding({ page, path, dyn }: { page: SeoPublicPage; path: string; dyn?: DynDelivery }) {
  const parts = dyn?.parts ?? deliveryParts(path)!;
  const { city, district } = dyn ? { city: undefined, district: undefined } : getDeliveryInfo(parts);
  const pageLabel = locationLabel(page, prettySlug(parts.at(-1) || parts[0]));
  const cityName = dyn?.cityName || city?.label || (parts.length === 1 ? pageLabel : prettySlug(parts[0]));
  const districtName = dyn?.districtName || district?.label || (parts[1] ? (parts.length === 2 ? pageLabel : prettySlug(parts[1])) : "");
  const neighborhood = parts[2] ? pageLabel : "";
  const place = neighborhood || districtName || cityName;
  // Lokasyon SEO Merkezi: operatör-onaylı H1 varsa sabit şablonun önüne geçer
  // (kapı mantığı lib/managedSeoContent.ts — onaysız sayfalarda null).
  const adminH1 = managedH1(page);

  // Link enjeksiyonu: intro_html varsa intro'ya, yoksa body_blocks'a.
  let injectedIntroHtml = page.intro_html;
  let injectedBodyBlocks: typeof page.body_blocks | null = null;

  try {
    const linkData = await getLinkData();
    if (linkData.length > 0) {
      if (page.intro_html) {
        injectedIntroHtml = injectLinksIntoHtml(
          page.intro_html,
          linkData.map(w => ({ text: w.text, url: w.url, type: w.type })),
          page.url_path
        );
      } else if (page.body_blocks && page.body_blocks.length > 0) {
        injectedBodyBlocks = page.body_blocks
          .filter((block) => block.text && block.text.length > 0)
          .map((block) => ({
            ...block,
            text: injectLinksIntoHtml(
              block.text || '',
              linkData.map(w => ({ text: w.text, url: w.url, type: w.type })),
              page.url_path
            ),
          }));
      }
    }
  } catch (err) {
    console.error('[linkInjection] Error:', err instanceof Error ? err.message : err);
    // Hata durumunda orijinal HTML/blocks kullan
  }
  // Bağlayıcı iş kuralı: yalnız İstanbul aynı gün; diğer tüm il/ilçe/mahalleler kargo.
  const cargoMode = parts[0] !== "istanbul";
  const deliveryTime = cargoMode ? "1–3 iş günü" : district?.time || "Aynı gün";
  const cutoff = district?.cutoff || "14:00";
  const neighborhoods = district?.neighborhoods || [];
  const seoDescription = locationSeoDescription(parts, cityName, districtName, neighborhood);

  // ── ADDITIVE (Faz 1): İlçe/mahalle sayfaları Admin/DB tek kaynağından beslenir.
  // Coverage ürünleri + gerçek mahalleler paralel çekilir; API erişilemezse
  // mevcut canlı davranış (aşağıdaki fetchProducts fallback'i) aynen sürer.
  const isDistrictScope = !cargoMode && parts.length >= 2;
  // HATA 4: ilçe sayfasında gösterilen ürün sayısı 12 → 30 (rakip 27 ürün
  // gösteriyordu). "Daha Fazla Göster" istemci mekanizması değişmedi.
  const LOCATION_PAGE_SIZE = 30;
  let locationData: LocationProductsPage | null = null;
  let dbHood: DistrictNeighborhoods | null = null;
  let effectiveNeighborhood: string | undefined = parts[2];
  if (isDistrictScope) {
    [locationData, dbHood] = await Promise.all([
      fetchLocationProducts(parts[0], parts[1], { neighborhood: parts[2], page_size: LOCATION_PAGE_SIZE }),
      fetchDistrictNeighborhoods(parts[0], parts[1]),
    ]);
    // Mahalle slug'ı DB ile eşleşmezse ilçe kapsamına düş (miras — sayfa boş kalmaz).
    if (!locationData && parts[2]) {
      locationData = await fetchLocationProducts(parts[0], parts[1], { page_size: LOCATION_PAGE_SIZE });
      effectiveNeighborhood = undefined;
    }
  }
  const useLocationGrid = locationData != null && locationData.items.length > 0;

  // ── ADDITIVE (HATA 3): sayfa bağlamına göre GERÇEK çapraz bağlantı verisi.
  // Sabit 5 linkli blok yerine — il sayfasında o ilin tüm ilçeleri (gerçek
  // envanterden), ilçe sayfasında İstanbul'da coğrafi komşu ilçeler
  // (KOMSU_ILCELER) veya diğer illerde aynı ildeki birkaç gerçek ilçe.
  // Not: cargoMode/isDistrictScope yalnız "aynı gün mü kargo mu" iş kuralına
  // bakar — çapraz bağlantı görünürlüğü bundan bağımsız, TÜM iller (İstanbul
  // dahil/hariç) için parts.length'e göre çalışmalı.
  let cityDistricts: CityDistrictSummary[] | null = null;
  let relatedDistricts: CityDistrictSummary[] = [];
  if (parts.length === 1) {
    cityDistricts = await fetchCityDistricts(parts[0]);
  } else if (parts.length === 2) {
    const allCityDistricts = await fetchCityDistricts(parts[0]);
    if (parts[0] === "istanbul") {
      const neighborSlugs = new Set(KOMSU_ILCELER[parts[1]] ?? []);
      relatedDistricts = allCityDistricts.filter((d) => neighborSlugs.has(d.slug));
    } else {
      relatedDistricts = allCityDistricts.filter((d) => d.slug !== parts[1]).slice(0, 6);
    }
  }

  const productItems = useLocationGrid
    ? []
    : await fetchProducts({
        // Şehir dışı vitrin: TEK yetki kaynağı Admin Kargo Merkezi (teslimat profili).
        // Legacy delivery_scope kargo yetkisi VEREMEZ (önceden bu sayfa onu kullanıyordu).
        ...(cargoMode
          ? { delivery_model: "cargo_capable" as const }
          : { product_type: "flower", same_day_available: true }),
        page_size: cargoMode ? 100 : 8,
      });
  const products = productItems
    .filter((product) => !cargoMode || product.delivery_model_code === "cargo" || product.delivery_model_code === "same_day_and_cargo")
    .map(toCardProduct)
    .slice(0, cargoMode ? 100 : 4);

  return <main className="bg-[#fcfbfd] text-[#111827]">
    <section className="bg-white px-6 pb-16 pt-20 lg:px-14 lg:pb-24 lg:pt-28">
      <div className="mx-auto max-w-[1320px]">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#c4b5fd]/30 bg-[#f4efff] px-5 py-2 text-xs font-bold uppercase tracking-[.18em] text-[#6d28d9]"><Sparkles className="h-4 w-4" /> {cargoMode ? "1–3 iş günü kargo" : "Aynı gün hızlı teslimat"} — {place}</div>
        {adminH1
          ? <h1 className="mt-10 max-w-4xl font-serif text-6xl font-semibold leading-[.98] text-[#121827] md:text-7xl lg:text-8xl">{adminH1}</h1>
          : <h1 className="mt-10 max-w-4xl font-serif text-6xl font-semibold leading-[.98] text-[#121827] md:text-7xl lg:text-8xl">{place} Çiçekçi<br /><span className="text-[#8b5cf6]">Çiçek Siparişi</span></h1>}
        <p className="mt-8 max-w-2xl text-xl leading-9 text-[#667085]">{seoDescription}</p>
        <div className="mt-12 grid max-w-3xl gap-5 md:grid-cols-2">
          <div className="flex items-center gap-5 rounded-[22px] border border-[#ebe7f2] bg-white p-6 shadow-[0_14px_45px_rgba(45,22,72,.05)]"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#f5f0ff]"><Clock3 className="h-5 w-5 text-[#8b5cf6]" /></span><div><div className="font-bold text-[#111827]">{deliveryTime}</div><div className="mt-1 text-sm text-[#9b94a8]">Ortalama teslimat süresi</div></div></div>
          <div className="flex items-center gap-5 rounded-[22px] border border-[#ebe7f2] bg-white p-6 shadow-[0_14px_45px_rgba(45,22,72,.05)]"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#f5f0ff]"><Truck className="h-5 w-5 text-[#8b5cf6]" /></span><div><div className="font-bold text-[#111827]">{cargoMode ? "Güvenli Kargo" : "Hızlı Teslimat"}</div><div className="mt-1 text-sm text-[#9b94a8]">{cargoMode ? "Özenli ve korumalı paketleme" : "Yalnız İstanbul içi"}</div></div></div>
        </div>
        <div className="mt-12 flex flex-wrap gap-4"><Link href="/kategori/cicekler" className="rounded-full bg-[#8b5cf6] px-9 py-4 font-bold text-white shadow-[0_18px_45px_rgba(139,92,246,.28)]">Koleksiyonu Keşfet</Link><Link href="https://wa.me/905458813450" className="inline-flex items-center gap-3 rounded-full border border-[#e8e1f0] bg-white px-9 py-4 font-bold text-[#141020]"><MessageCircle className="h-5 w-5" /> WhatsApp'tan Sipariş</Link></div>
      </div>
    </section>

    {dbHood && dbHood.neighborhoods.length > 0 ? (
      // Admin/DB tek kaynak: gerçek mahalle kartları (mevcut canlı URL'lere iç link).
      <NeighborhoodCards
        citySlug={parts[0]}
        districtSlug={parts[1]}
        districtName={dbHood.district.name || districtName}
        neighborhoods={dbHood.neighborhoods}
        currentSlug={parts[2]}
        variant={parts[2] ? "neighborhood" : "district"}
      />
    ) : neighborhoods.length > 0 ? <section className="border-y border-[#eee9f6] bg-[#f7f5fc] px-6 py-16 lg:px-14"><div className="mx-auto max-w-[1320px]"><div className="mb-10 flex items-center gap-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#8b5cf6]"><MapPin className="h-5 w-5" /></span><p className="text-xs font-bold uppercase tracking-[.32em] text-[#8b5cf6]">Teslimat yapılan mahalleler</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{neighborhoods.map((item) => <Link key={item} href={`/${parts[0]}/${parts[1]}/${slugifyTR(item)}-mah`} className="flex items-center gap-4 rounded-[20px] border border-[#ece7f4] bg-white px-5 py-5 text-lg font-medium text-[#1f2937] shadow-[0_12px_34px_rgba(45,22,72,.04)]"><span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-[#f5f0ff]"><Check className="h-4 w-4 text-[#8b5cf6]" /></span>{item}</Link>)}</div></div></section> : null}

    {/* HATA 3: gerçek çapraz bağlantı bloğu — il sayfasında tüm ilçeler,
        ilçe sayfasında komşu ilçeler + il hub linki. Mahalle sayfasında
        NeighborhoodCards zaten kardeş mahalleler + ilçeye dönüşü veriyor;
        burada yalnız il hub linki eklenir (aşağıda). */}
    {cityDistricts && cityDistricts.length > 0 ? (
      <CrossLinkBlock variant="city" citySlug={parts[0]} cityName={cityName} districts={cityDistricts} />
    ) : null}
    {parts.length === 2 && relatedDistricts.length > 0 ? (
      <CrossLinkBlock
        variant="district"
        citySlug={parts[0]}
        cityName={cityName}
        districtSlug={parts[1]}
        related={relatedDistricts}
      />
    ) : null}
    {parts.length === 3 ? (
      <section className="bg-white px-6 py-8 lg:px-14">
        <div className="mx-auto max-w-[1320px]">
          <Link href={`/${parts[0]}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#6d28d9] hover:underline">
            <MapPin className="h-4 w-4" /> Tüm {cityName} Çiçekçileri
          </Link>
        </div>
      </section>
    ) : null}

    {neighborhood ? <section className="bg-white px-6 py-12 lg:px-14"><div className="mx-auto max-w-[1320px]"><div className="inline-flex items-center gap-3 rounded-full border border-[#e9e3f6] bg-[#fbfafd] px-6 py-4 font-semibold"><MapPin className="h-5 w-5 text-[#8b5cf6]" />{neighborhood}, {districtName}, {cityName}</div></div></section> : null}

    <section className="mx-auto max-w-[1320px] px-6 py-20 lg:px-14"><p className="text-xs font-bold uppercase tracking-[.24em] text-[#8b5cf6]">{place} için</p><h2 className="mt-3 font-serif text-5xl font-semibold text-[#140b20]">{cargoMode ? "Türkiye Geneli Kargolu Ürünler" : "Popüler Aranjmanlar"}</h2>{useLocationGrid && locationData ? (
      // Coverage Engine ürünleri: 12 SSR + "Daha Fazla Göster" (24/36/48) + gerçek filtreler.
      <LocationProducts
        citySlug={parts[0]}
        districtSlug={parts[1]}
        neighborhoodSlug={effectiveNeighborhood}
        placeName={place}
        initialItems={locationData.items.map(toCardProduct)}
        initialTotal={locationData.pagination.total}
      />
    ) : products.length ? <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{products.map((p) => <Link key={p.id} href={`/urun/${p.slug}`} className="group overflow-hidden rounded-[18px] bg-white"><div className="aspect-square overflow-hidden rounded-[18px] bg-[#f7f5fa]">{p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-[#8b5cf6]">ÇiçekYolla</div>}</div><div className="pt-5"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8b5cf6]">{cargoMode ? "Türkiye Geneli Kargo" : "Premium Aranjman"}</p><h3 className="mt-3 text-lg font-semibold text-[#171020]">{p.name}</h3><p className="mt-3 text-xl font-bold">₺{p.price.toLocaleString("tr-TR")}</p></div></Link>)}</div> : <div className="mt-10 rounded-[24px] border border-[#ede9fe] bg-white p-8"><p className="text-[#746c80]">{cargoMode ? "Şu anda Türkiye geneli kargoya açık ürün bulunmuyor." : "Bu bölgeye gönderilebilen güncel ürünler çiçek koleksiyonunda listeleniyor."}</p><Link href={cargoMode ? "/kategori/turkiye-geneli-kargo" : "/kategori/cicekler"} className="mt-5 inline-flex rounded-full bg-[#8b5cf6] px-6 py-3 font-bold text-white">{cargoMode ? "Tüm Kargolu Ürünleri Gör" : "Çiçekleri İncele"}</Link></div>}</section>

    {injectedIntroHtml ? <section className="bg-white px-6 py-20 lg:px-14"><div className="mx-auto max-w-[1320px] prose prose-sm max-w-none text-[#4b5563]"><div className="space-y-6 text-lg leading-8" dangerouslySetInnerHTML={{ __html: injectedIntroHtml }} /></div></section> : null}

    {injectedBodyBlocks && injectedBodyBlocks.length > 0 ? <section className="bg-white px-6 py-20 lg:px-14"><div className="mx-auto max-w-[1320px] prose prose-sm max-w-none text-[#4b5563]"><div className="space-y-6 text-lg leading-8">{injectedBodyBlocks.map((block, i) => block.type === 'paragraph' ? <p key={i} dangerouslySetInnerHTML={{ __html: block.text || '' }} /> : block.type === 'heading' ? <h2 key={i} dangerouslySetInnerHTML={{ __html: block.text || '' }} /> : <p key={i} dangerouslySetInnerHTML={{ __html: block.text || '' }} />)}</div></div></section> : null}

    {page.faq && page.faq.length > 0 ? <section className="bg-gradient-to-b from-[#f7f5fc] to-white px-6 py-20 lg:px-14"><div className="mx-auto max-w-[1320px]"><div className="mb-14 text-center"><h2 className="font-serif text-5xl font-semibold text-[#140b20]">Sıkça Sorulan Sorular</h2><p className="mt-4 text-lg text-[#667085]">{place} bölgesinde çiçek gönderimiyle ilgili merak edilen konular</p></div><div className="grid gap-6 md:grid-cols-2">{page.faq.map((item, i) => item.q && item.a ? <div key={i} className="rounded-[20px] border border-[#ebe7f2] bg-white p-8 shadow-sm"><h3 className="font-semibold text-[#140b20]">{item.q}</h3><p className="mt-4 text-[#667085]">{item.a}</p></div> : null)}</div></div></section> : null}

    <section className="bg-gradient-to-r from-[#14051f] via-[#2e1065] to-[#6d28d9] px-6 py-20 text-white lg:px-14"><div className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[1fr_1.15fr]"><div><p className="text-xs font-bold uppercase tracking-[.3em] text-[#c4b5fd]">{yonelme(place)} özel</p><h2 className="mt-6 font-serif text-5xl font-semibold leading-tight">{cargoMode ? <>Özenle Hazırlayalım,<br />Güvenle Ulaştıralım</> : <>Bugün Sipariş Ver,<br />Bugün Teslim Edelim</>}</h2><p className="mt-8 text-xl leading-9 text-[#ede9fe]">{cargoMode ? `${place} bölgesine gönderilecek siparişiniz özenle hazırlanır, korumalı şekilde paketlenir ve 1–3 iş günü içinde kargoyla teslim edilir.` : `${place} bölgesine çiçek göndermek hiç bu kadar kolay olmamıştı. ${cutoff}'a kadar verilen siparişler uygun teslimat akışında aynı gün planlanır.`}</p><div className="mt-10 flex flex-wrap gap-4"><Link href="/kategori/cicekler" className="rounded-full bg-white px-8 py-4 font-bold text-[#6d28d9]">Çiçekleri İncele</Link><Link href="https://wa.me/905458813450" className="inline-flex items-center gap-3 rounded-full border border-white/25 px-8 py-4 font-bold text-white"><MessageCircle className="h-5 w-5" /> WhatsApp ile Sipariş</Link></div></div><div className="border-l border-white/15 pl-0 text-lg leading-9 text-[#ede9fe] lg:pl-10"><p>{cityName} ve çevresine çiçek göndermek için güvenilir adresiniz ÇiçekYolla. Taptaze çiçeklerimiz, özenle hazırlanmış buketlerimiz ve profesyonel ekibimizle sevdiklerinize özel anlar yaratıyoruz.</p><p className="mt-7">Doğum günü, sevgililer günü, anneler günü veya herhangi bir özel gün için zarif seçeneklerimiz mevcut. WhatsApp üzerinden de destek sağlıyoruz.</p></div></div></section>
  </main>;
}

export const revalidate = 300;
export const dynamicParams = true;

function slugToPath(slug: string[] | undefined): string {
  if (!slug || slug.length === 0) return "/";
  return "/" + slug.map((s) => decodeURIComponent(s)).join("/");
}
const LEGACY_CATEGORY_REDIRECTS: Record<string, string> = {
  "/cicekler": "/kategori/cicekler",
  "/orkideler": "/kategori/orkideler",
};

type PageProps = { params: { slug?: string[] }; searchParams?: { [k: string]: string | string[] | undefined } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const requestedPath = slugToPath(params.slug);
  const path = LEGACY_CATEGORY_REDIRECTS[requestedPath] || requestedPath;
  const page = await resolvePage(path);
  if (!page) return { title: "Sayfa bulunamadı", robots: { index: false, follow: false } };
  const locationMetadata = await getLocationMetadata(page, path);
  // Lokasyon SEO Merkezi entegrasyonu: OPERATÖR-ONAYLI içerik (content_source
  // kapısı, bkz. lib/managedSeoContent.ts) konum şablonunun ÖNÜNE geçer.
  // Kaynak NULL/otomatik ise (bugün yayındaki tüm sayfalar) davranış birebir eski.
  const title = managedTitle(page) || locationMetadata?.title || page.title_tag;
  const description = managedDescription(page) || locationMetadata?.description || page.meta_description;
  // Category pages are served from /kategori/{slug}; stale catalog canonicals
  // may still point at retired /cicekler/* paths that now return 404.
  const canonicalPath = path.startsWith("/kategori/") ? path : (page.canonical_url || path);
  return { title, description, alternates: { canonical: absoluteUrl(canonicalPath) }, robots: indexRobots(page.index_state), openGraph: { title, description, url: absoluteUrl(canonicalPath), locale: page.lang === "tr" ? "tr_TR" : page.lang, type: "website" } };
}

function renderBlock(block: BodyBlock, i: number) {
  switch (block.type) {
    case "paragraph": return <p key={i}>{block.text}</p>;
    case "heading": return <h2 key={i}>{block.text}</h2>;
    default: return block.text ? <p key={i}>{block.text}</p> : null;
  }
}
function faqJsonLd(page: SeoPublicPage): string | null {
  if (!page.faq || page.faq.length === 0) return null;
  const entities = page.faq.filter((f) => f.q && f.a).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } }));
  if (entities.length === 0) return null;
  return JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: entities });
}

async function getLocationMetadata(page: SeoPublicPage, path: string): Promise<Pick<Metadata, "title" | "description"> | null> {
  const fixedParts = deliveryParts(path);
  const dyn = !fixedParts ? (await dynamicDeliveryParts(path)) || fallbackLocationParts(page, path) : null;
  const parts = fixedParts || dyn?.parts;
  if (!parts) return null;
  const { city, district } = fixedParts ? getDeliveryInfo(fixedParts) : { city: undefined, district: undefined };
  const pageLabel = locationLabel(page, prettySlug(parts.at(-1) || parts[0]));
  const cityName = dyn?.cityName || city?.label || (parts.length === 1 ? pageLabel : prettySlug(parts[0]));
  const districtName = dyn?.districtName || district?.label || (parts[1] ? (parts.length === 2 ? pageLabel : prettySlug(parts[1])) : "");
  const neighborhood = parts[2] ? pageLabel : "";
  const place = neighborhood || districtName || cityName;
  return {
    // MARKA EKLENMEZ: app/layout.tsx metadata şablonu ("%s | ÇiçekYolla")
    // burada da uygulanır — brand'i tekrar eklemek "... | ÇiçekYolla | ÇiçekYolla"
    // duplicate title'ına yol açıyordu (kanıtlandı: canlı /istanbul/kadikoy).
    title: `${place} Çiçekçi — ${place} Çiçek Siparişi`,
    description: locationSeoDescription(parts, cityName, districtName, neighborhood),
  };
}

export default async function Page({ params, searchParams }: PageProps) {
  const requestedPath = slugToPath(params.slug);
  const redirectTarget = LEGACY_CATEGORY_REDIRECTS[requestedPath];
  if (redirectTarget) redirect(redirectTarget);
  const path = requestedPath;
  const page = await resolvePage(path);
  if (!page) notFound();
  const faqLd = faqJsonLd(page);
  const rawSchema = page.schema_jsonld && Object.keys(page.schema_jsonld).length > 0 ? JSON.stringify(page.schema_jsonld) : null;
  const jsonLd = <>{rawSchema ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: rawSchema }} /> : null}{faqLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} /> : null}</>;
  if (path.startsWith("/kategori/")) return <><CategoryLanding page={page} path={path} searchParams={searchParams} />{jsonLd}</>;
  if (deliveryParts(path)) return <><DeliveryLanding page={page} path={path} />{jsonLd}</>;
  // Page type adı değişse bile yalnız gerçek şehir/ilçe eşleşmesi premium konum şablonuna alınır.
  const dyn = (await dynamicDeliveryParts(path)) || fallbackLocationParts(page, path);
  if (dyn) return <><DeliveryLanding page={page} path={path} dyn={dyn} />{jsonLd}</>;
  return <main><h1>{page.h1}</h1>{page.intro_html ? <div dangerouslySetInnerHTML={{ __html: page.intro_html }} /> : null}{page.body_blocks?.map((b, i) => renderBlock(b, i))}{page.faq && page.faq.length > 0 ? <section><h2>Sıkça Sorulan Sorular</h2>{page.faq.map((f, i) => f.q && f.a ? <div key={i}><h3>{f.q}</h3><p>{f.a}</p></div> : null)}</section> : null}{jsonLd}</main>;
}
