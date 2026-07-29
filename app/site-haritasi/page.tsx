import type { Metadata } from "next";
import { BadgeCheck, Globe2, Map, Sparkles } from "lucide-react";
import { SiteMapContent } from "./SiteMapContent";
import { absoluteUrl, indexRobots } from "@/lib/site-config";
import type { SiteMapCategory } from "@/app/api/site-map/route";

async function getSiteMapData(): Promise<{ categories: SiteMapCategory[]; total: number }> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/site-map`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error("Site map data fetch failed");
  return res.json();
}

export const metadata: Metadata = {
  title: "Site Haritası | ÇiçekYolla",
  description: "ÇiçekYolla'nın tüm çiçek koleksiyonları, özel günler, teslimat bölgeleri ve bilgi sayfaları. Aradığınız her şey tek bir haritada.",
  alternates: { canonical: "/site-haritasi" },
  robots: indexRobots(),
};

export default async function SiteHaritasiPage() {
  const { categories, total } = await getSiteMapData();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "ÇiçekYolla Site Haritası",
    description: metadata.description,
    url: absoluteUrl("/site-haritasi"),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total,
      itemListElement: categories.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.title,
        url: absoluteUrl(item.isPage ? `/${item.slug}` : `/kategori/${item.slug}`),
      })),
    },
  };

  return (
    <main className="min-h-screen bg-[#FAF8FD]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
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
    </main>
  );
}
