import Link from "next/link";
import type { SeoPublicPage, BodyBlock } from "@/lib/api";

/**
 * §Category Landing (Yol A — SEO-Content) — İSKELET (parça 1).
 * Kaynak: fetchSeoPage(path) → SeoPublicPage (h1, intro_html, body_blocks, faq).
 * ÜRÜN GRID YOK, SAHTE VERİ YOK, BACKEND'E DOKUNULMAZ. Server component (SEO-first SSR).
 *
 * Bu parça: breadcrumb + premium hero + SEO body + FAQ accordion + additive BreadcrumbList JSON-LD.
 * Sonraki parça: iç-linkleme kategori kartları + ilgili koleksiyonlar + WhatsApp/Sipariş CTA.
 *
 * Not: Backend FAQ JSON-LD'i route (faqJsonLd) + schema_jsonld route'ta basıyor → burada TEKRAR ÜRETİLMEZ.
 *      Yalnızca yeni/additive BreadcrumbList JSON-LD eklenir (mevcut schema ile çakışmaz).
 */

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cicekyolla-public.vercel.app"
).replace(/\/$/, "");

/** body_blocks → premium tipografi (route'daki renderBlock ile aynı mantık, stilli). */
function renderBlock(block: BodyBlock, i: number) {
  if (block.type === "heading") {
    return (
      <h2
        key={i}
        style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
        className="text-2xl lg:text-[28px] font-semibold text-[#111827] mt-10 mb-4"
      >
        {block.text}
      </h2>
    );
  }
  return block.text ? (
    <p key={i} className="text-[#4B5563] text-[16px] leading-[1.85] mb-5">
      {block.text}
    </p>
  ) : null;
}

/** BreadcrumbList JSON-LD — ADDITIVE. Backend schema_jsonld'a DOKUNMAZ; ayrı <script>. */
function breadcrumbJsonLd(h1: string, path: string): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: SITE_URL + "/" },
      { "@type": "ListItem", position: 2, name: h1, item: SITE_URL + path },
    ],
  });
}

export function CategoryLanding({ page, path }: { page: SeoPublicPage; path: string }) {
  const faqItems = (page.faq ?? []).filter((f) => f.q && f.a);

  return (
    <>
      <main className="bg-white">
        {/* ── Premium hero band (lilac) ── */}
        <section
          className="border-b border-black/[0.04]"
          style={{ background: "linear-gradient(180deg, #FAFAFA 0%, #F5F3FF 100%)" }}
        >
          <div className="max-w-[1100px] mx-auto px-6 lg:px-8 pt-10 pb-14 lg:pt-14 lg:pb-20">
            {/* Breadcrumb (2 seviye — JSON-LD ile tutarlı) */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-8">
              <Link href="/" className="hover:text-[#8B5CF6] transition-colors">Ana Sayfa</Link>
              <span aria-hidden="true">/</span>
              <span className="text-[#374151] font-medium">{page.h1}</span>
            </nav>

            <p className="text-[10px] tracking-[0.3em] text-[#8B5CF6] uppercase font-bold mb-4">Koleksiyon</p>
            <h1
              style={{ fontFamily: "var(--font-display)", lineHeight: 1.08, letterSpacing: "-0.02em" }}
              className="text-4xl md:text-5xl lg:text-[56px] font-semibold text-[#111827] max-w-[820px]"
            >
              {page.h1}
            </h1>

            {page.intro_html ? (
              <div
                className="mt-6 max-w-[720px] text-[#4B5563] text-[17px] leading-[1.8] [&_p]:mb-4 [&_a]:text-[#8B5CF6] [&_a]:font-medium hover:[&_a]:underline [&_strong]:text-[#111827] [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: page.intro_html }}
              />
            ) : null}
          </div>
        </section>

        {/* ── SEO body ── */}
        {page.body_blocks && page.body_blocks.length > 0 ? (
          <section className="max-w-[820px] mx-auto px-6 lg:px-8 py-14 lg:py-20">
            {page.body_blocks.map((b, i) => renderBlock(b, i))}
          </section>
        ) : null}

        {/* ── FAQ (görsel accordion; JSON-LD route'ta zaten üretiliyor → burada tekrar YOK) ── */}
        {faqItems.length > 0 ? (
          <section className="max-w-[820px] mx-auto px-6 lg:px-8 pb-16 lg:pb-24">
            <h2
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
              className="text-2xl lg:text-3xl font-semibold text-[#111827] mb-8"
            >
              Sıkça Sorulan Sorular
            </h2>
            <div className="space-y-3">
              {faqItems.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-2xl border border-black/[0.06] bg-white px-6 py-4 transition-colors hover:border-[#DDD6FE]"
                >
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-[15px] font-semibold text-[#111827]">
                    {f.q}
                    <span className="text-[#8B5CF6] text-xl leading-none transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-[#6B7280] text-[15px] leading-[1.8]">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      {/* ── Breadcrumb JSON-LD (additive; mevcut schema ile çakışmaz) ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd(page.h1, path) }}
      />
    </>
  );
}
