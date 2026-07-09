"use client";

/**
 * DeliveryAlternatives — Smart Delivery Alternative Engine (Conversion Recovery).
 * ---------------------------------------------------------------------------
 * Ürün seçilen adrese gönderilemiyorsa (İstanbul içi canlı ürün + il dışı adres):
 *   - Premium "bu adrese gönderilemiyor" bilgi kartı
 *   - KARGOYA UYGUN alternatif ürünler (responsive carousel) — /api/delivery-alternatives
 *   - CTA
 * Frontend hiçbir ürünü hardcoded göstermez; canlı katalogdan gelir. Sahte veri YOK.
 * Premium mor tema; mobil uyumlu. Mevcut mimari bozulmaz (additive).
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MapPin, PackageX, Sparkles, ChevronLeft, ChevronRight, Truck } from "lucide-react";

interface AltProduct {
  id: number;
  name: string;
  slug: string;
  price_minor: number | string;
  sale_price_minor: number | string | null;
  cover_image_url: string;
  product_type: string;
  is_bestseller: boolean;
}

interface Props {
  excludeId: number;
  city?: string | null;
  district?: string | null;
  categoryId?: number | null;
  priceMinor?: number | null;
}

function tl(minor: number | string): string {
  const n = Number(minor);
  return `${Math.round(n / 100).toLocaleString("tr-TR")} ₺`;
}

const TYPE_BADGE: Record<string, string> = {
  plant: "Türkiye Geneli",
  artificial: "Ücretsiz Kargo",
  gift: "1-3 İş Günü",
};

export default function DeliveryAlternatives({ excludeId, city, district, categoryId, priceMinor }: Props) {
  const [items, setItems] = useState<AltProduct[] | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = new URLSearchParams();
    if (excludeId) q.set("exclude", String(excludeId));
    if (categoryId) q.set("category", String(categoryId));
    if (priceMinor) q.set("price", String(priceMinor));
    q.set("limit", "12");
    let alive = true;
    fetch(`/api/delivery-alternatives?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (alive) setItems(Array.isArray(d?.items) ? d.items : []); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [excludeId, categoryId, priceMinor]);

  const scrollBy = (dir: number) => {
    railRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });
  };

  const addrLine = [district, city].filter(Boolean).join(" / ") || "seçtiğiniz adres";

  return (
    <div className="rounded-2xl border border-[#EDE9FE] bg-gradient-to-b from-[#FBFAFE] to-white p-4">
      {/* Premium "gönderilemiyor" bilgi kartı */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] flex items-center justify-center shrink-0">
          <PackageX className="w-5 h-5 text-[#DC2626]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6D28D9]">
            <MapPin className="w-3.5 h-3.5" /> Teslimat Adresiniz · {addrLine}
          </div>
          <p className="text-[13px] font-bold text-[#111827] mt-1">
            Bu ürün bu adrese aynı gün / kargo ile gönderilemiyor.
          </p>
          <p className="text-[12.5px] text-[#6B7280] mt-1 leading-relaxed">
            💜 Endişelenmeyin — bu adrese güvenle gönderebileceğiniz özel ürünleri sizin için hazırladık.
          </p>
        </div>
      </div>

      {/* Alternatif ürünler */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="flex items-center gap-1.5 text-[13px] font-bold text-[#1F2937]">
            <Sparkles className="w-4 h-4 text-[#7C3AED]" /> Bu Adrese Gönderebileceğiniz Ürünler
          </h3>
          <div className="hidden sm:flex items-center gap-1">
            <button onClick={() => scrollBy(-1)} aria-label="Geri" className="w-7 h-7 rounded-full border border-[#EDE9FE] flex items-center justify-center text-[#7C3AED] hover:bg-[#F5F3FF] transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => scrollBy(1)} aria-label="İleri" className="w-7 h-7 rounded-full border border-[#EDE9FE] flex items-center justify-center text-[#7C3AED] hover:bg-[#F5F3FF] transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {items === null ? (
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="w-[150px] shrink-0 animate-pulse">
                <div className="w-full aspect-[4/5] rounded-2xl bg-[#F1F0F5]" />
                <div className="h-3 bg-[#F1F0F5] rounded mt-2 w-4/5" />
                <div className="h-3 bg-[#F1F0F5] rounded mt-1.5 w-2/5" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-[12.5px] text-[#9CA3AF] py-2">Şu an bu adrese uygun ürün bulunamadı. Lütfen daha sonra tekrar deneyin.</p>
        ) : (
          <div
            ref={railRef}
            className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((p) => {
              const hasSale = p.sale_price_minor != null && Number(p.sale_price_minor) > 0 && Number(p.sale_price_minor) < Number(p.price_minor);
              const shown = hasSale ? p.sale_price_minor! : p.price_minor;
              const badge = TYPE_BADGE[p.product_type] ?? "Türkiye Geneli";
              return (
                <Link
                  key={p.id}
                  href={`/urun/${p.slug}`}
                  className="group w-[150px] shrink-0 snap-start"
                >
                  <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-white ring-1 ring-[#F1F0F5]">
                    <img src={p.cover_image_url} alt={p.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-[#D1FAE5] text-[#047857]">
                      <Truck className="w-2.5 h-2.5" /> {badge}
                    </span>
                  </div>
                  <div className="mt-2 text-[12.5px] font-semibold text-[#111827] leading-tight line-clamp-2 group-hover:text-[#7C3AED] transition-colors">
                    {p.name}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-[#111827]">{tl(shown)}</span>
                    {hasSale && <span className="text-[11px] text-[#C4B5FD] line-through">{tl(p.price_minor)}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* CTA */}
        {items && items.length > 0 && (
          <Link
            href="/"
            className="mt-3 inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#7C3AED] text-white text-[13px] font-bold hover:bg-[#6D28D9] transition-colors shadow-[0_4px_14px_rgba(124,58,237,0.25)]"
          >
            Bu Adrese Uygun Ürünleri Gör <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
