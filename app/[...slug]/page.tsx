import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock3, MapPin, ShieldCheck, Truck } from "lucide-react";
import { fetchProducts, fetchSeoPage, toCardProduct, type BodyBlock, type SeoPublicPage } from "@/lib/api";
import { getCategoryTree } from "@/lib/categories";
import { findCategoryNodeBySlug } from "@/lib/catalog";
import { CategoryLanding } from "@/components/category/CategoryLanding";

// Kategori tree'sinde var olan ama yayında SEO sayfası OLMAYAN kategoriler için
// sentetik SeoPublicPage üretir → 404 yerine landing render eder (hiçbir kategori
// boş/404 sayfa vermez). Alanlar kategori düğümünün gerçek verisinden gelir.
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

const DELIVERY_CITIES = new Set(["istanbul","ankara","izmir","bursa"]);
function prettySlug(value:string):string {
  const names:Record<string,string>={istanbul:"İstanbul",ankara:"Ankara",izmir:"İzmir",bursa:"Bursa",kadikoy:"Kadıköy",besiktas:"Beşiktaş",sisli:"Şişli",uskudar:"Üsküdar",cankaya:"Çankaya",kecioren:"Keçiören",konak:"Konak",karsiyaka:"Karşıyaka",nilufer:"Nilüfer"};
  const clean=value.replace(/-mah$/,"");
  return names[clean]||clean.split("-").map(w=>w.charAt(0).toLocaleUpperCase("tr-TR")+w.slice(1)).join(" ");
}
function deliveryParts(path:string):string[]|null {
  const parts=path.split("/").filter(Boolean);
  return parts.length>=2&&parts.length<=3&&DELIVERY_CITIES.has(parts[0])?parts:null;
}
function syntheticDeliveryPage(path:string,parts:string[]):SeoPublicPage {
  const city=prettySlug(parts[0]),district=prettySlug(parts[1]),neighborhood=parts[2]?prettySlug(parts[2]):"";
  const place=[neighborhood,district,city].filter(Boolean).join(", ");
  return {url_path:path,page_type:"delivery_info",lang:"tr",index_state:"index",canonical_url:path,title_tag:`${place} Çiçek Gönder — ÇiçekYolla`,meta_description:`${place} bölgesine taze çiçek ve premium aranjmanları güvenle gönderin. Uygun aynı gün teslimat seçeneklerini inceleyin.`,h1:`${neighborhood||district}'e Çiçek Gönder`,intro_html:`<p>${place} için özenle hazırlanan taze çiçekler ve premium aranjmanlar.</p>`,body_blocks:[],faq:[],schema_jsonld:{}};
}

/** Path için sayfayı çözer: önce yayında SEO sayfası; kategori path'i ise SEO sayfası
 *  yoksa canlı tree'den sentetik üretir. Kategori değilse/tree'de yoksa null. */
