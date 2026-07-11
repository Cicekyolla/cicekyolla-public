import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchProductBySlug, fetchProducts } from "@/lib/api";
import CheckoutFlow from "@/components/checkout/CheckoutFlow";

export const dynamic = "force-dynamic";

export default async function HizliSiparisPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const sp = await searchParams;
  const slug = sp.product;
  if (!slug) notFound();

  const detail = await fetchProductBySlug(slug);
  if (!detail) notFound();

  const p = detail.product;
  const sale = p.sale_price_minor != null && Number(p.sale_price_minor) > 0 && Number(p.sale_price_minor) < Number(p.price_minor);
  const priceMinor = Math.round(sale ? Number(p.sale_price_minor) : Number(p.price_minor));
  const coverUrl = detail.images?.find((i) => i.role === "cover")?.url ?? detail.images?.[0]?.url ?? null;

  // Ek ürünler (çikolata/ayıcık/kart/balon…) — gift tipi, server'da çekilir (token server-only).
  const catOf = (name: string): string => {
    const n = name.toLocaleLowerCase("tr");
    if (/(çikolata|cikolata|truf|praline|chocolate)/.test(n)) return "Çikolata";
    if (/(ayıcık|ayicik|peluş|pelus|teddy|tavşan|tavsan|oyuncak)/.test(n)) return "Ayıcık & Peluş";
    if (/(kart|card|pankart|mesaj)/.test(n)) return "Kart";
    if (/(balon|balloon)/.test(n)) return "Balon";
    if (/(mum|candle)/.test(n)) return "Mum";
    if (/(vazo|vase)/.test(n)) return "Vazo";
    return "Diğer";
  };
  const addonRaw = await fetchProducts({ product_type: "gift", page_size: 12 }).catch(() => []);
  const addons = addonRaw
    .filter((a) => a.id !== p.id && a.cover_image_url)
    .map((a) => {
      const s = a.sale_price_minor != null && Number(a.sale_price_minor) > 0 && Number(a.sale_price_minor) < Number(a.price_minor);
      return { id: a.id, name: a.name, priceMinor: Math.round(s ? Number(a.sale_price_minor) : Number(a.price_minor)), image: a.cover_image_url ?? null, category: catOf(a.name) };
    })
    .slice(0, 12);

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        <nav className="text-[13px] text-[#9CA3AF] mb-8">
          <Link href="/" className="hover:text-[#7C3AED]">Ana Sayfa</Link> / <Link href={`/urun/${p.slug}`} className="hover:text-[#7C3AED]">{p.name}</Link> / <span className="text-[#374151]">Sipariş</span>
        </nav>
        <CheckoutFlow productName={p.name} productId={p.id} priceMinor={priceMinor} productSlug={p.slug} coverUrl={coverUrl} addons={addons} />
      </div>
    </main>
  );
}
