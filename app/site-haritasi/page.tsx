import type { Metadata } from "next";
import { ArrowDown, BadgeCheck, Globe2, Map, Sparkles } from "lucide-react";
import { SiteMapExplorer } from "@/components/sitemap/SiteMapExplorer";
import { fetchSeoInventory } from "@/lib/api";

export const metadata: Metadata = {
  title: "Site Haritası | Çiçek Yolla",
  description:
    "Çiçek Yolla ürünleri, koleksiyonları, özel günleri ve teslimat bölgelerini tek sayfadan keşfedin.",
  alternates: { canonical: "/site-haritasi" },
  robots: { index: true, follow: true },
};

export default async function SiteHaritasiPage() {
  const inventory = await fetchSeoInventory();
  const indexableCount = inventory.filter((item) => item.index_state === "index").length;
  const updatedAt = inventory.reduce<string | null>((latest, item) => {
    if (!item.updated_at) return latest;
    return !latest || item.updated_at > latest ? item.updated_at : latest;
  }, null);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Çiçek Yolla Site Haritası",
    description: "Yayındaki ürün, kategori, özel gün ve teslimat sayfalarının canlı dizini.",
    url: "https://www.cicekyolla.com.tr/site-haritasi",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: inventory.length,
      itemListElement: inventory.slice(0, 200).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.title || item.url_path,
        url: `https://www.cicekyolla.com.tr${item.url_path}`,
      })),
    },
  };

  return (
    <main className="min-h-screen bg-[#FAF8FD]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />

      <section className="relative overflow-hidden bg-[#0B0317] px-5 pb-20 pt-24 text-white sm:px-8 lg:px-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(124,58,237,0.42),transparent_34%),radial-gradient(circle_at_12%_88%,rgba(91,33,182,0.28),transparent_30%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="relative mx-auto max-w-[1440px]">
          <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
            <div className="max-w-4xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#DDD6FE] backdrop-blur">
                <Globe2 className="h-4 w-4 text-[#A78BFA]" />
                Canlı Cicekyolla rehberi
              </span>
              <h1 className="mt-7 text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-7xl">
                Aradığınız her şey,
                <span className="block bg-gradient-to-r from-[#C4B5FD] via-[#A78BFA] to-[#F0ABFC] bg-clip-text text-transparent">
                  tek bir haritada.
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-[#B9AEC9] sm:text-lg">
                Canlı ürünleri, koleksiyonları, özel günleri ve teslimat bölgelerini hızlıca
                keşfedin. Bu sayfa yalnız yayındaki gerçek içeriklerle otomatik güncellenir.
              </p>
            </div>

            <div className="grid min-w-full grid-cols-2 gap-3 sm:min-w-[440px]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                <Map className="h-5 w-5 text-[#C4B5FD]" />
                <strong className="mt-4 block text-3xl font-black">{inventory.length}</strong>
                <span className="mt-1 block text-xs text-[#A99EBB]">Canlı bağlantı</span>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                <BadgeCheck className="h-5 w-5 text-[#86EFAC]" />
                <strong className="mt-4 block text-3xl font-black">{indexableCount}</strong>
                <span className="mt-1 block text-xs text-[#A99EBB]">İndekslenebilir</span>
              </div>
              <div className="col-span-2 flex items-center justify-between rounded-3xl border border-[#8B5CF6]/30 bg-[#6D28D9]/20 p-5">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#C4B5FD]">Otomatik güncel</span>
                  <p className="mt-1 text-sm font-bold text-white">
                    {updatedAt
                      ? `Son veri: ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(updatedAt))}`
                      : "Yeni canlı kayıtlar otomatik eklenir"}
                  </p>
                </div>
                <Sparkles className="h-6 w-6 text-[#E9D5FF]" />
              </div>
            </div>
          </div>

          <a
            href="#site-dizini"
            className="mt-12 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#C4B5FD] transition hover:text-white"
          >
            Site dizinini keşfet <ArrowDown className="h-4 w-4" />
          </a>
        </div>
      </section>

      <div id="site-dizini">
        <SiteMapExplorer items={inventory} />
      </div>
    </main>
  );
}
