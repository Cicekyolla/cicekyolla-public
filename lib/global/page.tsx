// ============================================================================
// GLOBAL Faz 2 — locale sayfa motoru (server components).
// app/de/[[...path]] ve app/en/[[...path]] ince sarmalayıcıları buraya gelir.
//
// Sayfa türleri:
//   home                → global_pages 'home' (approved ise DB; yoksa foundation metni)
//   page (istanbul, istanbul/<ilçe>) → global_pages (yalnız approved render)
//   category            → category_translations yüzeyi + locale-içi ürün zinciri
//   product             → product_translations yüzeyi + TR core (fiyat/görsel)
//
// SEO kuralları (kanun):
//  - URL locale = SEO source of truth; self-canonical; TR canonical koduna dokunulmaz.
//  - robots: yalnız approved + indexable yüzeyler index; geri kalan noindex.
//  - hreflang: yalnız GERÇEK yayınlanmış (approved+indexable) karşılıklar arasında,
//    en az 2 üye varsa; TR return-link'i TR sayfalarına eklenene kadar TR cluster'a girmez.
//  - İç bağlantı zinciri locale ailesi İÇİNDE kalır (DE sayfadan TR yüzeyine düşme yok).
// ============================================================================
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { absoluteUrl } from "@/lib/site-config";
import { buildProductJsonLd, serializeJsonLd } from "@/lib/productSchema";
import { toPlainText } from "@/lib/richText";
import { withXDefault } from "./hreflang";
import { localeBreadcrumbJsonLd } from "./localeBreadcrumb";
import { LABELS } from "./locationLabels";
import { fetchProductBySlug, fetchProducts, fetchProductsPaged, formatMinorTRY, type PublicProductDetail } from "@/lib/api";
import { ProductCard, type Product as CardProductUi } from "@/components/home/ProductCard";
import { ProductImage } from "@/components/product/ProductImage";
import { ProductDetail, type AutoSizeProduct } from "@/components/product/ProductDetail";
import { sanitizeProductHtml, DESC_PROSE } from "@/lib/richText";
import {
  parseLocationKey, fetchLocaleDistricts, fetchLocaleNeighborhoods, fetchLocationNames,
} from "./locationTree";
import { LocationBreadcrumb, LocationGrid, ilceBasligi, mahalleBasligi, cityDisplayName } from "./locationNav";
import { CARGO, CARGO_COLLECTION_PATH } from "./cargoCopy";
import {
  TrustStrip, EmotionSection, DistanceSection, AtelierSection,
  ConciergeSection, DeliveryProofSection, MessageSection, FinalCta, CargoTrustStrip, NeutralTrustStrip, FarTrustStrip,
} from "./sections";
import { GlobalGoogleTrust } from "@/components/global/GlobalGoogleTrust";
import { GlobalCatalogBrowser, type CatalogBrowserItem } from "@/components/global/GlobalCatalogBrowser";
import {
  type GlobalLocale,
  parseLocalePath,
  localeProductPath,
  isGlobalLocale,
  isSameDayDestination,
  SEGMENTS,
  DIR,
} from "./config";
import {
  fetchProductSurface,
  fetchProductLocaleCluster,
  fetchGlobalPage,
  fetchCategorySurface,
  fetchLocaleCatalog,
  fetchGlobalCatalog,
  type GlobalPage,
  type LocaleCatalog,
} from "./api";
import { catalogDecision, planLocationPage, hasCardFields, fallbackCategoryCards, deliveryPresentation, type CatalogDecision, type CatalogProduct, type LocationPlan } from "./globalCatalog";
import { REACH, FAR, formatThresholdTl } from "./reachCopy";
import {
  parseLocationSections, renderableLocationSections, DEFAULT_LOCATION_SECTIONS,
  type LocationSection, type LocationSectionId,
} from "./locationSections";
import {
  resolveLocationCatalog, isLocationContinuationPage,
  type LocationCatalogView, type LocationSearchParams,
} from "./locationPaging";
import { mediaUrl, mediaDerivatives } from "@/lib/media";
// GLOBAL VERSION 80 — yeni kasa: ana sayfa V80Page, tüm locale sayfaları V80Shell (başlık) içinde.
import { loadV80, v80HeaderFromCatalog, v80Contact, v80FooterFromView, v80FooterFromCatalog } from "./v80/data";
import { mergedTexts } from "./v80/copy";
import { V80Shell } from "@/components/global/v80/V80Shell";
import { V80Page } from "@/components/global/v80/V80Page";

// ---- TR mağaza ailesine köprü ---------------------------------------------
// Kart rozetleri müşteri-dilinde (core badge TR üretir; burada locale karşılığı).
const BADGE_L10N: Record<GlobalLocale, Record<string, string>> = {
  de: { "İndirim": "Angebot", "Yeni": "Neu", "Çok Satan": "Bestseller" },
  en: { "İndirim": "Sale", "Yeni": "New", "Çok Satan": "Bestseller" },
  fr: { "İndirim": "Promo", "Yeni": "Nouveau", "Çok Satan": "Best-seller" },
  nl: { "İndirim": "Korting", "Yeni": "Nieuw", "Çok Satan": "Bestseller" },
  it: { "İndirim": "Offerta", "Yeni": "Novità", "Çok Satan": "Bestseller" },
  es: { "İndirim": "Oferta", "Yeni": "Nuevo", "Çok Satan": "Superventas" },
  pt: { "İndirim": "Promoção", "Yeni": "Novo", "Çok Satan": "Mais vendido" },
  az: { "İndirim": "Endirim", "Yeni": "Yeni", "Çok Satan": "Bestseller" },
  ru: { "İndirim": "Скидка", "Yeni": "Новинка", "Çok Satan": "Хит продаж" },
  ar: { "İndirim": "خصم", "Yeni": "جديد", "Çok Satan": "الأكثر مبيعًا" },
  zh: { "İndirim": "特惠", "Yeni": "新品", "Çok Satan": "畅销" },
  ja: { "İndirim": "セール", "Yeni": "新作", "Çok Satan": "ベストセラー" },
  ko: { "İndirim": "할인", "Yeni": "신상품", "Çok Satan": "베스트셀러" },
};

/** Core ürün detayını mevcut ProductCard tipine çevirir (mediaUrl'lü görsel,
    gerçek fiyat/indirim/rozet); ad localized yüzeyden gelir. */
function detailToCard(locale: GlobalLocale, d: PublicProductDetail, localizedName: string): CardProductUi {
  const pr = d.product;
  const cover = d.images.find((i) => i.role === "cover") ?? d.images[0];
  const hasSale = pr.sale_price_minor != null && Number(pr.sale_price_minor) > 0 && Number(pr.sale_price_minor) < Number(pr.price_minor);
  const rawBadge = hasSale ? "İndirim" : pr.is_new ? "Yeni" : pr.is_bestseller ? "Çok Satan" : undefined;
  return {
    id: pr.id,
    name: localizedName,
    slug: pr.slug,
    price: Math.round((hasSale ? Number(pr.sale_price_minor) : Number(pr.price_minor)) / 100),
    originalPrice: hasSale ? Math.round(Number(pr.price_minor) / 100) : undefined,
    image: cover?.url ?? "",
    badge: rawBadge ? (BADGE_L10N[locale][rawBadge] ?? rawBadge) : undefined,
    productType: pr.product_type,
    sameDay: pr.same_day_available,
    scope: pr.delivery_scope,
    hasSale,
    categoryId: null,
    derivatives: cover?.derivatives ?? null,
    blurhash: cover?.blurhash ?? null,
  };
}

/** Katalog / kategori yüzeyi satırı → aynı ProductCard modeli (detailToCard ile birebir alanlar; ürün
    başına detay isteği YOK — satır API'de kapak/fiyat/rozet alanlarıyla tek sorguda gelir). */