async function resolvePage(path: string): Promise<SeoPublicPage | null> {
  const seo = await fetchSeoPage(path);
  if (seo) return seo;
  if (path.startsWith("/kategori/")) {
    const slug = path.replace(/^\/kategori\//, "").replace(/\/+$/, "");
    const tree = await getCategoryTree();
    const node = tree ? findCategoryNodeBySlug(tree, slug) : null;
    if (node) return syntheticCategoryPage(path, node as unknown as Record<string, unknown>);
  }
  const location=deliveryParts(path);
  if(location) return syntheticDeliveryPage(path,location);
  return null;
}

async function DeliveryLanding({page,path}:{page:SeoPublicPage;path:string}) {
  const parts=deliveryParts(path)!;
  const city=prettySlug(parts[0]),district=prettySlug(parts[1]),neighborhood=parts[2]?prettySlug(parts[2]):"";
  const place=neighborhood||district;
  const products=(await fetchProducts({product_type:"flower",same_day_available:true,page_size:8})).map(toCardProduct).slice(0,4);
  return <main className="bg-[#fcfbfd] text-[#111827]">
    <section className="relative overflow-hidden bg-[#0b0319] px-6 py-20 lg:px-14 lg:py-28"><div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_30%,rgba(168,85,247,.34),transparent_35%),radial-gradient(circle_at_20%_85%,rgba(76,29,149,.3),transparent_40%)]"/><div className="relative mx-auto max-w-[1320px]"><div className="mb-7 inline-flex rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs font-bold uppercase tracking-[.2em] text-[#ddd6fe]">Aynı gün teslimat · {place}</div><h1 className="max-w-4xl font-serif text-5xl font-semibold leading-[.98] text-white md:text-7xl">{place}'e<br/><span className="text-[#c084fc]">Çiçek Gönderin</span></h1><p className="mt-7 max-w-2xl text-lg leading-8 text-[#c4b5d4]">{page.meta_description}</p><div className="mt-10 flex flex-wrap gap-4"><Link href="/kategori/cicekler" className="rounded-full bg-[#8b5cf6] px-7 py-4 font-bold text-white">Koleksiyonu Keşfet</Link><Link href="/iletisim" className="rounded-full border border-white/20 bg-white/10 px-7 py-4 font-bold text-white">Bize Ulaşın</Link></div></div></section>
    <section className="border-b border-[#ede9fe] bg-white"><div className="mx-auto grid max-w-[1320px] gap-px px-6 md:grid-cols-3 lg:px-14">{[{Icon:Clock3,title:"2–4 saat",text:"Ortalama teslimat süresi"},{Icon:Truck,title:"Hızlı Teslimat",text:`${district} ve çevresinde`},{Icon:ShieldCheck,title:"Taze Garantisi",text:"Florist ustalarımızdan"}].map(({Icon,title,text})=><div key={title} className="flex items-center gap-4 px-3 py-8"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#f5f3ff]"><Icon className="h-5 w-5 text-[#8b5cf6]"/></span><div><div className="font-bold">{title}</div><div className="mt-1 text-sm text-[#8a8295]">{text}</div></div></div>)}</div></section>
    {neighborhood&&<section className="bg-[#f7f5fc] px-6 py-14 lg:px-14"><div className="mx-auto max-w-[1320px]"><p className="text-xs font-bold uppercase tracking-[.24em] text-[#8b5cf6]">Teslimat noktası</p><div className="mt-5 inline-flex items-center gap-3 rounded-full border border-[#e9e3f6] bg-white px-6 py-4 font-semibold"><MapPin className="h-5 w-5 text-[#8b5cf6]"/>{neighborhood}, {district}, {city}</div></div></section>}
    <section className="mx-auto max-w-[1320px] px-6 py-20 lg:px-14"><p className="text-xs font-bold uppercase tracking-[.24em] text-[#8b5cf6]">{place} için</p><h2 className="mt-3 font-serif text-4xl font-semibold text-[#140b20]">Popüler Çiçekler</h2>{products.length?<div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{products.map(p=><Link key={p.id} href={`/urun/${p.slug}`} className="group overflow-hidden rounded-[24px] border border-[#ede9fe] bg-white shadow-[0_18px_50px_rgba(45,22,72,.06)]"><div className="aspect-square overflow-hidden bg-[#f7f5fa]">{p.image?<img src={p.image} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/>:<div className="grid h-full place-items-center text-[#8b5cf6]">ÇiçekYolla</div>}</div><div className="p-5"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8b5cf6]">Premium Aranjman</p><h3 className="mt-2 font-semibold text-[#171020]">{p.name}</h3><p className="mt-3 text-xl font-bold">₺{p.price.toLocaleString("tr-TR")}</p></div></Link>)}</div>:<div className="mt-10 rounded-[24px] border border-[#ede9fe] bg-white p-8"><p className="text-[#746c80]">Bu bölgeye gönderilebilen güncel ürünler çiçek koleksiyonunda listeleniyor.</p><Link href="/kategori/cicekler" className="mt-5 inline-flex rounded-full bg-[#8b5cf6] px-6 py-3 font-bold text-white">Çiçekleri İncele</Link></div>}</section>
    <section className="bg-gradient-to-r from-[#5b21b6] to-[#9333ea] px-6 py-16 text-white lg:px-14"><div className="mx-auto max-w-[1320px]"><p className="text-xs font-bold uppercase tracking-[.24em] text-[#ddd6fe]">{place}'e özel</p><h2 className="mt-3 font-serif text-4xl font-semibold">Bugün sipariş ver, bugün teslim edelim</h2><p className="mt-4 max-w-3xl text-[#e9d5ff]">Teslimat adresini sipariş adımında seçtiğinizde bölgenize uygun gün ve saat seçenekleri otomatik gösterilir.</p></div></section>
  </main>;
}

// Kanonik/mutlak URL için site kökü. Şimdilik Vercel domaini; sonra cicekyolla.com.
// Tek yerden değişir (env → build). canonical_url path döndüğü için burada tamamlanır.
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cicekyolla-public.vercel.app"
).replace(/\/$/, "");

// ISR: statik üret, 5 dk'da bir tazele. Bilinmeyen path'ler istek anında üretilir.
export const revalidate = 300;
export const dynamicParams = true;

// Next slug dizisini backend path'ine çevirir: ["istanbul","kadikoy"] -> "/istanbul/kadikoy"
function slugToPath(slug: string[] | undefined): string {
  if (!slug || slug.length === 0) return "/";
  return "/" + slug.map((s) => decodeURIComponent(s)).join("/");
}

// Mutlak URL üretir (path -> https://site/path)
function absoluteUrl(path: string): string {
  return SITE_URL + (path.startsWith("/") ? path : "/" + path);
}

type PageProps = { params: { slug?: string[] }; searchParams?: { [k: string]: string | string[] | undefined } };

// ---- SEO META (title / description / canonical / robots) ---- (DEĞİŞMEDİ)
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const path = slugToPath(params.slug);
  const page = await resolvePage(path);

  if (!page) {
    return { title: "Sayfa bulunamadı", robots: { index: false, follow: false } };
  }

  const indexable = page.index_state === "index";

  return {
    title: page.title_tag,
    description: page.meta_description,
    alternates: { canonical: absoluteUrl(page.canonical_url || path) },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title: page.title_tag,
      description: page.meta_description,
      url: absoluteUrl(page.canonical_url || path),
      locale: page.lang === "tr" ? "tr_TR" : page.lang,
      type: "website",
    },
  };
}

// ---- body_blocks -> HTML eşlemesi (additive; şimdilik paragraph) ---- (DEĞİŞMEDİ)
function renderBlock(block: BodyBlock, i: number) {
  switch (block.type) {
    case "paragraph":
      return <p key={i}>{block.text}</p>;
    case "heading":
      return <h2 key={i}>{block.text}</h2>;
    default:
      // Bilinmeyen tip: metni varsa güvenli şekilde paragraf olarak bas.
      return block.text ? <p key={i}>{block.text}</p> : null;
  }
}

// ---- FAQPage JSON-LD (faq doluysa) — M9.6 gelince otomatik devreye girer ---- (DEĞİŞMEDİ)
function faqJsonLd(page: SeoPublicPage): string | null {
  if (!page.faq || page.faq.length === 0) return null;
  const entities = page.faq
    .filter((f) => f.q && f.a)
    .map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    }));
  if (entities.length === 0) return null;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entities,
  });
}

