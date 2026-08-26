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
import { fetchProductBySlug, fetchProducts, formatMinorTRY, type PublicProductDetail } from "@/lib/api";
import { ProductCard, type Product as CardProductUi } from "@/components/home/ProductCard";
import { ProductImage } from "@/components/product/ProductImage";
import { ProductDetail, type AutoSizeProduct } from "@/components/product/ProductDetail";
import { sanitizeProductHtml, DESC_PROSE } from "@/lib/richText";
import {
  parseLocationKey, fetchLocaleDistricts, fetchLocaleNeighborhoods, fetchLocationNames,
} from "./locationTree";
import { LocationBreadcrumb, LocationGrid, ilceBasligi, mahalleBasligi } from "./locationNav";
import {
  TrustStrip, EmotionSection, DistanceSection, AtelierSection,
  ConciergeSection, DeliveryProofSection, MessageSection, FinalCta,
} from "./sections";
import {
  type GlobalLocale,
  parseLocalePath,
  localeProductPath,
  isGlobalLocale,
  SEGMENTS,
  DIR,
} from "./config";
import {
  fetchProductSurface,
  fetchProductLocaleCluster,
  fetchGlobalPage,
  fetchCategorySurface,
  fetchLocaleCatalog,
  type GlobalPage,
  type LocaleCatalog,
} from "./api";

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