type CardRow = {
  id?: number; tr_slug: string; name: string; price_minor?: number | string | null; sale_price_minor?: number | string | null;
  image?: string | null; blurhash?: string | null; derivatives?: { webp?: string; avif?: string; responsive?: Record<string, string> } | null;
  is_new?: boolean; is_bestseller?: boolean; same_day_available?: boolean; product_type?: string | null; delivery_scope?: string | null;
};
function rowToCard(locale: GlobalLocale, p: CardRow): CardProductUi {
  const price = Number(p.price_minor);
  const sale = p.sale_price_minor == null ? null : Number(p.sale_price_minor);
  const hasSale = sale != null && sale > 0 && sale < price;
  const rawBadge = hasSale ? "İndirim" : p.is_new ? "Yeni" : p.is_bestseller ? "Çok Satan" : undefined;
  return {
    id: Number(p.id),
    name: p.name,
    slug: p.tr_slug,
    price: Math.round((hasSale ? (sale as number) : price) / 100),
    originalPrice: hasSale ? Math.round(price / 100) : undefined,
    image: mediaUrl(p.image),
    badge: rawBadge ? (BADGE_L10N[locale][rawBadge] ?? rawBadge) : undefined,
    productType: p.product_type ?? undefined,
    sameDay: !!p.same_day_available,
    scope: p.delivery_scope ?? undefined,
    hasSale,
    categoryId: null,
    derivatives: mediaDerivatives(p.derivatives ?? null),
    blurhash: p.blurhash ?? null,
  };
}

/** Lokasyon sayfası planı (katalog modu) — GlobalPageBody'de BİR KEZ kurulur, bölümler paylaşır. */
type LocationCatalogPlan = LocationPlan<CatalogProduct>;
/** Kategori keşif kartı (görsel YALNIZ kategorinin kendi kapağı). */
type CategoryTile = { slug: string; name: string; count: number; img?: string };

/** Lokasyon planı → katalog kartları YALNIZ verilen id'ler için (sayfa dilimi; sıra korunur). Tam liste
    kart modeline çevrilmez, DOM'a / RSC yüküne girmez. Kart modeli sunucuda; ürün başına istek yok. */
function catalogItems(locale: GlobalLocale, plan: LocationCatalogPlan, ids: readonly number[], sameDayBadge = true): CatalogBrowserItem[] {
  const seg = SEGMENTS[locale];
  // sameDayBadge=false (kargo / nötr sunum): kart "Aynı Gün Teslim" rozeti basmaz — ürün aynı güne uygun olsa da
  // bu lokasyon/adres için karar ödemede verilir (ürün özelliği ≠ bu adrese vaat).
  return ids
    .map((id) => plan.byId.get(id))
    .filter((p): p is CatalogProduct => p !== undefined)
    .map((p) => ({ id: p.id, href: `/${locale}/${seg.product}/${p.slug}`, card: { ...rowToCard(locale, p), sameDay: sameDayBadge && !!p.same_day_available } }));
}

// Foundation yedek metinleri — global_pages 'home' onaylanana kadar (noindex).
// Foundation yedek metinleri — locale'in approved 'home' sayfası olana kadar
// (bu yüzeyler NOINDEX'tir; vitrin açılışı Admin onayıyla olur).
const HOME_FALLBACK: Record<GlobalLocale, { title: string; h1: string; p: string }> = {
  de: { title: "ÇiçekYolla — Blumen nach Istanbul verschicken", h1: "Blumen nach Istanbul verschicken", p: "ÇiçekYolla ist ein Blumenladen in Istanbul. Taggleiche Lieferung in Istanbul, türkeiweiter Versand in 1–3 Werktagen." },
  en: { title: "ÇiçekYolla — Send Flowers to Istanbul", h1: "Send Flowers to Istanbul", p: "ÇiçekYolla is a florist based in Istanbul. Same-day delivery in Istanbul, nationwide shipping across Turkey in 1–3 business days." },
  fr: { title: "ÇiçekYolla — Livraison de fleurs à Istanbul", h1: "Faire livrer des fleurs à Istanbul", p: "ÇiçekYolla est un fleuriste basé à Istanbul. Livraison le jour même à Istanbul, expédition dans toute la Turquie en 1 à 3 jours ouvrés." },
  nl: { title: "ÇiçekYolla — Bloemen bezorgen in Istanbul", h1: "Bloemen bezorgen in Istanbul", p: "ÇiçekYolla is een bloemist in Istanbul. Bezorging dezelfde dag in Istanbul, verzending door heel Turkije in 1–3 werkdagen." },
  it: { title: "ÇiçekYolla — Consegna fiori a Istanbul", h1: "Consegna di fiori a Istanbul", p: "ÇiçekYolla è un fiorista di Istanbul. Consegna in giornata a Istanbul, spedizione in tutta la Turchia in 1–3 giorni lavorativi." },
  es: { title: "ÇiçekYolla — Enviar flores a Estambul", h1: "Enviar flores a Estambul", p: "ÇiçekYolla es una floristería de Estambul. Entrega el mismo día en Estambul y envíos a toda Turquía en 1–3 días laborables." },
  pt: { title: "ÇiçekYolla — Entrega de flores em Istambul", h1: "Enviar flores para Istambul", p: "A ÇiçekYolla é uma florista de Istambul. Entrega no mesmo dia em Istambul e envio para toda a Turquia em 1–3 dias úteis." },
  az: { title: "ÇiçekYolla — İstanbula gül çatdırılması", h1: "İstanbula gül göndərin", p: "ÇiçekYolla İstanbulda yerləşən gül mağazasıdır. İstanbulda elə həmin gün çatdırılma, Türkiyə üzrə 1–3 iş gününə göndərmə." },
  ru: { title: "ÇiçekYolla — Доставка цветов в Стамбуле", h1: "Доставка цветов в Стамбул", p: "ÇiçekYolla — цветочный магазин в Стамбуле. Доставка в день заказа по Стамбулу, отправка по всей Турции за 1–3 рабочих дня." },
  ar: { title: "ÇiçekYolla — توصيل الزهور في اسطنبول", h1: "إرسال الزهور إلى اسطنبول", p: "ÇiçekYolla متجر زهور في اسطنبول. توصيل في نفس اليوم داخل اسطنبول، وشحن إلى جميع أنحاء تركيا خلال 1–3 أيام عمل." },
  zh: { title: "ÇiçekYolla — 伊斯坦布尔鲜花速递", h1: "送花到伊斯坦布尔", p: "ÇiçekYolla 是位于伊斯坦布尔的花店。伊斯坦布尔市内当日送达，土耳其全国 1–3 个工作日发货。" },
  ja: { title: "ÇiçekYolla — イスタンブールへの花のお届け", h1: "イスタンブールに花を贈る", p: "ÇiçekYolla はイスタンブールのフラワーショップです。イスタンブール市内は当日配達、トルコ全土へは1〜3営業日でお届けします。" },
  ko: { title: "ÇiçekYolla — 이스탄불 꽃 배달", h1: "이스탄불로 꽃 보내기", p: "ÇiçekYolla는 이스탄불의 꽃집입니다. 이스탄불 내 당일 배송, 튀르키예 전역 1–3 영업일 배송." },
};

const SHOP: Record<GlobalLocale, { unit: string; shopAll: string; from: string; all: string }> = {
  de: { unit: "Produkte", shopAll: "Alle ansehen →", from: "Ausgewählt für Istanbul", all: "Alle" },
  en: { unit: "products", shopAll: "View all →", from: "Selected for Istanbul", all: "All" },
  fr: { unit: "produits", shopAll: "Tout voir →", from: "Sélection pour Istanbul", all: "Tout" },
  nl: { unit: "producten", shopAll: "Alles bekijken →", from: "Geselecteerd voor Istanbul", all: "Alles" },
  it: { unit: "prodotti", shopAll: "Vedi tutto →", from: "Selezionati per Istanbul", all: "Tutti" },
  es: { unit: "productos", shopAll: "Ver todo →", from: "Selección para Estambul", all: "Todos" },
  pt: { unit: "produtos", shopAll: "Ver tudo →", from: "Seleção para Istambul", all: "Todos" },
  az: { unit: "məhsul", shopAll: "Hamısına bax →", from: "İstanbul üçün seçilmiş", all: "Hamısı" },
  ru: { unit: "товаров", shopAll: "Смотреть все →", from: "Выбрано для Стамбула", all: "Все" },
  ar: { unit: "منتجات", shopAll: "عرض الكل ←", from: "مختارة لإسطنبول", all: "الكل" },
  zh: { unit: "件商品", shopAll: "查看全部 →", from: "为伊斯坦布尔精选", all: "全部" },
  ja: { unit: "点", shopAll: "すべて見る →", from: "イスタンブールへの厳選", all: "すべて" },
  ko: { unit: "개 상품", shopAll: "전체 보기 →", from: "이스탄불을 위한 셀렉션", all: "전체" },
};

