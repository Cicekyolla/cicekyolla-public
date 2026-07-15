import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchProductBySlug, fetchProducts, toCardProduct, formatMinorTRY } from "@/lib/api";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ProductReviews } from "@/components/product/ProductReviews";
import { ProductImage } from "@/components/product/ProductImage";

/* ============================================================================
   CICEKYOLLA PUBLIC — Ürün Detay Route  /urun/[slug]
   CTO Decision: Admin Ürün Merkezi → API → DB → BURASI → müşteri görür.
   Veri gerçek backend'den (GET /api/products/slug/:slug). Mock/hardcode YOK.
   SEO: admin Ürün Merkezi > SEO sekmesinde yönetilen alanlardan üretilir.
   Yalnız 'active' ürün gösterilir (fetchProductBySlug gate eder → null → 404).
   ============================================================================ */

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await fetchProductBySlug(params.slug);
  if (!data) return { title: "Ürün bulunamadı — Cicekyolla" };
  const { product, seo } = data;
  const title = seo?.meta_title || `${product.name} — Cicekyolla`;
  const description =
    seo?.meta_description ||
    product.short_description ||
    `${product.name} — aynı gün teslimat ve güvenli ödeme ile Cicekyolla'da.`;
  const ogImage = seo?.og_image || data.images.find((i) => i.role === "cover")?.url || data.images[0]?.url;
  return {
    title,
    description,
    alternates: seo?.canonical_url ? { canonical: seo.canonical_url } : undefined,
    openGraph: {
      title: seo?.og_title || title,
      description: seo?.og_description || description,
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const data = await fetchProductBySlug(params.slug);
  if (!data) notFound();

  const { product, images } = data;
  const cover = images.find((i) => i.role === "cover")?.url || images[0]?.url;
  const price = data.product.sale_price_minor && Number(data.product.sale_price_minor) > 0
    ? data.product.sale_price_minor
    : data.product.price_minor;

  // ── İLGİLİ ÜRÜNLER (Cross-Sell) — aynı kategoriden, canlı katalog ──
  // Admin: ürünün kategorisi → /api/products?category_id= → BURASI. Mock YOK.
  const primaryCat = data.categories.find((c) => c.is_primary) ?? data.categories[0];
  const relatedRows = primaryCat
    ? await fetchProducts({ category_id: primaryCat.category_id, page_size: 8, sort: "created_at_desc" })
    : [];
  const related = relatedRows
    .filter((p) => p.slug !== product.slug && p.cover_image_url)
    .slice(0, 4)
    .map(toCardProduct);

  // Product JSON-LD (schema) — gerçek üründen.
  const ratingCount = Number((product as { rating_count?: number }).rating_count ?? 0);
  const ratingAvg = Number((product as { rating_avg?: number }).rating_avg ?? 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short_description || product.long_description || product.name,
    image: cover ? [cover] : undefined,
    sku: product.sku || undefined,
    ...(ratingCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: ratingAvg.toFixed(1), reviewCount: ratingCount } } : {}),
    offers: {
      "@type": "Offer",
      price: (Number(price) / 100).toFixed(2),
      priceCurrency: product.currency || "TRY",
      availability: product.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductDetail data={data} />
      {(() => {
        const fn = (product as { florist_note?: string | null; florist_note_status?: string | null });
        if (!fn.florist_note || fn.florist_note_status !== "approved") return null;
        return (
          <section aria-label="Çiçek Yolla Önerisi" className="max-w-[1440px] mx-auto px-5 md:px-8 pb-4">
            <div className="rounded-[22px] border border-[#EDE9FE] bg-gradient-to-br from-[#FBFAFF] to-[#F5F3FF] p-6 lg:p-7">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#7C3AED] text-white text-[13px]">✿</span>
                <span className="text-[11px] tracking-[0.28em] text-[#6D28D9] uppercase font-bold">Çiçek Yolla Önerisi</span>
              </div>
              <p className="text-[15px] lg:text-[16px] leading-relaxed text-[#3F3A52]" style={{ fontFamily: "var(--font-display)" }}>
                {fn.florist_note}
              </p>
            </div>
          </section>
        );
      })()}
      <ProductReviews productId={product.id} productName={product.name} />
      {related.length > 0 ? (
        <section aria-label="Sıkça birlikte alınan ürünler" className="max-w-[1440px] mx-auto px-5 md:px-8 pb-20">
          <div
            className="overflow-hidden rounded-[32px] border border-white/10 px-5 py-7 sm:px-7 lg:px-10 lg:py-10"
            style={{
              background: "linear-gradient(135deg, #0B001F 0%, #19063A 52%, #35136D 100%)",
              boxShadow: "0 24px 70px rgba(39, 10, 86, 0.22)",
            }}
          >
            <div className="mb-7 flex items-center gap-4 border-b border-white/10 pb-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6]/25 text-xl text-[#C4B5FD]">
                ✦
              </span>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#C4B5FD]">
                  Sıkça Birlikte Alınanlar
                </p>
                <h2 className="text-xl font-semibold text-white lg:text-2xl" style={{ fontFamily: "var(--font-display)" }}>
                  Müşteriler Bunları da İnceledi
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {related.map((p) => (
                <Link
                  key={p.id}
                  href={`/urun/${p.slug}`}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.06] transition duration-300 hover:-translate-y-1 hover:border-[#A78BFA]/60 hover:bg-white/[0.10]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-white">
                    <ProductImage
                      src={p.image}
                      alt={p.name}
                      padding="0px"
                      derivatives={p.derivatives}
                      blurhash={p.blurhash}
                      sizes="(max-width:640px) 50vw, 25vw"
                    />
                    {p.badge ? (
                      <span className="absolute left-3 top-3 rounded-full bg-[#8B5CF6] px-2.5 py-1 text-[9px] font-bold text-white">
                        {p.badge}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex min-h-[132px] flex-1 flex-col p-4">
                    <h3
                      className="text-[13px] font-semibold leading-snug text-white sm:text-[14px]"
                      style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                    >
                      {p.name}
                    </h3>
                    <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                      <span className="text-lg font-bold text-[#D8B4FE]" style={{ fontFamily: "var(--font-display)" }}>
                        ₺{p.price}
                      </span>
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-xl text-white transition group-hover:border-[#A78BFA] group-hover:bg-[#8B5CF6]"
                      >
                        +
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-7 grid overflow-hidden rounded-[22px] border border-white/10 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["🌸", "Taze Çiçek Garantisi", "7–10 gün taze kalma garantisi"],
                ["⚡", "Aynı Gün Teslimat", "14:00'a kadar verilen siparişlerde"],
                ["🔒", "Güvenli Ödeme", "256-bit SSL ile korunan ödeme"],
                ["📦", "Özel Paketleme", "Özenli ve premium sunum"],
              ].map(([icon, title, text]) => (
                <div key={title} className="border-b border-white/10 p-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0">
                  <span className="mb-3 block text-xl">{icon}</span>
                  <p className="mb-1 text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs leading-relaxed text-[#B9A8D1]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      <section aria-labelledby="product-faq-title" className="max-w-[1440px] mx-auto px-5 md:px-8 pb-24">
        <div className="grid gap-10 border-t border-black/[0.06] pt-14 lg:grid-cols-[340px_1fr] lg:gap-20">
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-[#8B5CF6]">
              Sık Sorulan Sorular
            </p>
            <h2
              id="product-faq-title"
              className="mb-5 text-3xl font-semibold text-[#111827] lg:text-4xl"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
            >
              Merak Ettikleriniz
            </h2>
            <p className="max-w-[300px] text-[15px] leading-relaxed text-[#6B7280]">
              Bu ürün ve teslimat süreciyle ilgili en çok sorulan soruları derledik. Başka bir sorunuz varsa bize ulaşabilirsiniz.
            </p>
            <a
              href="https://wa.me/905074413474?text=Merhaba%2C%20%C3%BCr%C3%BCn%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum."
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp'tan ürün hakkında soru sor"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#22C55E] to-[#0D9488] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(16,185,129,0.24)] transition hover:-translate-y-0.5"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M12 2a9.7 9.7 0 0 0-8.3 14.7L2.4 22l5.5-1.4A9.8 9.8 0 1 0 12 2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3.3.9.9-3.2-.2-.3A8 8 0 1 1 12 19.7Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-1.9-1.2 7 7 0 0 1-1.3-1.6c-.1-.2 0-.4.1-.5l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.7-1.7c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.7 2.6 4.2 3.7.6.3 1 .4 1.4.5.6.2 1.1.2 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1 0-.2-.2-.2-.4-.3Z" />
              </svg>
              WhatsApp'tan Sor
            </a>
          </div>

          <div className="divide-y divide-[#EDE9FE]">
            {[
              ["Çiçekler ne zaman teslim edilir?", "Teslimat tarihi ve uygun saat aralığı sipariş adımında, seçtiğiniz bölgeye göre gösterilir."],
              ["Çiçekler ne kadar taze kalır?", "Doğru bakım ve ortam koşullarında çoğu aranjman yaklaşık 7–10 gün tazeliğini korur."],
              ["Fotoğraftaki çiçeklerle aynı mı geliyor?", "Tasarımın genel görünümü korunur. Mevsimsel tedarik durumunda eşdeğer renk ve değerde çiçeklerle küçük değişiklikler yapılabilir."],
              ["Kişisel mesaj karta nasıl yazılır?", "Sipariş adımlarındaki kart mesajı alanına notunuzu yazabilirsiniz; mesajınız ürünle birlikte hazırlanır."],
              ["Teslimat adresi yanlışsa ne yapabilirim?", "Sipariş hazırlanmadan önce iletişim sayfamızdan bize ulaşın. Uygunluk durumuna göre adresi güncelleyebiliriz."],
              ["Büyük boy seçimi daha mı iyi görünür?", "Büyük boy seçeneği, ürünün temel tasarımını koruyarak daha dolgun ve gösterişli bir sunum sağlar."],
            ].map(([question, answer], index) => (
              <details key={question} className="group" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-6 text-[16px] font-semibold text-[#111827] outline-none transition hover:text-[#7C3AED] focus-visible:ring-2 focus-visible:ring-[#A78BFA] [&::-webkit-details-marker]:hidden">
                  <span>{question}</span>
                  <span aria-hidden="true" className="text-xl font-normal text-[#8B5CF6] transition-transform duration-200 group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-3xl pb-6 pr-10 text-[14px] leading-7 text-[#6B7280]">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      {/* Fiyat özeti (SSR erişilebilirlik / no-JS fallback) */}
      <span className="sr-only">{formatMinorTRY(price)}</span>
    </>
  );
}
