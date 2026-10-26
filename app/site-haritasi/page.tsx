import type { Metadata } from "next";
import { safeJsonLd } from "@/lib/jsonLdSafe";
import { BadgeCheck, Globe2, Map, Sparkles } from "lucide-react";
import { SiteMapContent } from "./SiteMapContent";
import { absoluteUrl, indexRobots } from "@/lib/site-config";
import { categories } from "@/app/api/site-map/data";
import Link from "next/link";
import { fetchCityDistricts, fetchRedirectMap, finalPathOf } from "@/lib/api";
import { districtLinks } from "@/lib/istanbulLinkAgi";

export const metadata: Metadata = {
  title: "Site Haritası",
  description: "ÇiçekYolla'nın tüm çiçek koleksiyonları, özel günler, teslimat bölgeleri ve bilgi sayfaları. Aradığınız her şey tek bir haritada.",
  alternates: { canonical: "/site-haritasi" },
  robots: indexRobots(),
};

export default async function SiteHaritasiPage() {
  const total = categories.length;
  // EK (İSTANBUL LİNK AĞI, 26 Eki 2026): "site haritası" lokasyonları hiç listelemiyordu
  // (ölçüm: 0 ilçe linki). İlçeler SEO envanterinden (/istanbul hub'ıyla aynı kaynak),
  // SSR'da basılır; mahalleler her ilçe sayfasında zaten linkli. Okunamazsa bölüm çizilmez.
  const redirects = await fetchRedirectMap();
  const istanbulLinks = districtLinks("istanbul", await fetchCityDistricts("istanbul"), (p) => finalPathOf(redirects, p));
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "ÇiçekYolla Site Haritası",
    description: metadata.description,
    url: absoluteUrl("/site-haritasi"),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total + istanbulLinks.length,
      itemListElement: [
        ...categories.map((item) => ({
          name: item.title,
          url: absoluteUrl(item.isPage ? `/${item.slug}` : `/kategori/${item.slug}`),
        })),
        ...istanbulLinks.map((d) => ({ name: `${d.name} Çiçek Siparişi`, url: absoluteUrl(d.href) })),
      ].map((item, index) => ({ "@type": "ListItem", position: index + 1, ...item })),
    },
  };

  return (
    <main className="min-h-screen bg-[#FAF8FD]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />
      <section className="relative overflow-hidden bg-[#0B0317] px-5 pb-20 pt-24 text-white sm:px-8 lg:px-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(124,58,237,0.42),transparent_34%),radial-gradient(circle_at_12%_88%,rgba(91,33,182,0.28),transparent_30%)]" />
        <div className="relative mx-auto max-w-[1440px]">
          <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
            <div className="max-w-4xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#DDD6FE]"><Globe2 className="h-4 w-4 text-[#A78BFA]" />Canlı ÇiçekYolla Rehberi</span>
              <h1 className="mt-7 text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-7xl">Aradığınız her şey,<span className="block bg-gradient-to-r from-[#C4B5FD] via-[#A78BFA] to-[#F0ABFC] bg-clip-text text-transparent">tek bir haritada.</span></h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-[#B9AEC9] sm:text-lg">ÇiçekYolla'nın koleksiyonlarını, özel günlerini, teslimat bölgelerini ve bilgi sayfalarını hızlıca keşfedin.</p>
            </div>
            <div className="grid min-w-full grid-cols-2 gap-3 sm:min-w-[440px]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5"><Map className="h-5 w-5 text-[#C4B5FD]" /><strong className="mt-4 block text-3xl font-black">{total}</strong><span className="mt-1 block text-xs text-[#A99EBB]">Canlı bağlantı</span></div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5"><BadgeCheck className="h-5 w-5 text-[#86EFAC]" /><strong className="mt-4 block text-3xl font-black">{total}</strong><span className="mt-1 block text-xs text-[#A99EBB]">Doğrulanacak bağlantı</span></div>
              <div className="col-span-2 flex items-center justify-between rounded-3xl border border-[#8B5CF6]/30 bg-[#6D28D9]/20 p-5"><div><span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#C4B5FD]">Otomatik güncel</span><p className="mt-1 text-sm font-bold">Yeni kayıtlar API üzerinden eklenir</p></div><Sparkles className="h-6 w-6 text-[#E9D5FF]" /></div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-14"><SiteMapContent categories={categories} /></section>
      {istanbulLinks.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-5 pb-16 sm:px-8 lg:px-14">
          <p className="mb-2 text-xs font-bold uppercase tracking-[.24em] text-[#8b5cf6]">Teslimat Bölgeleri</p>
          <h2 className="mb-8 text-3xl font-black tracking-[-0.03em] text-[#12091f]">İstanbul — {istanbulLinks.length} İlçe</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {istanbulLinks.map((d) => (
              <Link key={d.slug} href={d.href} className="rounded-[16px] border border-[#ece7f4] bg-white px-5 py-4 text-sm font-semibold text-[#1f2937] transition-colors hover:border-[#c4b5fd] hover:text-[#6d28d9]">
                {d.name} Çiçek Siparişi
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
