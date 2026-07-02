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

const bestSellers: Product[] = [
  { id: 1, name: "Premium Kırmızı Güller", subtitle: "25 Adet El Seçimi", price: 599, originalPrice: 749, image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800&h=1000&fit=crop&auto=format&q=88", rating: 4.9, reviews: 234, slug: "premium-kirmizi-guller", badge: "Çok Satan" },
  { id: 2, name: "Beyaz Lale Aranjmanı", subtitle: "Premium Aranjman", price: 449, image: "https://images.unsplash.com/photo-1487530811015-780f2f5a3f48?w=800&h=1000&fit=crop&auto=format&q=88", rating: 4.8, reviews: 189, slug: "beyaz-lale-aranjmani", badge: "Yeni" },
  { id: 3, name: "Pembe Şakayık Buketi", subtitle: "Mevsimlik Koleksiyon", price: 699, image: "https://images.unsplash.com/photo-1490750967868-88df5691cc8e?w=800&h=1000&fit=crop&auto=format&q=88", rating: 5.0, reviews: 156, slug: "pembe-sakayik-buketi", badge: "Premium" },
  { id: 4, name: "Orkide Saksı", subtitle: "Uzun Ömürlü Hediye", price: 529, image: "https://images.unsplash.com/photo-1612968550885-5d1cf8a0c39f?w=800&h=1000&fit=crop&auto=format&q=88", rating: 4.9, reviews: 178, slug: "orkide-saksi", badge: "Sınırlı" },
];

export function BestSellers() {
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
          {bestSellers.map((product, idx) => (
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