const UI: Record<GlobalLocale, { categories: string; popular: string; faq: string; orderCta: string; orderNote: string }> = {
  de: { categories: "Kategorien", popular: "Beliebte Blumen für Istanbul", faq: "Häufige Fragen", orderCta: "Jetzt bestellen →", orderNote: "Die Bestellung wird in unserem Shop abgeschlossen (internationale Visa/Mastercard werden akzeptiert)." },
  en: { categories: "Categories", popular: "Popular flowers for Istanbul delivery", faq: "Frequently asked questions", orderCta: "Order now →", orderNote: "Checkout completes in our store (international Visa/Mastercard accepted)." },
  fr: { categories: "Catégories", popular: "Fleurs populaires pour Istanbul", faq: "Questions fréquentes", orderCta: "Commander →", orderNote: "La commande se termine dans notre boutique (cartes Visa/Mastercard internationales acceptées)." },
  nl: { categories: "Categorieën", popular: "Populaire bloemen voor Istanbul", faq: "Veelgestelde vragen", orderCta: "Nu bestellen →", orderNote: "De bestelling wordt afgerond in onze winkel (internationale Visa/Mastercard geaccepteerd)." },
  it: { categories: "Categorie", popular: "Fiori più richiesti per Istanbul", faq: "Domande frequenti", orderCta: "Ordina ora →", orderNote: "L'ordine si completa nel nostro negozio (carte Visa/Mastercard internazionali accettate)." },
  es: { categories: "Categorías", popular: "Flores populares para Estambul", faq: "Preguntas frecuentes", orderCta: "Pedir ahora →", orderNote: "El pedido se completa en nuestra tienda (se aceptan Visa/Mastercard internacionales)." },
  pt: { categories: "Categorias", popular: "Flores populares para Istambul", faq: "Perguntas frequentes", orderCta: "Encomendar →", orderNote: "A encomenda é concluída na nossa loja (aceitamos Visa/Mastercard internacionais)." },
  az: { categories: "Kateqoriyalar", popular: "İstanbul üçün populyar güllər", faq: "Tez-tez verilən suallar", orderCta: "Sifariş et →", orderNote: "Sifariş mağazamızda tamamlanır (beynəlxalq Visa/Mastercard qəbul olunur)." },
  ru: { categories: "Категории", popular: "Популярные цветы для Стамбула", faq: "Частые вопросы", orderCta: "Заказать →", orderNote: "Оформление завершается в нашем магазине (принимаются международные Visa/Mastercard)." },
  ar: { categories: "الفئات", popular: "أشهر الزهور للتوصيل في اسطنبول", faq: "الأسئلة الشائعة", orderCta: "← اطلب الآن", orderNote: "تكتمل عملية الشراء في متجرنا (نقبل بطاقات Visa/Mastercard الدولية)." },
  zh: { categories: "分类", popular: "伊斯坦布尔热门鲜花", faq: "常见问题", orderCta: "立即订购 →", orderNote: "订单在本店完成结算（支持国际 Visa/Mastercard）。" },
  ja: { categories: "カテゴリー", popular: "イスタンブールで人気の花", faq: "よくある質問", orderCta: "今すぐ注文 →", orderNote: "ご注文は当店で完了します（海外発行の Visa/Mastercard がご利用いただけます）。" },
  ko: { categories: "카테고리", popular: "이스탄불 인기 꽃", faq: "자주 묻는 질문", orderCta: "지금 주문 →", orderNote: "주문은 본 매장에서 완료됩니다 (해외 발급 Visa/Mastercard 사용 가능)." },
};

const NOINDEX = { index: false, follow: false } as const;

// ---- Metadata -------------------------------------------------------------

function pageLanguages(locale: GlobalLocale, row: GlobalPage): Record<string, string> | null {
  if (!row.indexable) return null;
  const languages: Record<string, string> = {};
  for (const alt of row.locales ?? []) {
    if (alt.indexable && isGlobalLocale(alt.locale)) {
      const path = row.page_key === "home" ? `/${alt.locale}` : `/${alt.locale}/${row.page_key}`;
      languages[alt.locale] = absoluteUrl(path);
    }
  }
  // ADDITIVE (24 Eyl 2026): x-default = kümedeki EN (yoksa alfabetik ilk) — lib/global/hreflang.ts
  return Object.keys(languages).length > 1 ? withXDefault(languages) : null;
}

export async function localeMetadata(locale: GlobalLocale, path: string[]): Promise<Metadata> {
  const parsed = parseLocalePath(locale, path);

  if (parsed.kind === "home") {
    const row = await fetchGlobalPage(locale, "home");
    const self = absoluteUrl(`/${locale}`);
    if (!row) {
      return { title: HOME_FALLBACK[locale].title, robots: NOINDEX, alternates: { canonical: self } };
    }
    const languages = pageLanguages(locale, row);
    return {
      title: row.seo_title ?? row.h1 ?? HOME_FALLBACK[locale].title,
      description: row.meta_description ?? undefined,
      robots: row.indexable ? undefined : NOINDEX,
      alternates: languages ? { canonical: self, languages } : { canonical: self },
    };
  }

  if (parsed.kind === "page") {
    const row = await fetchGlobalPage(locale, parsed.key);
    if (!row) return { robots: NOINDEX };
    const self = absoluteUrl(`/${locale}/${row.page_key}`);
    const languages = pageLanguages(locale, row);
    return {
      title: row.seo_title ?? row.h1 ?? undefined,
      description: row.meta_description ?? undefined,
      robots: row.indexable ? undefined : NOINDEX,
      alternates: languages ? { canonical: self, languages } : { canonical: self },
    };
  }

  if (parsed.kind === "category") {
    const surface = await fetchCategorySurface(locale, parsed.slug);
    if (!surface) return { robots: NOINDEX };
    const self = absoluteUrl(`/${locale}/${SEGMENTS[locale].category}/${surface.slug}`);
    const meta: Metadata = {
      title: surface.seo_title ?? surface.name ?? undefined,
      description: surface.meta_description ?? undefined,
      robots: surface.indexable ? undefined : NOINDEX,
      alternates: { canonical: self },
    };
    if (surface.indexable) {
      const languages: Record<string, string> = {};
      for (const alt of surface.locales ?? []) {
        if (alt.indexable && isGlobalLocale(alt.locale)) {
          languages[alt.locale] = absoluteUrl(`/${alt.locale}/${SEGMENTS[alt.locale].category}/${alt.slug}`);
        }
      }
      if (Object.keys(languages).length > 1) meta.alternates = { canonical: self, languages: withXDefault(languages) };
    }
    return meta;
  }

  if (parsed.kind === "product") {
    const surface = await fetchProductSurface(locale, parsed.slug);
    if (!surface) return { robots: NOINDEX };
    const self = absoluteUrl(localeProductPath(locale, surface.slug));
    const meta: Metadata = {
      title: surface.seo_title ?? surface.name ?? undefined,
      description: surface.meta_description ?? undefined,
      robots: surface.indexable ? undefined : NOINDEX,
      alternates: { canonical: self },
    };
    if (surface.indexable) {
      const cluster = await fetchProductLocaleCluster(surface.product_id);
      const languages: Record<string, string> = {};
      for (const alt of cluster?.locales ?? []) {
        if (alt.indexable && isGlobalLocale(alt.locale)) {
          languages[alt.locale] = absoluteUrl(localeProductPath(alt.locale, alt.slug));
        }
      }
      if (Object.keys(languages).length > 1) meta.alternates = { canonical: self, languages: withXDefault(languages) };
    }
    return meta;
  }

  return { robots: NOINDEX };
}

// ---- Ortak parçalar -------------------------------------------------------