const SHOP: Record<GlobalLocale, { unit: string; shopAll: string; from: string }> = {
  de: { unit: "Produkte", shopAll: "Alle ansehen →", from: "Ausgewählt für Istanbul" },
  en: { unit: "products", shopAll: "View all →", from: "Selected for Istanbul" },
  fr: { unit: "produits", shopAll: "Tout voir →", from: "Sélection pour Istanbul" },
  nl: { unit: "producten", shopAll: "Alles bekijken →", from: "Geselecteerd voor Istanbul" },
  it: { unit: "prodotti", shopAll: "Vedi tutto →", from: "Selezionati per Istanbul" },
  es: { unit: "productos", shopAll: "Ver todo →", from: "Selección para Estambul" },
  pt: { unit: "produtos", shopAll: "Ver tudo →", from: "Seleção para Istambul" },
  az: { unit: "məhsul", shopAll: "Hamısına bax →", from: "İstanbul üçün seçilmiş" },
  ru: { unit: "товаров", shopAll: "Смотреть все →", from: "Выбрано для Стамбула" },
  ar: { unit: "منتجات", shopAll: "عرض الكل ←", from: "مختارة لإسطنبول" },
  zh: { unit: "件商品", shopAll: "查看全部 →", from: "为伊斯坦布尔精选" },
  ja: { unit: "点", shopAll: "すべて見る →", from: "イスタンブールへの厳選" },
  ko: { unit: "개 상품", shopAll: "전체 보기 →", from: "이스탄불을 위한 셀렉션" },
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
  return Object.keys(languages).length > 1 ? languages : null;
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
      if (Object.keys(languages).length > 1) meta.alternates = { canonical: self, languages };
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
      if (Object.keys(languages).length > 1) meta.alternates = { canonical: self, languages };
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
 * Global ana sayfa vitrini — TR mağaza ailesiyle AYNI ProductCard'ı kullanır.
 * Kaynak tek gerçek: localeCatalog (üyelik ∧ locale approved+slug ∧ product active),
 * yani Global Merkezi'nin "N canlı" dediği sayı ile birebir aynı küme.
 * 0 canlı ürünlü kategori vitrine çıkmaz (müşteriye boş raf gösterilmez).
 */
async function CatalogSections({ locale, catalog }: { locale: GlobalLocale; catalog: LocaleCatalog }) {
  const seg = SEGMENTS[locale];
  const ui = UI[locale];
  const shop = SHOP[locale];

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
  const kapakSlug = new Map<string, string>(); // kategori slug → kapak ürün slug
  for (const c of dolu) { const ilk = (c.product_slugs ?? [])[0]; if (ilk) kapakSlug.set(c.slug, ilk); }

  const gerekli = [...new Set([...one, ...raflar.flatMap((r) => r.slugs), ...kapakSlug.values()])];
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

  return (
    <>
      {/* Kategori vitrini — gerçek ürün fotoğrafı + o dildeki canlı ürün sayısı */}
      {dolu.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-[19px] font-semibold text-[#1C0838]">{ui.categories}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {dolu.map((c) => {
              const kapak = kapakSlug.get(c.slug);
              const d = kapak ? byLocaleSlug.get(kapak) : undefined;
              const img = d ? (d.images.find((i) => i.role === "cover") ?? d.images[0])?.url : undefined;
              return (
                <Link
                  key={c.slug}
                  href={`/${locale}/${seg.category}/${c.slug}`}
                  className="group overflow-hidden rounded-[18px] border border-[#EDE9FE] bg-white transition duration-200 hover:-translate-y-0.5 hover:border-[#8B5CF6] hover:shadow-[0_10px_26px_rgba(124,58,237,0.10)]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#FAF9FE]">
                    {img ? <ProductImage src={img} alt={c.name} padding="10px" sizes="(max-width:640px) 50vw, 220px" /> : null}
                  </div>
                  <div className="px-3.5 py-3">
                    <p className="truncate text-[14px] font-bold text-[#111827]">{c.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-[#8B5CF6]">{c.live_products} {shop.unit}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Öne çıkan ürünler — TR mağazasıyla aynı ProductCard */}
      {oneKartlar.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-1 text-[19px] font-semibold text-[#1C0838]">{ui.popular}</h2>
          <p className="mb-4 text-[12.5px] text-[#6B7280]">{shop.from}</p>
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
            {oneKartlar.map(({ card: c, href }, idx) => (
              <ProductCard key={c.id} product={c} idx={idx} href={href} />
            ))}
          </div>
        </section>
      )}

      {/* Kategori rafları — yalnız o dilde yeterli canlı ürünü olan kategoriler */}
      {raflar.map((r) => {
        const kartlar = r.slugs.map(kart).filter(Boolean) as { card: CardProductUi; href: string }[];
        if (kartlar.length < 2) return null;
        return (
          <section key={r.cat.slug} className="mt-12">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-[19px] font-semibold text-[#1C0838]">{r.cat.name}</h2>
              <Link href={`/${locale}/${seg.category}/${r.cat.slug}`} className="shrink-0 text-[12.5px] font-semibold text-[#7C3AED] hover:underline">
                {shop.shopAll}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
              {kartlar.map(({ card: c, href }, idx) => (
                <ProductCard key={c.id} product={c} idx={idx} href={href} />
              ))}
            </div>
          </section>
        );
      })}
    </>
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

async function GlobalPageBody({ locale, row, catalog }: { locale: GlobalLocale; row: GlobalPage; catalog: LocaleCatalog }) {
  // Lokasyon yüzeyi ise: üst hiyerarşi (crawlable kırıntı) + bir alt seviyenin
  // GERÇEK listesi. Veri TR location core ∩ o dilde yayında olan yüzeyler.
  const loc = parseLocationKey(row.page_key);
  let kirinti: React.ReactNode = null;
  let izgara: React.ReactNode = null;
  if (loc) {
    if (loc.kind === "city") {
      const ilceler = await fetchLocaleDistricts(locale, loc.city);
      const ad = await fetchLocationNames(loc.city);
      kirinti = null; // kök: kendisi zaten hub
      izgara = (
        <LocationGrid locale={locale} baseHref={`/${locale}/${loc.city}`} items={ilceler} title={ilceBasligi(locale)} />
      );
      void ad;
    } else if (loc.kind === "district") {
      const { cityName, districtName, items } = await fetchLocaleNeighborhoods(locale, loc.city, loc.district);
      kirinti = (
        <LocationBreadcrumb locale={locale} city={loc.city} cityName={cityName} district={loc.district} districtName={districtName} />
      );
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
      // Mahalle sayfası: kardeş mahalleler ilçe sayfasında; burada kırıntı yeterli.
    }
  }
  return (
    // Vitrin ürün fotoğraflarına yer açsın diye geniş kap; metin blokları okunur
    // genişlikte kalır (premium/butik his, marketplace kalabalığı değil).
    <main lang={locale} dir={DIR[locale]} className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Lokasyon kırıntısı — üst seviyeler gerçek <a href> */}
      {kirinti}
      {/* Hero: SEO metni (H1 + giriş) DB'den gelir — korunur. */}
      <h1 style={S.h1}>{row.h1}</h1>
      {row.intro_html ? <div style={{ ...S.p, maxWidth: 720 }} dangerouslySetInnerHTML={{ __html: row.intro_html }} /> : null}
      {/* Lokasyon keşfi: İstanbul→ilçe, ilçe→mahalle (gerçek <a href>) */}
      {izgara}
      <TrustStrip locale={locale} />
      {/* Duygu → keşif → arzu (kategori + ürün vitrini gerçek motordan) */}
      <EmotionSection locale={locale} catalog={catalog} />
      <CatalogSections locale={locale} catalog={catalog} />
      {/* Uzaklık → insan kanıtı → kişisel yardım → teslimat kanıtı → mesaj */}
      <DistanceSection locale={locale} />
      <AtelierSection locale={locale} />
      <ConciergeSection locale={locale} />
      <DeliveryProofSection locale={locale} />
      <MessageSection locale={locale} />
      {row.content_html ? (
        <section style={{ marginTop: 40, maxWidth: 720 }}>
          <div style={{ fontSize: 14, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: row.content_html }} />
        </section>
      ) : null}
      <div style={{ maxWidth: 720 }}><FaqSection locale={locale} faq={row.faq} /></div>
      <FinalCta locale={locale} catalog={catalog} />
    </main>
  );
}

// ---- Sayfa ---------------------------------------------------------------

export async function LocalePage({ locale, path }: { locale: GlobalLocale; path: string[] }) {
  const parsed = parseLocalePath(locale, path);

  if (parsed.kind === "home") {
    const [row, catalog] = await Promise.all([fetchGlobalPage(locale, "home"), fetchLocaleCatalog(locale)]);
    if (row) return <GlobalPageBody locale={locale} row={row} catalog={catalog} />;
    const copy = HOME_FALLBACK[locale];
    return (
      <main lang={locale} dir={DIR[locale]} className="mx-auto w-full max-w-6xl px-4 py-10">
        <h1 style={S.h1}>{copy.h1}</h1>
        <p style={S.p}>{copy.p}</p>
        <CatalogSections locale={locale} catalog={catalog} />
      </main>
    );
  }

  if (parsed.kind === "page") {
    const [row, catalog] = await Promise.all([fetchGlobalPage(locale, parsed.key), fetchLocaleCatalog(locale)]);
    if (!row) notFound();
    return <GlobalPageBody locale={locale} row={row} catalog={catalog} />;
  }

  if (parsed.kind === "category") {
    // Katalog, sayfa altındaki "ilgili kategoriler" iç bağlantıları için; yüzeyle
    // PARALEL çekilir (ek gecikme yok).
    const [surface, catalog] = await Promise.all([
      fetchCategorySurface(locale, parsed.slug),
      fetchLocaleCatalog(locale),
    ]);
    if (!surface) notFound();
    const seg = SEGMENTS[locale];
    // Kartlar TR mağaza ailesiyle birebir: core detay (mediaUrl'lü görsel,
    // gerçek fiyat/rozet/derivatives) + localized ad + locale PDP linki.
    const members = surface.products.slice(0, 24);
    const details = await Promise.all(members.map((m) => fetchProductBySlug(m.tr_slug)));
    const cards = members
      .map((m, i) => ({ m, d: details[i] }))
      .filter((x): x is { m: (typeof members)[number]; d: PublicProductDetail } => !!x.d)
      .map(({ m, d }) => ({ card: detailToCard(locale, d, m.name), href: `/${locale}/${seg.product}/${m.slug}` }));
    // İlgili kategoriler: AYNI dilde canlı ürünü olan diğer kategoriler (iç bağlantı).
    const ilgili = (catalog.categories ?? [])
      .filter((c) => c.slug !== surface.slug && (c.live_products ?? 0) > 0)
      .slice(0, 8);
    const ui = UI[locale];
    const shop = SHOP[locale];
    return (
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
            <ProductCard key={c.id} product={c} idx={idx} href={href} />
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
    const catalog = await fetchLocaleCatalog(locale);
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
    const related = (await Promise.all(relatedCards)).filter((x): x is { card: CardProductUi; href: string } => !!x);

    return (
      <main lang={locale} dir={DIR[locale]} className="mx-auto w-full max-w-6xl px-4 py-8">
        <ProductDetail
          data={data}
          sizeProducts={sizeProducts}
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
                <ProductCard key={c.id} product={c} idx={idx} href={href} />
              ))}
            </div>
          </section>
        )}
      </main>
    );
  }

  notFound();
}
