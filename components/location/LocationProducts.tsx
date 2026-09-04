"use client";
import { ProductDisplayName } from "@/lib/i18n/content";
import { Price } from "@/components/Price";

// ---------------------------------------------------------------------------
// LOKASYON ÜRÜN GRID'İ (ADDITIVE — Faz 1/3). Coverage Engine'in public ucundan
// gelen, lokasyona teslim edilebilir GERÇEK ürünler. İlk 12 SSR ile gelir
// (LCP korunur); "Daha Fazla Göster" 24→36→48 basamaklarıyla aynı origin
// proxy'sinden (/api/location-products) sayfa ekler. Filtre çipleri yalnız
// API'nin gerçekten desteklediği alanlardır (is_bestseller / is_new /
// is_featured) — sahte filtre yok. Kartlar merkezi ProductImage kullanır (CLS 0).
// ---------------------------------------------------------------------------
import { useCallback, useState } from "react";
import Link from "next/link";
import { toCardProduct, type CardProduct, type PublicProductListItem } from "@/lib/api";
import { ProductImage } from "@/components/product/ProductImage";

const PAGE_SIZE = 12;
const MAX_ITEMS = 48;

type FilterKey = "all" | "is_bestseller" | "is_new" | "is_featured";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "is_bestseller", label: "Çok Satan" },
  { key: "is_new", label: "Yeni" },
  { key: "is_featured", label: "Premium" },
];

type LocationProductsProps = {
  citySlug: string;
  districtSlug: string;
  neighborhoodSlug?: string;
  placeName: string;
  initialItems: CardProduct[];
  initialTotal: number;
};

type ApiEnvelope = {
  data?: {
    items?: PublicProductListItem[];
    pagination?: { total?: number };
  };
};

async function fetchPage(
  props: Pick<LocationProductsProps, "citySlug" | "districtSlug" | "neighborhoodSlug">,
  filter: FilterKey,
  page: number,
): Promise<{ items: CardProduct[]; total: number } | null> {
  const p = new URLSearchParams({
    city: props.citySlug,
    district: props.districtSlug,
    page: String(page),
    page_size: String(PAGE_SIZE),
  });
  if (props.neighborhoodSlug) p.set("neighborhood", props.neighborhoodSlug);
  if (filter !== "all") p.set(filter, "true");
  try {
    const res = await fetch(`/api/location-products?${p.toString()}`);
    if (!res.ok) return null;
    const json = (await res.json()) as ApiEnvelope;
    const rows = json?.data?.items;
    if (!Array.isArray(rows)) return null;
    return { items: rows.map(toCardProduct), total: Number(json?.data?.pagination?.total ?? rows.length) };
  } catch {
    return null;
  }
}

export function LocationProducts({
  citySlug,
  districtSlug,
  neighborhoodSlug,
  placeName,
  initialItems,
  initialTotal,
}: LocationProductsProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [items, setItems] = useState<CardProduct[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const applyFilter = useCallback(
    async (next: FilterKey) => {
      if (next === filter || loading) return;
      setFilter(next);
      setLoading(true);
      setFailed(false);
      if (next === "all") {
        setItems(initialItems);
        setTotal(initialTotal);
        setPage(1);
        setLoading(false);
        return;
      }
      const result = await fetchPage({ citySlug, districtSlug, neighborhoodSlug }, next, 1);
      if (result) {
        setItems(result.items);
        setTotal(result.total);
        setPage(1);
      } else {
        setFailed(true);
      }
      setLoading(false);
    },
    [filter, loading, initialItems, initialTotal, citySlug, districtSlug, neighborhoodSlug],
  );

  const loadMore = useCallback(async () => {
    if (loading || items.length >= Math.min(total, MAX_ITEMS)) return;
    setLoading(true);
    setFailed(false);
    const nextPage = page + 1;
    const result = await fetchPage({ citySlug, districtSlug, neighborhoodSlug }, filter, nextPage);
    if (result) {
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...result.items.filter((x) => !seen.has(x.id))].slice(0, MAX_ITEMS);
      });
      setTotal(result.total);
      setPage(nextPage);
    } else {
      setFailed(true);
    }
    setLoading(false);
  }, [loading, items.length, total, page, filter, citySlug, districtSlug, neighborhoodSlug]);

  const canLoadMore = items.length < Math.min(total, MAX_ITEMS);

  return (
    <div>
      <div className="mt-8 flex flex-wrap gap-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => applyFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`rounded-full border px-6 py-2.5 text-sm font-bold transition-colors ${
              filter === f.key
                ? "border-[#8b5cf6] bg-[#8b5cf6] text-white shadow-[0_10px_25px_rgba(139,92,246,.25)]"
                : "border-[#e8e1f0] bg-white text-[#4b4457] hover:border-[#c4b5fd] hover:text-[#6d28d9]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items.length > 0 ? (
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((p) => (
            <Link key={p.id} href={`/urun/${p.slug}`} className="group overflow-hidden rounded-[18px] bg-white">
              <div className="relative aspect-square overflow-hidden rounded-[18px] bg-[#f7f5fa]">
                <ProductImage
                  src={p.image}
                  alt={p.name}
                  padding="0px"
                  derivatives={p.derivatives}
                  blurhash={p.blurhash}
                  hoverZoom
                  sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
                />
                {p.badge ? (
                  <span className="absolute left-3 top-3 z-[2] rounded-full bg-[#8b5cf6]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    {p.badge}
                  </span>
                ) : null}
              </div>
              <div className="pt-5">
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8b5cf6]">
                  {p.sameDay ? "Aynı Gün Teslimat" : "Premium Aranjman"}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[#171020] group-hover:text-[#6d28d9]"><ProductDisplayName id={p.id} fallback={p.name} /></h3>
                <p className="mt-2 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-[#141020]"><Price minor={p.priceMinor ?? p.price * 100} /></span>
                  {p.originalPrice ? (
                    <span className="text-sm font-medium text-[#9b94a8] line-through">
                      <Price minor={p.originalPriceMinor ?? p.originalPrice * 100} />
                    </span>
                  ) : null}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-[24px] border border-[#ede9fe] bg-white p-8">
          <p className="text-[#746c80]">
            {loading
              ? "Ürünler yükleniyor…"
              : `Bu filtrede ${placeName} için uygun ürün bulunamadı. Tüm çiçekleri inceleyebilirsiniz.`}
          </p>
          <Link href="/kategori/cicekler" className="mt-5 inline-flex rounded-full bg-[#8b5cf6] px-6 py-3 font-bold text-white">
            Çiçekleri İncele
          </Link>
        </div>
      )}

      {failed ? (
        <p className="mt-6 text-sm text-[#9b94a8]">Ürünler şu anda yüklenemedi — lütfen tekrar deneyin.</p>
      ) : null}

      {canLoadMore ? (
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-full border border-[#e2dbf2] bg-white px-10 py-4 font-bold text-[#6d28d9] transition-colors hover:border-[#c4b5fd] hover:bg-[#f5f0ff] disabled:opacity-60"
          >
            {loading ? "Yükleniyor…" : "Daha Fazla Göster"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default LocationProducts;
