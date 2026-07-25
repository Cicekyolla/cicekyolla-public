import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { fetchProductsPaged, toCardProduct } from "@/lib/api";
import { ProductCard } from "@/components/home/ProductCard";

/* ============================================================================
   /arama — Gerçek arama sonuç sayfası (additive).
   WebSite JSON-LD SearchAction zaten /arama?q= hedefliyordu; bu sayfa o 404'ü
   kapatır. Veri TEK KAYNAK canlı katalog: /api/products?q= (backend ILIKE +
   trigram index). Mock yok; sonuç yoksa dürüst boş durum + canlı kategori
   önerileri. Arama sonuçları indexlenmez (noindex) — SEO hijyeni.
   ============================================================================ */

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function readQuery(searchParams?: SearchParams): string {
  const raw = searchParams?.q;
  return (typeof raw === "string" ? raw : "").trim().slice(0, 80);
}

export async function generateMetadata({ searchParams }: { searchParams?: SearchParams }): Promise<Metadata> {
  const q = readQuery(searchParams);
  return {
    title: q ? `“${q}” için arama sonuçları | Çiçekyolla` : "Arama | Çiçekyolla",
    description: "Çiçekyolla canlı katalogda gül, orkide, buket ve tüm çiçekleri arayın.",
    robots: { index: false, follow: true },
  };
}

const POPULAR = [
  { label: "Güller", href: "/kategori/guller" },
  { label: "Orkideler", href: "/kategori/orkideler" },
  { label: "Buketler", href: "/kategori/buketler" },
  { label: "Saksı Bitkileri", href: "/kategori/saksi-bitkileri" },
  { label: "Özel Günler", href: "/kategori/ozel-gunler" },
];

export default async function SearchPage({ searchParams }: { searchParams?: SearchParams }) {
  const q = readQuery(searchParams);
  const page = q.length >= 2 ? await fetchProductsPaged({ q, page_size: 48 }) : null;
  const products = (page?.items ?? []).filter((p) => p.cover_image_url).map(toCardProduct);
  const total = page?.pagination.total ?? 0;

  return (
    <main className="bg-white min-h-[60svh]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14 py-10 lg:py-14">
        <p className="text-[10px] text-[#A855F7] font-bold tracking-[0.18em] uppercase mb-2">Arama</p>
        <h1 className="text-[#111827] text-2xl lg:text-4xl font-semibold mb-6" style={{ fontFamily: "var(--font-display)" }}>
          {q ? <>“{q}” için sonuçlar</> : "Ne aramıştınız?"}
        </h1>

        {/* JS'siz çalışan gerçek arama formu (GET /arama?q=) */}
        <form action="/arama" method="get" role="search" className="relative max-w-xl mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" aria-hidden="true" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Gül, orkide, buket, özel gün ara..."
            aria-label="Ürün ara"
            className="w-full pl-11 pr-5 py-3 bg-[#F5F3FF] border border-[#DDD6FE] rounded-full text-sm text-[#374151] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#8B5CF6] focus:bg-white transition-all"
          />
        </form>

        {q.length >= 2 ? (
          products.length > 0 ? (
            <>
              <p className="text-sm text-[#6B7280] mb-6">{total} ürün bulundu.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {products.map((product, idx) => (
                  <ProductCard key={product.id} product={product} idx={idx} />
                ))}
              </div>
            </>
          ) : (
            <div className="max-w-xl">
              <p className="text-[#374151] font-semibold mb-2">“{q}” için sonuç bulunamadı.</p>
              <p className="text-sm text-[#6B7280] mb-6">Yazımı kontrol edebilir veya popüler koleksiyonlara göz atabilirsiniz.</p>
            </div>
          )
        ) : q ? (
          <p className="text-sm text-[#6B7280] mb-6">Arama için en az 2 karakter yazın.</p>
        ) : null}

        {(q.length < 2 || products.length === 0) && (
          <div className="mt-2 flex flex-wrap gap-2.5">
            {POPULAR.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center rounded-full border border-[#EDE9FE] bg-[#F5F3FF] px-4 py-2 text-sm font-semibold text-[#7C3AED] hover:bg-white hover:border-[#DDD6FE] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
