import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchProductBySlug } from "@/lib/api";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

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

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
        <nav className="text-[13px] text-[#9CA3AF] mb-6">
          <Link href="/" className="hover:text-[#7C3AED]">Ana Sayfa</Link> / <Link href={`/urun/${p.slug}`} className="hover:text-[#7C3AED]">{p.name}</Link> / <span className="text-[#374151]">Hızlı Sipariş</span>
        </nav>
        <h1 className="text-3xl font-bold text-[#111827] mb-8" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
          Hızlı Sipariş
        </h1>
        <CheckoutForm productName={p.name} productId={p.id} priceMinor={priceMinor} />
      </div>
    </main>
  );
}
