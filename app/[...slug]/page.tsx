import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Check, Clock3, MapPin, MessageCircle, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { fetchProducts, fetchSeoPage, toCardProduct, type BodyBlock, type SeoPublicPage } from "@/lib/api";
import { getCategoryTree } from "@/lib/categories";
import { findCategoryNodeBySlug } from "@/lib/catalog";
import { CategoryLanding } from "@/components/category/CategoryLanding";

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
    title_tag: str("seo_title") || `${name} — Cicekyolla`,
    meta_description: str("seo_description") || desc || `${name} koleksiyonu — aynı gün teslimat.`,
    h1: str("h1_title") || name,
    intro_html: desc ? `<p>${desc}</p>` : null,
    body_blocks: [],
    faq: Array.isArray(node.faq_json) ? (node.faq_json as SeoPublicPage["faq"]) : [],
    schema_jsonld: {},
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
  return parts.length >= 2 && parts.length <= 3 && DELIVERY_CITIES.has(parts[0]) ? parts : null;
}
function getDeliveryInfo(parts: string[]) {
  const city = DELIVERY_DATA[parts[0]];
  const district = city?.districts[parts[1]];
  return { city, district };
}
function syntheticDeliveryPage(path: string, parts: string[]): SeoPublicPage {
  const { city, district } = getDeliveryInfo(parts);
  const cityName = city?.label || prettySlug(parts[0]);
  const districtName = district?.label || prettySlug(parts[1]);
  const neighborhood = parts[2] ? prettySlug(parts[2]) : "";
  const place = [neighborhood, districtName, cityName].filter(Boolean).join(", ");
  const titlePlace = neighborhood || districtName;
  return {
    url_path: path,
    page_type: "delivery_info",
    lang: "tr",
    index_state: "index",
    canonical_url: path,
    title_tag: `${place} Çiçek Gönder — ÇiçekYolla`,
    meta_description: district?.description || `${place} bölgesine taze çiçek ve premium aranjmanları güvenle gönderin. Uygun aynı gün teslimat seçeneklerini inceleyin.`,
    h1: `${titlePlace}'e Çiçek Gönder`,
    intro_html: `<p>${district?.description || `${place} için özenle hazırlanan taze çiçekler ve premium aranjmanlar.`}</p>`,
    body_blocks: [],
    faq: [],
    schema_jsonld: {},
  };
}