// ---- Sayfa ----
export default async function Page({ params, searchParams }: PageProps) {
  const path = slugToPath(params.slug);
  const page = await resolvePage(path);

  if (!page) notFound();

  const faqLd = faqJsonLd(page);
  // schema_jsonld backend'den geliyorsa (boş {} değilse) onu da bas.
  const rawSchema =
    page.schema_jsonld && Object.keys(page.schema_jsonld).length > 0
      ? JSON.stringify(page.schema_jsonld)
      : null;

  // Paylaşımlı JSON-LD (backend schema + faq) — her iki şablonda TEK KEZ basılır. (DEĞİŞMEDİ)
  const jsonLd = (
    <>
      {rawSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: rawSchema }}
        />
      ) : null}
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: faqLd }}
        />
      ) : null}
    </>
  );

  // ── Kategori path'leri: premium SEO Category Landing (ADDITIVE; district akışı değişmez) ──
  if (path.startsWith("/kategori/")) {
    return (
      <>
        <CategoryLanding page={page} path={path} searchParams={searchParams} />
        {jsonLd}
      </>
    );
  }

  if (deliveryParts(path)) {
    return <><DeliveryLanding page={page} path={path}/>{jsonLd}</>;
  }

  // ── Varsayılan / District şablonu (AYNEN korunur) ──
  return (
    <main>
      <h1>{page.h1}</h1>

      {page.intro_html ? (
        <div dangerouslySetInnerHTML={{ __html: page.intro_html }} />
      ) : null}

      {page.body_blocks?.map((b, i) => renderBlock(b, i))}

      {page.faq && page.faq.length > 0 ? (
        <section>
          <h2>Sıkça Sorulan Sorular</h2>
          {page.faq.map((f, i) =>
            f.q && f.a ? (
              <div key={i}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ) : null
          )}
        </section>
      ) : null}

      {jsonLd}
    </main>
  );
}
