import type { Metadata } from "next";
import Link from "next/link";
import { Truck, Sparkles, ChevronLeft, PackageCheck } from "lucide-react";
import { fetchProducts, type PublicProductListItem } from "@/lib/api";

/**
 * /teslimat/[city] — Cargo Engine koleksiyon sayfası (Conversion Recovery).
 * ---------------------------------------------------------------------------
 * Yalnızca KARGOYA UYGUN ürünler (plant | artificial | gift = same_day_and_cargo).
 * Öncelik: aynı kategori (?cat) -> çok satan -> geniş katalog. ASLA boş kalmaz
 * (kategori boşsa tüm Türkiye-geneli kargo ürünlerine düşer). Sahte veri YOK;
 * tüm sonuçlar canlı katalogdan (fetchProducts). Mevcut mimari bozulmaz (additive).
 */

const CARGO_TYPES_DEFAULT = ["plant", "artificial", "gift"];
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

interface RecConfig { title: string; max_items: number; cargo_types: string[]; is_active: boolean; }
async function loadConfig(): Promise<RecConfig | null> {
  try {
    const r = await fetch(`${API_ORIGIN}/api/public/recommendation-config`, { next: { revalidate: 120 } });
    const j = await r.json().catch(() => null);
    return j?.data ?? null;
  } catch { return null; }
}

function titleCaseTr(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toLocaleUpperCase("tr-TR"));
}
function tl(m: number | string): string {
  return `${Math.round(Number(m) / 100).toLocaleString("tr-TR")} ₺`;
}
const TYPE_BADGE: Record<string, string> = { plant: "Türkiye Geneli", artificial: "Ücretsiz Kargo", gift: "1-3 İş Günü" };

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const name = titleCaseTr(params.city);
  return {
    title: `${name} Gönderilebilen Ürünler — Çiçekyolla`,
    description: `${name} adresine Türkiye geneli ücretsiz kargo ile gönderilebilen özel ürünler.`,
    robots: { index: false, follow: true },
  };
}

async function loadCargoProducts(catId: number, excludeId: number, cargoTypes: string[], limit: number): Promise<PublicProductListItem[]> {
  const calls: Promise<PublicProductListItem[]>[] = [
    fetchProducts({ page_size: 60 }),
    fetchProducts({ is_bestseller: true, page_size: 24 }),
  ];
  if (catId) calls.unshift(fetchProducts({ category_id: catId, page_size: 24 }));
  const lists = await Promise.all(calls);

  const seen = new Set<number>();
  const items: PublicProductListItem[] = [];
  for (const p of lists.flat()) {
    if (!p.cover_image_url) continue;
    if (excludeId && p.id === excludeId) continue;
    if (!cargoTypes.includes(p.product_type)) continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    items.push(p);
  }
  items.sort((a, b) => (a.is_bestseller !== b.is_bestseller ? (a.is_bestseller ? -1 : 1) : 0));
  return items.slice(0, limit);
}

export default async function DeliveryCityPage({
  params,
  searchParams,
}: {
  params: { city: string };
  searchParams: { cat?: string; il?: string; from?: string };
}) {
  const cityName = searchParams.il?.trim() || titleCaseTr(params.city);
  const catId = Number(searchParams.cat || 0);
  const excludeId = Number(searchParams.from || 0);
  const cfg = await loadConfig();
  const cargoTypes = cfg?.cargo_types?.length ? cfg.cargo_types : CARGO_TYPES_DEFAULT;
  const maxItems = cfg?.max_items && cfg.max_items > 0 ? cfg.max_items : 24;
  const pageTitle = cfg?.title?.trim() ? cfg.title.replace(/\{city\}/g, `${cityName}'a`) : `${cityName}'a Gönderilebilen Ürünler`;
  const items = await loadCargoProducts(catId, excludeId, cargoTypes, maxItems);

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 pt-6">
        <Link href="/" className="inline-flex items-center gap-1 text-[12px] text-[#9CA3AF] hover:text-[#7C3AED] transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Ana Sayfa
        </Link>

        {/* Başlık */}
        <div className="mt-4 rounded-2xl border border-[#EDE9FE] bg-gradient-to-b from-[#F5F3FF] to-white p-5 md:p-6">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[#7C3AED] uppercase">
            <PackageCheck className="w-4 h-4" /> Türkiye Geneli Ücretsiz Kargo
          </div>
          <h1 className="mt-2 text-[24px] md:text-[30px] font-bold text-[#111827] tracking-tight">
            {pageTitle}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-[#6B7280] max-w-2xl leading-relaxed">
            Seçtiğiniz adrese güvenle gönderebileceğiniz özel ürünler. Tümü kargo ile Türkiye&rsquo;nin her yerine ulaşır.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-8">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[15px] text-[#6B7280]">Şu an gönderime uygun ürün bulunamadı.</p>
            <Link href="/" className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#7C3AED] text-white text-[13px] font-bold hover:bg-[#6D28D9] transition-colors">
              Tüm Ürünleri Gör
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {items.map((p) => {
              const hasSale = p.sale_price_minor != null && Number(p.sale_price_minor) > 0 && Number(p.sale_price_minor) < Number(p.price_minor);
              const shown = hasSale ? p.sale_price_minor! : p.price_minor;
              const badge = TYPE_BADGE[p.product_type] ?? "Türkiye Geneli";
              return (
                <Link key={p.id} href={`/urun/${p.slug}`} className="group">
                  <div className="relative w-full aspect-[4/5] rounded-[20px] overflow-hidden bg-white ring-1 ring-[#F1F0F5]">
                    <img src={p.cover_image_url!} alt={p.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#D1FAE5] text-[#047857]">
                      <Truck className="w-3 h-3" /> {badge}
                    </span>
                    {p.is_bestseller && (
                      <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F59E0B] text-white">ÇOK SATAN</span>
                    )}
                  </div>
                  <div className="mt-2.5 text-[13.5px] font-semibold text-[#111827] leading-tight line-clamp-2 group-hover:text-[#7C3AED] transition-colors">
                    {p.name}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[15px] font-bold text-[#111827]">{tl(shown)}</span>
                    {hasSale && <span className="text-[12px] text-[#C4B5FD] line-through">{tl(p.price_minor)}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