async function resolvePage(path: string): Promise<SeoPublicPage | null> {
  const seo = await fetchSeoPage(path);
  if (seo) return seo;
  if (path.startsWith("/kategori/")) {
    const slug = path.replace(/^\/kategori\//, "").replace(/\/+$/, "");
    const tree = await getCategoryTree();
    const node = tree ? findCategoryNodeBySlug(tree, slug) : null;
    if (node) return syntheticCategoryPage(path, node as unknown as Record<string, unknown>);
    // Render/API kısa süreli erişilemezse geçerli kategori URL'lerini 404 olarak
    // önbelleğe alma. Ağaç geri geldiğinde admin verisi yeniden tek kaynak olur.
    if (!tree && slug) return syntheticCategoryPage(path, { name: prettySlug(slug) });
  }
  const location = deliveryParts(path);
  if (location) return syntheticDeliveryPage(path, location);
  return null;
}

async function DeliveryLanding({ page, path }: { page: SeoPublicPage; path: string }) {
  const parts = deliveryParts(path)!;
  const { city, district } = getDeliveryInfo(parts);
  const cityName = city?.label || prettySlug(parts[0]);
  const districtName = district?.label || prettySlug(parts[1]);
  const neighborhood = parts[2] ? prettySlug(parts[2]) : "";
  const place = neighborhood || districtName;
  const deliveryTime = district?.time || "2–4 saat";
  const cutoff = district?.cutoff || "14:00";
  const neighborhoods = district?.neighborhoods || [];
  const products = (await fetchProducts({ product_type: "flower", same_day_available: true, page_size: 8 })).map(toCardProduct).slice(0, 4);

  return <main className="bg-[#fcfbfd] text-[#111827]">
    <section className="bg-white px-6 pb-16 pt-20 lg:px-14 lg:pb-24 lg:pt-28">
      <div className="mx-auto max-w-[1320px]">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#f4efff] px-5 py-2 text-xs font-bold uppercase tracking-[.18em] text-[#7c3aed]"><Sparkles className="h-4 w-4" /> Aynı gün teslimat — {place}</div>
        <h1 className="mt-10 max-w-4xl font-serif text-6xl font-semibold leading-[.98] text-[#121827] md:text-7xl lg:text-8xl">{place}'e<br /><span className="text-[#8b5cf6]">Çiçek Gönderin</span></h1>
        <p className="mt-8 max-w-2xl text-xl leading-9 text-[#667085]">{page.meta_description}</p>
        <div className="mt-12 grid max-w-3xl gap-5 md:grid-cols-2">
          <div className="flex items-center gap-5 rounded-[22px] border border-[#ebe7f2] bg-white p-6 shadow-[0_14px_45px_rgba(45,22,72,.05)]"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#f5f0ff]"><Clock3 className="h-5 w-5 text-[#8b5cf6]" /></span><div><div className="font-bold text-[#111827]">{deliveryTime}</div><div className="mt-1 text-sm text-[#9b94a8]">Ortalama teslimat süresi</div></div></div>
          <div className="flex items-center gap-5 rounded-[22px] border border-[#ebe7f2] bg-white p-6 shadow-[0_14px_45px_rgba(45,22,72,.05)]"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#f5f0ff]"><Truck className="h-5 w-5 text-[#8b5cf6]" /></span><div><div className="font-bold text-[#111827]">Ücretsiz Kargo</div><div className="mt-1 text-sm text-[#9b94a8]">Tüm {districtName} siparişlerinde</div></div></div>
        </div>
        <div className="mt-12 flex flex-wrap gap-4"><Link href="/kategori/cicekler" className="rounded-full bg-[#8b5cf6] px-9 py-4 font-bold text-white shadow-[0_18px_45px_rgba(139,92,246,.28)]">Koleksiyonu Keşfet</Link><Link href="https://wa.me/905074413474" className="inline-flex items-center gap-3 rounded-full border border-[#e8e1f0] bg-white px-9 py-4 font-bold text-[#141020]"><MessageCircle className="h-5 w-5" /> WhatsApp'tan Sipariş</Link></div>
      </div>
    </section>

    {neighborhoods.length > 0 ? <section className="border-y border-[#eee9f6] bg-[#f7f5fc] px-6 py-16 lg:px-14"><div className="mx-auto max-w-[1320px]"><div className="mb-10 flex items-center gap-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#8b5cf6]"><MapPin className="h-5 w-5" /></span><p className="text-xs font-bold uppercase tracking-[.32em] text-[#8b5cf6]">Teslimat yapılan mahalleler</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{neighborhoods.map((item) => <Link key={item} href={`/${parts[0]}/${parts[1]}/${slugifyTR(item)}-mah`} className="flex items-center gap-4 rounded-[20px] border border-[#ece7f4] bg-white px-5 py-5 text-lg font-medium text-[#1f2937] shadow-[0_12px_34px_rgba(45,22,72,.04)]"><span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-[#f5f0ff]"><Check className="h-4 w-4 text-[#8b5cf6]" /></span>{item}</Link>)}</div></div></section> : null}

    {neighborhood ? <section className="bg-white px-6 py-12 lg:px-14"><div className="mx-auto max-w-[1320px]"><div className="inline-flex items-center gap-3 rounded-full border border-[#e9e3f6] bg-[#fbfafd] px-6 py-4 font-semibold"><MapPin className="h-5 w-5 text-[#8b5cf6]" />{neighborhood}, {districtName}, {cityName}</div></div></section> : null}

    <section className="mx-auto max-w-[1320px] px-6 py-20 lg:px-14"><p className="text-xs font-bold uppercase tracking-[.24em] text-[#8b5cf6]">{place} için</p><h2 className="mt-3 font-serif text-5xl font-semibold text-[#140b20]">Popüler Aranjmanlar</h2>{products.length ? <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{products.map((p) => <Link key={p.id} href={`/urun/${p.slug}`} className="group overflow-hidden rounded-[18px] bg-white"><div className="aspect-square overflow-hidden rounded-[18px] bg-[#f7f5fa]">{p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-[#8b5cf6]">ÇiçekYolla</div>}</div><div className="pt-5"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8b5cf6]">Premium Aranjman</p><h3 className="mt-3 text-lg font-semibold text-[#171020]">{p.name}</h3><p className="mt-3 text-xl font-bold">₺{p.price.toLocaleString("tr-TR")}</p></div></Link>)}</div> : <div className="mt-10 rounded-[24px] border border-[#ede9fe] bg-white p-8"><p className="text-[#746c80]">Bu bölgeye gönderilebilen güncel ürünler çiçek koleksiyonunda listeleniyor.</p><Link href="/kategori/cicekler" className="mt-5 inline-flex rounded-full bg-[#8b5cf6] px-6 py-3 font-bold text-white">Çiçekleri İncele</Link></div>}</section>

    <section className="bg-gradient-to-r from-[#5b21b6] to-[#9333ea] px-6 py-20 text-white lg:px-14"><div className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[1fr_1.15fr]"><div><p className="text-xs font-bold uppercase tracking-[.3em] text-[#ddd6fe]">{place}'e özel</p><h2 className="mt-6 font-serif text-5xl font-semibold leading-tight">Bugün Sipariş Ver,<br />Bugün Teslim Edelim</h2><p className="mt-8 text-xl leading-9 text-[#e9d5ff]">{districtName} bölgesine çiçek göndermek hiç bu kadar kolay olmamıştı. {cutoff}'a kadar verilen siparişler uygun teslimat akışında aynı gün planlanır.</p><div className="mt-10 flex flex-wrap gap-4"><Link href="/kategori/cicekler" className="rounded-full bg-white px-8 py-4 font-bold text-[#7c3aed]">Çiçekleri İncele</Link><Link href="https://wa.me/905074413474" className="inline-flex items-center gap-3 rounded-full border border-white/25 px-8 py-4 font-bold text-white"><MessageCircle className="h-5 w-5" /> WhatsApp ile Sipariş</Link></div></div><div className="border-l border-white/15 pl-0 text-lg leading-9 text-[#e9d5ff] lg:pl-10"><p>{cityName} ve çevresine çiçek göndermek için güvenilir adresiniz ÇiçekYolla.com.tr. Taptaze çiçeklerimiz, özenle hazırlanmış buketlerimiz ve profesyonel ekibimizle sevdiklerinize özel anlar yaratıyoruz.</p><p className="mt-7">Doğum günü, sevgililer günü, anneler günü veya herhangi bir özel gün için zarif seçeneklerimiz mevcut. WhatsApp üzerinden de destek sağlıyoruz.</p></div></div></section>
  </main>;
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://cicekyolla-public.vercel.app").replace(/\/$/, "");
export const revalidate = 300;
export const dynamicParams = true;

function slugToPath(slug: string[] | undefined): string {
  if (!slug || slug.length === 0) return "/";
  return "/" + slug.map((s) => decodeURIComponent(s)).join("/");
}
function absoluteUrl(path: string): string {
  return SITE_URL + (path.startsWith("/") ? path : "/" + path);
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
  const indexable = page.index_state === "index";
  return { title: page.title_tag, description: page.meta_description, alternates: { canonical: absoluteUrl(page.canonical_url || path) }, robots: indexable ? { index: true, follow: true } : { index: false, follow: false }, openGraph: { title: page.title_tag, description: page.meta_description, url: absoluteUrl(page.canonical_url || path), locale: page.lang === "tr" ? "tr_TR" : page.lang, type: "website" } };
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
  return <main><h1>{page.h1}</h1>{page.intro_html ? <div dangerouslySetInnerHTML={{ __html: page.intro_html }} /> : null}{page.body_blocks?.map((b, i) => renderBlock(b, i))}{page.faq && page.faq.length > 0 ? <section><h2>Sıkça Sorulan Sorular</h2>{page.faq.map((f, i) => f.q && f.a ? <div key={i}><h3>{f.q}</h3><p>{f.a}</p></div> : null)}</section> : null}{jsonLd}</main>;
}