const S = {
  main: { maxWidth: 860, margin: "0 auto", padding: "40px 20px" } as const,
  h1: { fontSize: 28, lineHeight: 1.25, marginBottom: 14 } as const,
  h2: { fontSize: 19, marginTop: 32, marginBottom: 12 } as const,
  p: { fontSize: 15, lineHeight: 1.65 } as const,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 } as const,
  card: { border: "1px solid #E9E5F5", borderRadius: 12, padding: "12px 14px", fontSize: 14, textDecoration: "none", color: "#1F2937", display: "block" } as const,
  chip: { display: "inline-block", border: "1px solid #E9E5F5", borderRadius: 999, padding: "6px 14px", margin: "0 8px 8px 0", fontSize: 13.5, textDecoration: "none", color: "#6D28D9" } as const,
};

/**
 * Global lokasyon vitrini — TR mağaza ailesiyle AYNI ProductCard'ı kullanır.
 *
 * İKİ KAYNAK, TEK DÜZEN:
 *  • catalog (API /api/public/global/catalog): bu lokasyona teslim edilebilir GLOBAL KATALOGUN
 *    TAMAMI — önce vitrin öne çıkanları (vitrin sırası), sonra her ürün tam bir kez gerçek kategori
 *    rafında (Global Merkezi sırası). Kategori kartları bu lokasyondaki gerçek bağ sayıları ve
 *    Category Center görseliyle. Ürün başına istek yok.
 *  • aksi hâlde (uç yok / hata): bugünkü davranış AYNEN — localeCatalog + core detay.
 * 0 ürünlü kategori vitrine çıkmaz (müşteriye boş raf gösterilmez).
 *
 * BÖLÜMLER (sıra lib/global/locationSections.ts): "commerce" = başlık + çipler + ürün ızgarası
 * (CatalogCommerceSection), "categories" = kategori keşif kartları (CategoryCardsSection).
 * İkisi de GlobalPageBody'de BİR KEZ kurulan planLocationPage sonucunu paylaşır.
 *
 * SAYFALAMA (lib/global/locationPaging.ts, TR ?page standardı): ?category=<slug> + ?page=<N>, sayfa başına 24.
 * Önce son sıralı liste, sonra dilim; SSR yalnız dilimi basar. ?page ≥ 2 → hero (kırıntı + H1) + ürün alanı.
 * Canonical/hreflang/robots sorgusuz yoldan (localeMetadata) — DEĞİŞMEZ.
 */

/**
 * Kategori kartları verisi — katalog modunda plan.tiles (bu lokasyonda teslim edilebilir ürünü olan
 * kategoriler, API sırası; çiplerle aynı sıra). Yedek yolda (uç yok/hata) aynı gün şehrinde locale
 * kataloğu; KARGO yedeğinde teslimat süzmesi olmadığından kart basılmaz (gidemeyen kategoriye yönlendirme yok).
 */
function locationTiles(catalog: LocaleCatalog, plan: LocationCatalogPlan | null, cargo: boolean): CategoryTile[] {
  let tiles: CategoryTile[];
  if (plan) {
    tiles = plan.tiles.map((t) => ({ slug: t.slug, name: t.name, count: t.count, img: mediaUrl(t.image) || undefined }));
  } else if (cargo) {
    tiles = [];
  } else {
    // Kategori kartı görseli yalnız kategorinin kendi kapağı (ürün fotoğrafı kapak yapılmaz).
    tiles = fallbackCategoryCards(catalog.categories).map((c) => ({ slug: c.slug, name: c.name, count: c.count, img: mediaUrl(c.image) || undefined }));
  }
  return tiles;
}

/**
 * Kategori keşif kartları — kompakt, eşit yükseklik (sabit 4:3 çerçeve + tek satır ad + tek satır sayı).
 * Görsel YALNIZ Category Center kapağı; kapak yoksa nötr boş çerçeve (ürün fotoğrafı kapak yapılmaz).
 */
