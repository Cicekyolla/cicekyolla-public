/**
 * §7 BEST SELLERS — ZIP Homepage.tsx birebir port.
 * Başlık + "Tümünü Gör" + 4 sütun ProductCard grid + mobil alt "Tümünü Gör" butonu.
 * Server component (shell'de hook/motion yok); kartlar client ProductCard. bestSellers verisi co-located.
 * Adaptasyon: react-router <Link to=…> → next/link <Link href=…>.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionLabel, SectionTitle } from "./SectionHeading";
import { ProductCard, type Product } from "./ProductCard";

export function BestSellers({ products = [] }: { products?: Product[] }) {
  // Gerçek katalog verisi yoksa (henüz "çok satan" işaretli aktif ürün yok) bölüm gizlenir.
  // Mock/hardcode YOK — admin Ürün Merkezi > Çok Satan toggle'ı bu rail'i doldurur.
  if (products.length === 0) return null;
  return (
    <section className="py-24">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="flex items-end justify-between mb-14">
          <div>
            <SectionLabel>Favori Ürünler</SectionLabel>
            <SectionTitle>
              En Çok Sevilen
              <br />
              Aranjmanlar
            </SectionTitle>
          </div>
          <Link
            href="/kategori/cok-satanlar"
            className="hidden md:flex items-center gap-2 text-sm text-[#8B5CF6] font-semibold hover:gap-3 transition-all"
          >
            Tümünü Gör <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7">
          {products.map((product, idx) => (
            <ProductCard key={product.id} product={product} idx={idx} />
          ))}
        </div>

        <div className="mt-10 text-center md:hidden">
          <Link
            href="/kategori/cok-satanlar"
            className="inline-flex items-center gap-2 text-sm text-[#8B5CF6] font-semibold border border-[#DDD6FE] px-8 py-3 rounded-full hover:bg-[#F5F3FF] transition-colors"
          >
            Tümünü Gör <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
