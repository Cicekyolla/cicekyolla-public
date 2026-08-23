import type { Metadata } from "next";
import { ProductDisplayName } from "@/lib/i18n/content";
import Link from "next/link";
import { Truck, Sparkles, ChevronLeft, PackageCheck } from "lucide-react";
import { fetchProducts, fetchProductsPaged, type PublicProductListItem } from "@/lib/api";
import { ProductImage } from "@/components/product/ProductImage";

/**
 * /teslimat/[city] — Cargo Engine koleksiyon sayfası (Conversion Recovery).
 * ---------------------------------------------------------------------------
 * Yalnızca KARGOYA UYGUN ürünler — TEK OTORİTE teslimat profili (cargo ∪ same_day_and_cargo).
 * product_type/delivery_scope/kategori yetki VEREMEZ; Kargo Merkezi'nde onaylanmamış ürün buraya giremez.
 * Öncelik: aynı kategori (?cat) -> çok satan -> geniş katalog. ASLA boş kalmaz
 * (kategori boşsa tüm Türkiye-geneli kargo ürünlerine düşer). Sahte veri YOK;
 * tüm sonuçlar canlı katalogdan (fetchProducts). Mevcut mimari bozulmaz (additive).
 */

// Admin Kargo Merkezi kararı ANINDA yansısın: sayfa dinamik, ürün sorguları önbelleksiz.
export const dynamic = "force-dynamic";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

interface RecConfig { title: string; max_items: number; is_active: boolean; }
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
const CARGO_ETA_TEXT = "1-3 iş günü"; // tek kargo dili (backend deliveryDecision.CARGO_ETA_TEXT ile aynı)

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const name = titleCaseTr(params.city);
  return {
    title: `${name} Gönderilebilen Ürünler — Çiçekyolla`,
    description: `${name} adresine Türkiye geneli ücretsiz kargo ile gönderilebilen özel ürünler.`,
    robots: { index: false, follow: true },
  };
}

const PAGE_SIZE = 50; // operatör kararı (22 Ağu): sayfa başına 50, sıralı sayfalama

async function loadCargoProducts(catId: number, excludeId: number, page: number): Promise<{ items: PublicProductListItem[]; total: number; pages: number; page: number }> {
  // Havuz = TÜM kargoya onaylı ürünler (sayfalı, üst sınır 1000) — Kargo Merkezi'nde
  // sonradan açılan eski ürünler de aday olur (önceden yalnız en yeni 60 ürün alınıyordu).
  const allCargo: PublicProductListItem[] = [];
  for (let page = 1; page <= 10; page++) {
    const r = await fetchProductsPaged({ delivery_model: "cargo_capable", page_size: 100, page, sort: "created_at_desc", fresh: true });
    allCargo.push(...r.items);
    if (page >= (r.pagination?.total_pages ?? 1)) break;
  }
  const calls: Promise<PublicProductListItem[]>[] = [
    Promise.resolve(allCargo),
    fetchProducts({ delivery_model: "cargo_capable", is_bestseller: true, page_size: 24, fresh: true }),
  ];
  if (catId) calls.unshift(fetchProducts({ delivery_model: "cargo_capable", category_id: catId, page_size: 24, fresh: true }));
  const lists = await Promise.all(calls);

  const seen = new Set<number>();
  const items: PublicProductListItem[] = [];
  for (const p of lists.flat()) {
    if (!p.cover_image_url) continue;
    if (excludeId && p.id === excludeId) continue;
    // İkinci savunma: profil kodu kargo değilse (veya yoksa) asla listeleme.
    if (p.delivery_model_code !== "cargo" && p.delivery_model_code !== "same_day_and_cargo") continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    items.push(p);
  }
  // Sıra: aynı kategori (önce) → çok satan → ad (deterministik sayfalama)
  items.sort((a, b) => (a.is_bestseller !== b.is_bestseller ? (a.is_bestseller ? -1 : 1) : a.name.localeCompare(b.name, "tr")));
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const cur = Math.min(Math.max(1, page), pages);
  return { items: items.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE), total: items.length, pages, page: cur };
}

export default async function DeliveryCityPage({
  params,
  searchParams,
}: {
  params: { city: string };
  searchParams: { cat?: string; il?: string; from?: string; sayfa?: string };
}) {
  const cityName = searchParams.il?.trim() || titleCaseTr(params.city);
  const catId = Number(searchParams.cat || 0);
  const excludeId = Number(searchParams.from || 0);
  const cfg = await loadConfig();
  const pageNo = Math.max(1, Number(searchParams.sayfa || 1) || 1);
  const pageTitle = cfg?.title?.trim() ? cfg.title.replace(/\{city\}/g, `${cityName}'a`) : `${cityName}'a Gönderilebilen Ürünler`;
  const { items, total, pages, page } = await loadCargoProducts(catId, excludeId, pageNo);
  const pageHref = (n: number) => { const q = new URLSearchParams(); if (searchParams.from) q.set("from", searchParams.from); if (searchParams.cat) q.set("cat", searchParams.cat); if (searchParams.il) q.set("il", searchParams.il); if (n > 1) q.set("sayfa", String(n)); const qs = q.toString(); return `/teslimat/${params.city}${qs ? `?${qs}` : ""}`; };

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
              const badge = `Kargo · ${CARGO_ETA_TEXT}`;
              return (
                <Link key={p.id} href={`/urun/${p.slug}`} className="group">
                  <div className="relative w-full aspect-[4/5] rounded-[20px] overflow-hidden bg-white ring-1 ring-[#F1F0F5]">
                    <ProductImage source={p} alt={p.name} hoverZoom padding="0px" sizes="(max-width:768px) 50vw, (max-width:1024px) 33vw, 25vw" />
                    <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#D1FAE5] text-[#047857]">
                      <Truck className="w-3 h-3" /> {badge}
                    </span>
                    {p.is_bestseller && (
                      <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F59E0B] text-white">ÇOK SATAN</span>
                    )}
                  </div>
                  <div className="mt-2.5 text-[13.5px] font-semibold text-[#111827] leading-tight line-clamp-2 group-hover:text-[#7C3AED] transition-colors">
                    <ProductDisplayName id={p.id} fallback={p.name} />
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
        {pages > 1 && (
          <nav aria-label="Sayfalama" className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {page > 1 && <Link href={pageHref(page - 1)} className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#374151] hover:border-[#7C3AED]">‹ Önceki</Link>}
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={pageHref(n)} aria-current={n === page ? "page" : undefined}
                className={`min-w-[40px] text-center px-3 py-2 rounded-xl text-[13px] font-bold ${n === page ? "bg-[#7C3AED] text-white" : "border border-[#E5E7EB] text-[#374151] hover:border-[#7C3AED]"}`}>
                {n}
              </Link>
            ))}
            {page < pages && <Link href={pageHref(page + 1)} className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#374151] hover:border-[#7C3AED]">Sonraki ›</Link>}
          </nav>
        )}
        <p className="mt-4 text-center text-[12.5px] text-[#6B7280]">Kargoya onaylı toplam {total} ürün · sayfa {page}/{pages}</p>
      </div>
    </main>
  );
}
