// components/place/PlacePage.tsx — YER SAYFALARI (hastane, otel, fuar, cami, AVM) ortak sayfası (27 Eki 2026, ADDITIVE).
// Dekorasyon yöntemi: içerik paneldeki SEO kaydından (fetchSeoPage) — başlık, açıklama, H1, giriş, bloklar, SSS,
// index durumu ve ürün kategorisi panelden. Kayıt yayında değilse 404 (taslak görünmez).
// Kurallar: kapatma "noindex, follow" (indexRobots); fiyat rakamı ve kargo sözü bu şablonda YOK.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, MessageCircle, Truck } from "lucide-react";
import { fetchListingPage, fetchSeoPage, toCardProduct, type SeoPublicPage } from "@/lib/api";
import { ShowcaseGrid } from "@/components/location/ShowcaseGrid";
import { absoluteUrl, indexRobots } from "@/lib/site-config";
import { escapeJsonLdText } from "@/lib/jsonLdSafe";
import { getPlaceHub, getPlaceInfo, placeKindDef, placePath, textBlocks, validCategoryId, type PlaceKind } from "@/lib/placePages";

const PRODUCT_COUNT = 24;

function slugOf(params: { slug?: string[] }): string | null | false {
  const s = params.slug ?? [];
  if (s.length === 0) return null;
  if (s.length === 1 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s[0])) return s[0];
  return false; // geçersiz → 404
}

async function loadPage(kind: PlaceKind, params: { slug?: string[] }): Promise<{ page: SeoPublicPage; path: string; slug: string | null } | null> {
  const slug = slugOf(params);
  if (slug === false) return null;
  const path = placePath(kind, slug);
  const page = await fetchSeoPage(path);
  return page ? { page, path, slug } : null;
}

export async function placePageMetadata(kind: PlaceKind, params: { slug?: string[] }): Promise<Metadata> {
  const loaded = await loadPage(kind, params);
  if (!loaded) return { title: "Sayfa bulunamadı", robots: { index: false, follow: false } };
  const { page, path } = loaded;
  const title = page.title_tag || page.h1 || placeKindDef(kind).label;
  const description = page.meta_description || undefined;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    robots: indexRobots(page.index_state),
    openGraph: { title, description, url: absoluteUrl(path), locale: "tr_TR", type: "website" },
  };
}

export async function PlacePage({ kind, params }: { kind: PlaceKind; params: { slug?: string[] } }) {
  const loaded = await loadPage(kind, params);
  if (!loaded) notFound();
  const { page, path, slug } = loaded;
  const def = placeKindDef(kind);
  const info = slug ? getPlaceInfo(page.body_blocks) : null;
  const hub = slug ? null : getPlaceHub(page.body_blocks);
  const categoryId = validCategoryId(info?.category_id ?? hub?.category_id);
  const listing = categoryId
    ? await fetchListingPage({ source: { kind: "category", category_id: categoryId }, page: 1, per_page: PRODUCT_COUNT, paginate: false }).catch(() => null)
    : null;
  const products = listing?.items.map(toCardProduct) ?? [];
  const h1 = page.h1 || info?.name || def.label;
  const texts = textBlocks(page.body_blocks);
  const faq = (page.faq ?? []).filter((f) => f.q && f.a);

  const crumbs = [
    { name: "Ana Sayfa", path: "/" },
    { name: def.label, path: def.hub },
    ...(slug ? [{ name: info?.name || h1, path }] : []),
  ];
  const ld: unknown[] = [{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
  }];
  if (faq.length) {
    ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  }

  return (
    <main className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: escapeJsonLdText(JSON.stringify(ld)) }} />
      <section className="bg-gradient-to-b from-[#f7f5fc] to-white px-6 pb-14 pt-10 lg:px-14">
        <div className="mx-auto max-w-[1320px]">
          <nav aria-label="Konum" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-[#667085]">
            {crumbs.map((c, i) => (
              <span key={c.path} className="flex items-center gap-2">
                {i > 0 ? <span aria-hidden>›</span> : null}
                {i < crumbs.length - 1 ? <Link href={c.path} className="hover:text-[#6d28d9]">{c.name}</Link> : <span className="text-[#140b20]">{c.name}</span>}
              </span>
            ))}
          </nav>
          <h1 className="font-serif text-4xl font-semibold leading-tight text-[#140b20] md:text-5xl">{h1}</h1>
          {info && (info.district || info.address) ? (
            <p className="mt-4 flex items-start gap-2 text-sm text-[#667085]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8b5cf6]" />
              <span>{[info.address, info.district].filter(Boolean).join(" · ")}</span>
            </p>
          ) : null}
          {page.intro_html ? (
            <div className="prose prose-sm mt-6 max-w-3xl text-[#4b5563]" dangerouslySetInnerHTML={{ __html: page.intro_html }} />
          ) : null}
          {info?.note ? (
            <p className="mt-6 flex max-w-3xl items-start gap-3 rounded-[18px] border border-[#ebe7f2] bg-white p-5 text-sm leading-6 text-[#4b5563]">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-[#8b5cf6]" />
              <span>{info.note}</span>
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/kategori/cicekler" className="rounded-full bg-[#6d28d9] px-7 py-3.5 text-sm font-bold text-white">Çiçekleri İncele</Link>
            <Link href="https://wa.me/905458813450" className="inline-flex items-center gap-2 rounded-full border border-[#c4b5fd] px-7 py-3.5 text-sm font-bold text-[#6d28d9]">
              <MessageCircle className="h-4 w-4" /> WhatsApp ile Sipariş
            </Link>
          </div>
        </div>
      </section>

      {hub && hub.places && hub.places.length > 0 ? (
        <section className="px-6 py-14 lg:px-14">
          <div className="mx-auto max-w-[1320px]">
            <h2 className="font-serif text-3xl font-semibold text-[#140b20]">{def.label}</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hub.places.map((p) => (
                <li key={p.slug}>
                  <Link href={placePath(kind, p.slug)} className="block rounded-[18px] border border-[#ebe7f2] bg-white p-5 transition hover:border-[#c4b5fd]">
                    <span className="block font-semibold text-[#140b20]">{p.name}</span>
                    {p.district ? <span className="mt-1 block text-xs text-[#667085]">{p.district}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {products.length > 0 ? (
        <section className="px-6 py-14 lg:px-14">
          <div className="mx-auto max-w-[1320px]">
            <h2 className="mb-8 font-serif text-3xl font-semibold text-[#140b20]">Önerilen Çiçekler</h2>
            <ShowcaseGrid items={products} basePath={path} page={1} totalPages={1} />
          </div>
        </section>
      ) : null}

      {texts.length > 0 ? (
        <section className="px-6 py-14 lg:px-14">
          <div className="prose prose-sm mx-auto max-w-[1320px] text-[#4b5563]">
            {texts.map((b, i) => (b.type === "heading" ? <h2 key={i}>{b.text}</h2> : <p key={i}>{b.text}</p>))}
          </div>
        </section>
      ) : null}

      {faq.length > 0 ? (
        <section className="bg-gradient-to-b from-[#f7f5fc] to-white px-6 py-14 lg:px-14">
          <div className="mx-auto max-w-[1320px]">
            <h2 className="mb-8 text-center font-serif text-3xl font-semibold text-[#140b20]">Sıkça Sorulan Sorular</h2>
            <div className="grid gap-5 md:grid-cols-2">
              {faq.map((f, i) => (
                <div key={i} className="rounded-[18px] border border-[#ebe7f2] bg-white p-6">
                  <h3 className="font-semibold text-[#140b20]">{f.q}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#667085]">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