function CategoryCardsSection({ locale, tiles }: { locale: GlobalLocale; tiles: CategoryTile[] }) {
  if (tiles.length === 0) return null;
  const seg = SEGMENTS[locale];
  const shop = SHOP[locale];
  return (
    <section className="mt-12" data-location-category-cards>
      <h2 className="mb-4 text-[19px] font-semibold text-[#1C0838]">{UI[locale].categories}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {tiles.map((c) => (
          <Link
            key={c.slug}
            href={`/${locale}/${seg.category}/${c.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-[16px] border border-[#EDE9FE] bg-white transition duration-200 hover:-translate-y-0.5 hover:border-[#8B5CF6] hover:shadow-[0_10px_26px_rgba(124,58,237,0.10)]"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-[#FAF9FE]">
              {c.img ? <ProductImage src={c.img} alt={c.name} padding="8px" sizes="(max-width:640px) 50vw, (max-width:1024px) 25vw, 180px" /> : null}
            </div>
            <div className="px-3 py-2.5">
              <p className="truncate text-[13.5px] font-bold text-[#111827]">{c.name}</p>
              <p className="mt-0.5 truncate text-[11.5px] text-[#8B5CF6]">{c.count} {shop.unit}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Ürün alanı (aynı gün şehri): başlık + not + kategori çipleri + ürün ızgarası (+ sayfalama); yedek yolda bugünkü popüler + raflar. */
async function CatalogCommerceSection({ locale, catalog, plan, view, note }: {
  locale: GlobalLocale; catalog: LocaleCatalog; plan: LocationCatalogPlan | null;
  /** ADDITIVE: nötr modda (sınır/belirsiz erişim) ürün alanı üst notu — vaat yerine "ödemede doğrulanır". */
  note?: string;
  /** Bu isteğin katalog görünümü (?category + ?page); plan varsa dolu. */
  view: LocationCatalogView | null;
}) {
  const seg = SEGMENTS[locale];
  const ui = UI[locale];
  const shop = SHOP[locale];

  if (plan && view) {
    // Katalog modunda: çip linkleri + YALNIZ bu sayfanın 24'lük dilimi + sayfalama (GlobalCatalogBrowser).
    return (
      <section className="mt-12" data-global-location-catalog>
        <h2 className="mb-1 text-[19px] font-semibold text-[#1C0838]">{ui.popular}</h2>
        <p className="mb-4 text-[12.5px] text-[#6B7280]" data-commerce-note={note ? "neutral" : undefined}>{note ?? shop.from}</p>
        <GlobalCatalogBrowser locale={locale} items={catalogItems(locale, plan, view.ids, !note)} view={view} />
      </section>
    );
  }

  // Locale adı: locale slug → çevrilmiş ad (kart adı TR'ye düşmesin)
  const adBySlug = new Map(catalog.products.map((p) => [p.slug, p.name]));
  const trBySlug = new Map(catalog.products.map((p) => [p.slug, p.tr_slug]));

  // Vitrinde gösterilecek tüm ürünler TEK seferde toplanır (aynı ürün iki kez çekilmez).
  const dolu = catalog.categories.filter((c) => (c.live_products ?? 0) > 0);
  const one = catalog.products.slice(0, 8).map((p) => p.slug);
  const raflar = dolu
    .filter((c) => (c.live_products ?? 0) >= 3)
    .slice(0, 3)
    .map((c) => ({ cat: c, slugs: (c.product_slugs ?? []).slice(0, 4) }));
  const gerekli = [...new Set([...one, ...raflar.flatMap((r) => r.slugs)])];
  const detaylar = await Promise.all(
    gerekli.map(async (localeSlug) => {
      const tr = trBySlug.get(localeSlug);
      if (!tr) return null;
      const d = await fetchProductBySlug(tr);
      return d ? ([localeSlug, d] as const) : null;
    })
  );
  const byLocaleSlug = new Map(detaylar.filter(Boolean) as (readonly [string, PublicProductDetail])[]);

  const kart = (localeSlug: string) => {
    const d = byLocaleSlug.get(localeSlug);
    if (!d) return null;
    return { card: detailToCard(locale, d, adBySlug.get(localeSlug) ?? d.product.name), href: `/${locale}/${seg.product}/${localeSlug}` };
  };
  const oneKartlar = one.map(kart).filter(Boolean) as { card: CardProductUi; href: string }[];
  const rafKartlar = raflar.map((r) => ({
    slug: r.cat.slug,
    name: r.cat.name,
    kartlar: r.slugs.map(kart).filter(Boolean) as { card: CardProductUi; href: string }[],
  }));

  return (
    <>
      {/* Öne çıkan ürünler — TR mağazasıyla aynı ProductCard */}
      {oneKartlar.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-1 text-[19px] font-semibold text-[#1C0838]">{ui.popular}</h2>
          <p className="mb-4 text-[12.5px] text-[#6B7280]" data-commerce-note={note ? "neutral" : undefined}>{note ?? shop.from}</p>
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
            {oneKartlar.map(({ card: c, href }, idx) => (
              <ProductCard key={c.id} product={c} idx={Math.min(idx, 7)} href={href} />
            ))}
          </div>
        </section>
      )}

      {/* Kategori rafları — yalnız o dilde yeterli canlı ürünü olan kategoriler */}
      {rafKartlar.map((r) => {
        if (r.kartlar.length < 2) return null;
        return (
          <section key={r.slug} className="mt-12">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-[19px] font-semibold text-[#1C0838]">{r.name}</h2>
              <Link href={`/${locale}/${seg.category}/${r.slug}`} className="shrink-0 text-[12.5px] font-semibold text-[#7C3AED] hover:underline">
                {shop.shopAll}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
              {r.kartlar.map(({ card: c, href }, idx) => (
                <ProductCard key={c.id} product={c} idx={Math.min(idx, 7)} href={href} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

/**
 * KARGO ŞEHRİ VİTRİNİ — yalnız Delivery Motor'un bu destinasyona GÖNDEREBİLDİĞİ
 * ürünler (teslimat profili cargo_capable; TR il sayfasıyla aynı tek otorite),
 * o dilde canlı çeviri ile kesişimi. Fresh-only ürün burada ASLA görünmez →
 * müşteri checkout'ta "adrese gidemez" duvarına çarpmaz. Kapanışta TR mağaza
 * ailesindeki kargolanabilir koleksiyona bilinçli köprü (mevcut PDP CTA'sıyla
 * aynı commerce handoff kararı).
 */
async function CargoCatalogSection({ locale, city, label, catalog, plan, view }: {
  locale: GlobalLocale; city: string;
  /** ADDITIVE: başlıkta şehir eksonimi yerine basılacak ad (band dışı İstanbul ilçesi). */
  label?: string;
  catalog: LocaleCatalog; plan: LocationCatalogPlan | null;
  /** Bu isteğin katalog görünümü (?category + ?page); plan varsa dolu. */
  view: LocationCatalogView | null;
}) {
  const copy = CARGO[locale];
  const seg = SEGMENTS[locale];
  const cityName = label ?? cityDisplayName(locale, city);

  let kartlar: { card: CardProductUi; href: string }[];
  let browser: React.ReactNode = null;
  if (plan && view) {
    // Global katalog: API bu şehre teslim edilebilirliği (kargolanabilir profil + Coverage) zaten uyguladı.
    // İstanbul ile aynı kural: çip linkleri (çok kategorili ürün her gerçek kategorisinde) + YALNIZ bu
    // sayfanın 24'lük dilimi + sayfalama; tam liste kart modeline çevrilmez.
    // Plan GlobalPageBody'de bir kez kurulur (kategori kartlarıyla paylaşılır).
    kartlar = [];
    if (plan.allOrder.length) browser = <GlobalCatalogBrowser locale={locale} items={catalogItems(locale, plan, view.ids, false)} view={view} />;
  } else {
    // Kargolanabilir ürün kümesi (tüm sayfalar; ≤ 300 kayıt — profil listesi küçüktür).
    const deliverable = new Set<string>();
    for (let page = 1; page <= 3; page++) {
      const p = await fetchProductsPaged({ delivery_model: "cargo_capable", page_size: 100, page });
      for (const it of p.items) deliverable.add(it.slug);
      if (page >= p.pagination.total_pages) break;
    }
    const uygun = catalog.products.filter((p) => deliverable.has(p.tr_slug)).slice(0, 8);
    const detaylar = await Promise.all(
      uygun.map(async (p) => {
        const d = await fetchProductBySlug(p.tr_slug);
        return d ? { card: { ...detailToCard(locale, d, p.name), sameDay: false }, href: `/${locale}/${seg.product}/${p.slug}` } : null;
      })
    );
    kartlar = detaylar.filter(Boolean) as { card: CardProductUi; href: string }[];
  }

  return (
    <section className="mt-12" data-cargo-catalog>
      <h2 className="mb-1 text-[19px] font-semibold text-[#1C0838]">{copy.catalogTitle(cityName)}</h2>
      <p className="mb-4 text-[12.5px] text-[#6B7280]">{copy.catalogNote}</p>
      {browser ?? (kartlar.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
          {kartlar.map(({ card: c, href }, idx) => (
            <ProductCard key={c.id} product={c} idx={Math.min(idx, 7)} href={href} />
          ))}
        </div>
      ) : (
        <p className="text-[14px] text-[#4B5563]">{copy.empty(cityName)}</p>
      ))}
      <div className="mt-6">
        <Link
          href={CARGO_COLLECTION_PATH}
          className="inline-flex items-center rounded-full bg-[#8B5CF6] px-6 py-3 text-[14px] font-bold text-white shadow-[0_14px_36px_rgba(139,92,246,.28)] transition hover:-translate-y-0.5"
        >
          {copy.cta}
        </Link>
      </div>
    </section>
  );
}

function FaqSection({ locale, faq }: { locale: GlobalLocale; faq: { q: string; a: string }[] | null }) {
  if (!faq?.length) return null;
  return (
    <section>
      <h2 style={S.h2}>{UI[locale].faq}</h2>
      {faq.map((f, i) => (
        <details key={i} style={{ marginBottom: 8, border: "1px solid #E9E5F5", borderRadius: 10, padding: "10px 14px" }}>
          <summary style={{ cursor: "pointer", fontSize: 14.5, fontWeight: 600 }}>{f.q}</summary>
          <p style={{ ...S.p, marginTop: 8 }}>{f.a}</p>
        </details>
      ))}
    </section>
  );
}

async function GlobalPageBody({ locale, row, catalog, source, sections, searchParams }: {
  locale: GlobalLocale; row: GlobalPage; catalog: LocaleCatalog; source?: CatalogDecision;
  /** Bölüm sırası/görünürlüğü (catalog yanıtı location_sections → parseLocationSections); yoksa varsayılan. */
  sections?: readonly Readonly<LocationSection>[];
  /** İstek sorgusu: ?category=<slug> + ?page=<N> (lokasyon kataloğu sayfalaması). Canonical sorgusuz yol kalır. */
  searchParams?: LocationSearchParams;
}) {
  // Lokasyon yüzeyi ise: üst hiyerarşi (crawlable kırıntı) + bir alt seviyenin
  // GERÇEK listesi. Veri TR location core ∩ o dilde yayında olan yüzeyler.
  const loc = parseLocationKey(row.page_key);
  let kirinti: React.ReactNode = null;
  let izgara: React.ReactNode = null;
  // ADDITIVE (24 Eyl 2026): görsel kırıntının BreadcrumbList JSON-LD karşılığı (aynı adlar, aynı yollar)
  // + kargo sunumunda kullanılacak yer adı (ilçe/mahalle sayfasında ilçe adı).
  let kirintiLd: string | null = null;
  let yerAdi: string | null = null;
  if (loc) {
    if (loc.kind === "city") {
      const ilceler = await fetchLocaleDistricts(locale, loc.city);
      // Kök sayfada da kırıntı: şehir (o dilin eksonimi) GEÇERLİ sayfa olarak — kendine link yok.
      kirinti = <LocationBreadcrumb locale={locale} city={loc.city} cityName={cityDisplayName(locale, loc.city)} />;
      kirintiLd = localeBreadcrumbJsonLd(locale, [loc.city], [cityDisplayName(locale, loc.city)], absoluteUrl, LABELS[locale].ana);
      izgara = (
        <LocationGrid locale={locale} baseHref={`/${locale}/${loc.city}`} items={ilceler} title={ilceBasligi(locale, loc.city)} />
      );
    } else if (loc.kind === "district") {
      const { cityName, districtName, items } = await fetchLocaleNeighborhoods(locale, loc.city, loc.district);
      kirinti = (
        <LocationBreadcrumb locale={locale} city={loc.city} cityName={cityName} district={loc.district} districtName={districtName} />
      );
      kirintiLd = localeBreadcrumbJsonLd(locale, [loc.city, loc.district], [cityName, districtName], absoluteUrl, LABELS[locale].ana);
      yerAdi = districtName;
      izgara = (
        <LocationGrid locale={locale} baseHref={`/${locale}/${loc.city}/${loc.district}`} items={items}
          title={mahalleBasligi(locale, districtName)} />
      );
    } else {
      const { cityName, districtName, neighborhoodName } = await fetchLocationNames(loc.city, loc.district, loc.neighborhood);
      kirinti = (
        <LocationBreadcrumb locale={locale} city={loc.city} cityName={cityName} district={loc.district}
          districtName={districtName} neighborhoodName={neighborhoodName} />
      );
      kirintiLd = localeBreadcrumbJsonLd(locale, [loc.city, loc.district, loc.neighborhood], [cityName, districtName, neighborhoodName], absoluteUrl, LABELS[locale].ana);
      yerAdi = districtName;
      // Mahalle sayfası: kardeş mahalleler ilçe sayfasında; burada kırıntı yeterli.
    }
  }
  // KARGO DESTİNASYONU (Antalya/Muğla/İzmir): İstanbul'a özgü hikâye bölümleri
  // (atölye, aynı gün teslimat kanıtı, "Istanbul florists") BASILMAZ — yanlış
  // şehir ve yanlış teslimat vaadi olur. Yerine kargo güven şeridi + yalnız bu
  // şehre GERÇEKTEN gidebilen ürünler (Delivery Motor teslimat profili).
  // ADDITIVE (24 Eyl 2026 — TESLİMAT GERÇEĞİ): kargo sunumu iki kaynaktan gelir:
  //  (1) şehir kuralı (Antalya/Muğla/İzmir) — bugünkü davranış aynen;
  //  (2) DELİVERY MOTOR: katalog yanıtında location.found && same_day=false ise (İstanbul'un
  //      kurye bandı dışındaki ilçeleri — Silivri, Şile, Çatalca …) sayfa aynı gün vaadi
  //      TAŞIMAZ; güven şeridi + ürün alanı kargo sözleriyle basılır. Motor sessizse (fallback)
  //      bugünkü davranış korunur.
  //  (3) 'mixed' (ilçe merkezi band kenarına yakın) ya da 'unknown' (çözülemedi) → NÖTR: vaat yok, katalog
  //      kapanmaz, "adres için ödemede doğrulanır" (reachCopy). Belirsizlik ne vaade ne kapatmaya dönüşür.
  const presentation = loc ? deliveryPresentation(source, isSameDayDestination(loc.city)) : "same_day";
  const cargoCity = loc && presentation === "cargo" ? loc.city : null;
  const cargo = cargoCity !== null;
  const neutral = presentation === "neutral";
  //  (4) 'far' (API 108: İstanbul 45 km+ fiyat eşikli uzak band) → UZAK sunum: vaat yok, katalog API'de ürün bazında
  //      süzülmüş gelir (eşik ve üzeri kuryeli + kargolanabilir); şerit + not eşiği API'den okur (reachCopy FAR); rozet yok.
  const far = presentation === "far";
  const farThreshold = far ? formatThresholdTl(locale, (source?.mode === "catalog" ? source.catalog.location?.min_product_price_minor : null) ?? null) : "";
  // Kargo/nötr/uzak başlığında şehir yerine ilçe adı (İstanbul'un band dışı ilçesinde "Istanbul" yanıltıcı olurdu).
  const cargoLabel = (cargoCity || neutral || far) && loc && loc.kind !== "city" && yerAdi ? yerAdi : undefined;
  const neutralPlace = cargoLabel ?? (loc ? cityDisplayName(locale, loc.city) : "");
  // TEK plan: ürün alanı (çip + ızgara), kategori kartları ve duygu hedefleri AYNI sonucu paylaşır.
  const plan: LocationCatalogPlan | null = source?.mode === "catalog" ? planLocationPage(source.catalog) : null;
  // Bu isteğin katalog görünümü: filtre (?category) + 24'lük sayfa (?page). SON sıralı listeden (Tümü = allOrder,
  // kategori = Admin sırası) dilim; linkler canonical sorgusuz yoldan. Geçersiz değer → 1. sayfa / Tümü (yönlendirme yok).
  const view: LocationCatalogView | null = plan
    ? resolveLocationCatalog(plan, searchParams, `/${locale}/${row.page_key}`, SHOP[locale].all)
    : null;
  const tiles = locationTiles(catalog, plan, cargo);
  // Bölüm sırası: Admin (storefront structure.locationSections, catalog yanıtında) — yoksa varsayılan.
  // Kargo destinasyonunda emotion + cta listeden düşer (aynı gün / İstanbul vaadi yok).
  // Nötr modda da kapanış CTA'sı ("bugün gönder") basılmaz — vaat çağrışımı; duygu/hikâye bölümleri (vaat taşımaz) kalır.
  const order = renderableLocationSections(sections ?? DEFAULT_LOCATION_SECTIONS, { cargo, neutral: neutral || far });
  // Sayfa ≥ 2: hafif devam sayfası — hero (kırıntı + H1, giriş YOK) + YALNIZ ürün alanı; SEO içeriği 1. sayfada.
  const continuation = isLocationContinuationPage(view, order);
  const t = mergedTexts(locale, null);

  const render = (id: LocationSectionId): React.ReactNode => {
    switch (id) {
      // Güven şeridi — kargo şehrinde kargo sözleri (1–3 iş günü; aynı gün/saat vaadi YOK).
      case "trust":
        return cargoCity ? <CargoTrustStrip locale={locale} city={cargoCity} label={cargoLabel} />
          : far ? <FarTrustStrip locale={locale} place={neutralPlace} threshold={farThreshold} />
          : neutral ? <NeutralTrustStrip locale={locale} place={neutralPlace} />
          : <TrustStrip locale={locale} />;
      // Ürün alanı: başlık → kategori çipleri → ürün ızgarası (bu lokasyona teslim edilebilir katalog).
      case "commerce":
        return cargoCity
          ? <CargoCatalogSection locale={locale} city={cargoCity} label={cargoLabel} catalog={catalog} plan={plan} view={view} />
          : <CatalogCommerceSection locale={locale} catalog={catalog} plan={plan} view={view} note={far ? FAR[locale].catalogNote(neutralPlace, farThreshold) : neutral ? REACH[locale].catalogNote(neutralPlace) : undefined} />;
      // Kategori keşif kartları — aynı plan (kargoda kargo-süzülmüş sayılar).
      case "categories":
        return tiles.length > 0 ? <CategoryCardsSection locale={locale} tiles={tiles} /> : null;
      // Duygu kartları yalnız aynı gün şehrinde; katalog modunda hedef = bu lokasyonda teslim edilebilen kategoriler.
      case "emotion":
        return cargoCity ? null : <EmotionSection locale={locale} catalog={catalog} categorySlugs={plan ? plan.tiles.map((x) => x.slug) : undefined} />;
      // GLOBAL TRUST: gerçek Google 5★ yorumları — canlı ana sayfayla AYNI kaynak ve AYNI seçim
      // modülü (lib/googleReviews); başlıklar o dilin V80 metinleri. Yorum yoksa bölüm yok.
      case "reviews":
        return <GlobalGoogleTrust labels={{ eyebrow: t["reviews.eyebrow"], title: t["reviews.title"], source: t["reviews.source"] }} />;
      // Hikâye: Uzaklık → insan kanıtı → kişisel yardım → teslimat kanıtı → mesaj. Kargo şehrinde
      // İstanbul'a özgü bölümler (atölye, aynı gün kanıtı) BASILMAZ; yalnız kart mesajı.
      case "story":
        return cargoCity ? (
          <MessageSection locale={locale} />
        ) : (
          <>
            <DistanceSection locale={locale} />
            <AtelierSection locale={locale} />
            <ConciergeSection locale={locale} />
            <DeliveryProofSection locale={locale} />
            <MessageSection locale={locale} />
          </>
        );
      // Lokasyon keşfi: şehir→ilçe, ilçe→mahalle (gerçek <a href>; yoksa blok yok).
      case "locations":
        return izgara;
      // SEO/editoryal içerik + SSS (DB'den, korunur).
      case "content":
        return row.content_html || row.faq?.length ? (
          <>
            {row.content_html ? (
              <section style={{ marginTop: 40, maxWidth: 720 }}>
                <div style={{ fontSize: 14, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: row.content_html }} />
              </section>
            ) : null}
            <div style={{ maxWidth: 720 }}><FaqSection locale={locale} faq={row.faq} /></div>
          </>
        ) : null;
      // Kapanış CTA'sı İstanbul hikâyesi taşır ("deliver in Istanbul") — kargo şehrinde basılmaz.
      case "cta":
        return cargoCity ? null : <FinalCta locale={locale} catalog={catalog} />;
      default:
        return null;
    }
  };
  // Her blok sırayı SSR HTML'de doğrulanabilir kılan görünmez kapta (display: contents → yerleşim değişmez).
  const block = (id: LocationSectionId) => {
    // Devam sayfasında (?page ≥ 2) yalnız ürün alanı; diğer bölümler hiç kurulmaz (yorum isteği vb. yok).
    if (continuation && id !== "commerce") return null;
    const node = render(id);
    return node ? <div key={id} data-location-section={id} className="contents">{node}</div> : null;
  };

  return (
    // Vitrin ürün fotoğraflarına yer açsın diye geniş kap; metin blokları okunur
    // genişlikte kalır (premium/butik his, marketplace kalabalığı değil).
    <main lang={locale} dir={DIR[locale]} className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* HERO — her zaman en üstte (sıra listesinde yok): kırıntı + H1 + kısa giriş. */}
      <div data-location-section="hero" className="contents">
        {/* Lokasyon kırıntısı — üst seviyeler gerçek <a href> (şehir sayfasında da) */}
        {kirinti}
        {kirintiLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: kirintiLd }} /> : null}
        {/* Hero: SEO metni (H1 + giriş) DB'den gelir — korunur. Devam sayfasında (?page ≥ 2) giriş basılmaz. */}
        <h1 style={S.h1}>{row.h1}</h1>
        {!continuation && row.intro_html ? <div style={{ ...S.p, maxWidth: 720 }} dangerouslySetInnerHTML={{ __html: row.intro_html }} /> : null}
      </div>
      {/* Bölümler Admin sırasında (varsayılan: güven → ürünler → kategoriler → duygu → yorumlar → hikâye → lokasyonlar → içerik → CTA). */}
      {order.map(block)}
    </main>
  );
}

// ---- Sayfa ---------------------------------------------------------------

export async function LocalePage({ locale, path, searchParams }: {
  locale: GlobalLocale; path: string[];
  /** Rota sorgusu (yalnız lokasyon sayfası kataloğu kullanır: ?category, ?page). Metadata/canonical kullanmaz. */
  searchParams?: LocationSearchParams;
}) {
  const parsed = parseLocalePath(locale, path);

  if (parsed.kind === "home") {
    // VERSION 80 — Global ana sayfa. SEO satırı (h1/intro/faq) view.content'e taşınır;
    // approved 'home' yoksa da vitrin varsayılan kopyayla çizilir (metadata NOINDEX kalır).
    const [view, contact] = await Promise.all([loadV80(locale), v80Contact()]);
    const header = {
      locale,
      nav: view.nav,
      t: view.texts,
      whatsapp: view.whatsapp,
      localeSlugByTr: Object.fromEntries(view.shop.products.map((p) => [p.trSlug, p.slug])),
    };
    return (
      <V80Shell locale={locale} header={header} footer={v80FooterFromView(view, contact)}>
        <V80Page view={view} />
      </V80Shell>
    );
  }

  if (parsed.kind === "page") {
    // Lokasyon yüzeyi ise Global katalog bu lokasyonun teslimat uygunluğuyla TEK istekte (paralel).
    const locKey = parseLocationKey(parsed.key);
    const [row, catalog, contact, catalogResp] = await Promise.all([
      fetchGlobalPage(locale, parsed.key),
      fetchLocaleCatalog(locale),
      v80Contact(),
      locKey
        ? fetchGlobalCatalog(locale, {
            city: locKey.city,
            district: locKey.kind === "city" ? undefined : locKey.district,
            neighborhood: locKey.kind === "neighborhood" ? locKey.neighborhood : undefined,
          })
        : Promise.resolve(null),
    ]);
    if (!row) notFound();
    const source = locKey ? catalogDecision(catalogResp, true) : undefined;
    // Bölüm sırası AYNI katalog yanıtından (ek istek YOK); eski API / alan yok → varsayılan sıra.
    const sections = parseLocationSections(catalogResp?.location_sections);
    // Bu sayfanın şehir kökü kesinlikle yayımlı (satır var) → uç yoksa bile footer'da basılır.
    const footer = await v80FooterFromCatalog(locale, catalog, contact, [parsed.key.split("/")[0]]);
    return (
      <V80Shell locale={locale} header={v80HeaderFromCatalog(locale, catalog)} footer={footer}>
        <GlobalPageBody locale={locale} row={row} catalog={catalog} source={source} sections={sections} searchParams={searchParams} />
      </V80Shell>
    );
  }

  if (parsed.kind === "category") {
    // Katalog, sayfa altındaki "ilgili kategoriler" iç bağlantıları için; yüzeyle
    // PARALEL çekilir (ek gecikme yok).
    const [surface, catalog, contact] = await Promise.all([
      fetchCategorySurface(locale, parsed.slug),
      fetchLocaleCatalog(locale),
      v80Contact(),
    ]);
    if (!surface) notFound();
    const seg = SEGMENTS[locale];
    // KATEGORİ ÜRÜNLERİ (API): GLOBAL KATALOG (o dilde canlı tüm aktif ürünler) ∩ Product Center'daki
    // GERÇEK bağ, Global Merkezi sırası (13 dilde ortak). Vitrin seçimi şart DEĞİL.
    //  • yeni API: kartlar satırdan, TAMAMI (ürün başına detay isteği yok)
    //  • eski API (kart alanı yok): bugünkü davranış AYNEN — ilk 24 üye + core detay
    let cards: { card: CardProductUi; href: string }[];
    let footer: Awaited<ReturnType<typeof v80FooterFromCatalog>>;
    if (surface.products.length && hasCardFields(surface.products)) {
      cards = surface.products.map((p) => ({ card: rowToCard(locale, p), href: `/${locale}/${seg.product}/${p.slug}` }));
      footer = await v80FooterFromCatalog(locale, catalog, contact);
    } else {
      // Kartlar TR mağaza ailesiyle birebir: core detay (mediaUrl'lü görsel,
      // gerçek fiyat/rozet/derivatives) + localized ad + locale PDP linki.
      const members = surface.products.slice(0, 24);
      const [details, footerModel] = await Promise.all([
        Promise.all(members.map((m) => fetchProductBySlug(m.tr_slug))),
        v80FooterFromCatalog(locale, catalog, contact),
      ]);
      footer = footerModel;
      cards = members
        .map((m, i) => ({ m, d: details[i] }))
        .filter((x): x is { m: (typeof members)[number]; d: PublicProductDetail } => !!x.d)
        .map(({ m, d }) => ({ card: detailToCard(locale, d, m.name), href: `/${locale}/${seg.product}/${m.slug}` }));
    }
    // İlgili kategoriler: AYNI dilde canlı ürünü olan diğer kategoriler (iç bağlantı; sayı API'de aynı üye sorgusundan).
    const ilgili = (catalog.categories ?? [])
      .filter((c) => c.slug !== surface.slug && (c.live_products ?? 0) > 0)
      .slice(0, 8);
    const ui = UI[locale];
    const shop = SHOP[locale];
    return (
      <V80Shell locale={locale} header={v80HeaderFromCatalog(locale, catalog)} footer={footer}>
      <main lang={locale} dir={DIR[locale]} className="mx-auto w-full max-w-6xl px-4 py-10">
        <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 10 }}>{surface.name}</h1>

        {/* 1) Kısa giriş — kategorinin kendi locale metni (meta_description; 2–3 satır,
            özgün ve dile uygun). İlk <p> kör kesilmez; uzun makale burada BASILMAZ. */}
        {surface.meta_description ? (
          <p className="mt-2 max-w-[720px] text-[15px] leading-[1.75] text-[#4B5563]">
            {surface.meta_description}
          </p>
        ) : null}

        {/* 2) Kategori keşfi — müşteri bulunduğu koleksiyonu ve komşularını
            ürünlerden ÖNCE görür (alışveriş akışı: anla → keşfet → satın al). */}
        {ilgili.length > 0 && (
          <section className="mt-9">
            <h2 className="mb-4 text-[19px] font-semibold text-[#1C0838]">{ui.categories}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {ilgili.map((c) => (
                <Link
                  key={c.slug}
                  href={`/${locale}/${seg.category}/${c.slug}`}
                  className="rounded-[16px] border border-[#EDE9FE] bg-white px-4 py-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-[#8B5CF6] hover:shadow-[0_10px_26px_rgba(124,58,237,0.10)]"
                >
                  <p className="truncate text-[14px] font-bold text-[#111827]">{c.name}</p>
                  <p className="mt-0.5 text-[11.5px] text-[#8B5CF6]">{c.live_products} {shop.unit}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 3) Ürün vitrini — keşiften hemen sonra satın alınabilir ürünler. */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {cards.map(({ card: c, href }, idx) => (
            <ProductCard key={c.id} product={c} idx={Math.min(idx, 7)} href={href} />
          ))}
        </div>

        {/* 4) Uzun SEO/hikâye içeriği — TAMAMI korunur; kategori keşfinin de ürün
            vitrininin de ALTINDA durur, alışveriş akışını kesmez.
            DB'deki açıklama HTML'dir (<p>, <h2>…); ürün açıklamasıyla aynı güvenli yol. */}
        {surface.description ? (
          <section className="mt-14 border-t border-[#EDE9FE] pt-10">
            <div
              className={`max-w-[720px] ${DESC_PROSE}`}
              dangerouslySetInnerHTML={{ __html: sanitizeProductHtml(surface.description) }}
            />
          </section>
        ) : null}

        {/* 5) Güven + 6) WhatsApp concierge — ana sayfayla AYNI bileşenler (13 dil). */}
        <TrustStrip locale={locale} />
        <ConciergeSection locale={locale} />
      </main>
      </V80Shell>
    );
  }

  if (parsed.kind === "product") {
    const surface = await fetchProductSurface(locale, parsed.slug);
    if (!surface) notFound();
    const data = await fetchProductBySlug(surface.tr_slug);
    if (!data) notFound();
    const { product } = data;
    const seg = SEGMENTS[locale];

    // TR PDP ile AYNI kompozisyon: ProductDetail (galeri/fiyat/varyant/CTA/sepet
    // — UI metinleri dict'ten, ad/açıklama Faz 2 overlay'inden locale'e göre) +
    // aynı kategoriden boyut önerileri + yalnız LOCALIZED yüzeyi olan related'lar.
    const primaryCat = data.categories.find((c) => c.is_primary) ?? data.categories[0];
    const relatedRows = primaryCat
      ? await fetchProducts({ category_id: primaryCat.category_id, page_size: 20, sort: "created_at_desc" })
      : [];
    const availableRelated = relatedRows.filter((r) => r.slug !== product.slug && r.cover_image_url);
    const price = product.sale_price_minor && Number(product.sale_price_minor) > 0 ? product.sale_price_minor : product.price_minor;
    const currentPriceMinor = Number(price);
    // ADDITIVE (24 Eyl 2026): Product JSON-LD — TR PDP ile TEK KAYNAK (lib/productSchema.ts).
    // Ad/açıklama o dilin yüzeyinden, URL locale PDP yolu; fiyat/stok/puan sayfadakiyle AYNI (TRY).
    const rating = product as { rating_avg?: number | string | null; rating_count?: number | string | null };
    const jsonLd = buildProductJsonLd({
      name: surface.name ?? product.name,
      slug: surface.slug,
      path: localeProductPath(locale, surface.slug),
      productId: product.id,
      priceMinor: Number(price),
      currency: product.currency,
      stockQuantity: product.stock_quantity,
      images: data.images,
      shortDescription: surface.short_description ?? product.short_description,
      longDescription: surface.long_description ?? product.long_description,
      sku: product.sku,
      ratingAvg: rating.rating_avg,
      ratingCount: rating.rating_count,
    }, { absolute: absoluteUrl, plainText: toPlainText });
    const [catalog, contact] = await Promise.all([fetchLocaleCatalog(locale), v80Contact()]);
    const localizedBySlug = new Map(catalog.products.map((cp) => [cp.tr_slug, cp]));
    // Zincir kuralı (§10): beden önerileri de locale ailesi İÇİNDE kalır —
    // yalnız o dilde yayımlanmış ürünler, locale PDP yolu ve locale adıyla.
    const sizeProducts: AutoSizeProduct[] = availableRelated
      .filter((r) => localizedBySlug.has(r.slug))
      .sort((a, b) => {
        const aP = Number(a.sale_price_minor && Number(a.sale_price_minor) > 0 ? a.sale_price_minor : a.price_minor);
        const bP = Number(b.sale_price_minor && Number(b.sale_price_minor) > 0 ? b.sale_price_minor : b.price_minor);
        return Math.abs(aP - currentPriceMinor) - Math.abs(bP - currentPriceMinor);
      })
      .slice(0, 3)
      .map((r) => {
        const hasSale = r.sale_price_minor != null && Number(r.sale_price_minor) > 0 && Number(r.sale_price_minor) < Number(r.price_minor);
        const lp = localizedBySlug.get(r.slug)!;
        return {
          id: r.id, slug: r.slug, name: lp.name,
          href: `/${locale}/${seg.product}/${lp.slug}`,
          price: Math.round((hasSale ? Number(r.sale_price_minor) : Number(r.price_minor)) / 100),
          image: r.cover_image_url ?? "",
        } as AutoSizeProduct;
      })
      .sort((a, b) => a.price - b.price);

    // Zincir kuralı (§10): related kartlar yalnız locale yüzeyi olan ürünlerden.
    const relatedCards = availableRelated
      .filter((r) => localizedBySlug.has(r.slug))
      .slice(0, 4)
      .map(async (r) => {
        const d = await fetchProductBySlug(r.slug);
        if (!d) return null;
        const lp = localizedBySlug.get(r.slug)!;
        return { card: detailToCard(locale, d, lp.name), href: `/${locale}/${seg.product}/${lp.slug}` };
      });
    const [relatedAll, footer] = await Promise.all([Promise.all(relatedCards), v80FooterFromCatalog(locale, catalog, contact)]);
    const related = relatedAll.filter((x): x is { card: CardProductUi; href: string } => !!x);

    return (
      <V80Shell locale={locale} header={v80HeaderFromCatalog(locale, catalog)} footer={footer}>
      <main lang={locale} dir={DIR[locale]} className="mx-auto w-full max-w-6xl px-4 py-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
        <ProductDetail
          data={data}
          sizeProducts={sizeProducts}
          /* WhatsApp hazır mesajı locale PDP adresini taşısın (TR'ye düşmesin). */
          canonicalPath={`/${locale}/${seg.product}/${parsed.slug}`}
          presentation={{
            name: surface.name,
            short_description: surface.short_description,
            long_description: surface.long_description,
          }}
        />
        {related.length > 0 && (
          <section className="mt-12">
            <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
              {related.map(({ card: c, href }, idx) => (
                <ProductCard key={c.id} product={c} idx={Math.min(idx, 7)} href={href} />
              ))}
            </div>
          </section>
        )}
      </main>
      </V80Shell>
    );
  }

  notFound();
}
