import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import type { SeoPublicPage, BodyBlock } from "@/lib/api";
import { premiumCategories } from "../home/homeData";

/**
 * §Category Landing (Yol A — SEO-Content). Parça 1 (iskelet) + Parça 2 (iç-linkleme + CTA).
 * Kaynak: fetchSeoPage(path) → SeoPublicPage (h1, intro_html, body_blocks, faq).
 * ÜRÜN GRID YOK, SAHTE VERİ YOK, BACKEND'E DOKUNULMAZ. Server component (SEO-first SSR).
 *
 * İç-linkleme (SEO Internal Linking) için repo'da CANLI olan gerçek premiumCategories yeniden kullanılır
 * (DRY/reusable — yeni/sahte veri üretilmez). WhatsApp: sabit doğru link (905074413474 + ön-dolgu).
 *
 * JSON-LD: backend schema_jsonld + FAQPage route'ta basılır → burada TEKRAR ÜRETİLMEZ.
 *          Yalnızca additive BreadcrumbList JSON-LD eklenir (mevcut schema ile çakışmaz).
 */

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cicekyolla-public.vercel.app"
).replace(/\/$/, "");

const WHATSAPP_URL =
  "https://wa.me/905074413474?text=Merhaba%2C%20sipari%C5%9F%20vermek%20istiyorum";

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
  // İç-linkleme: mevcut kategoriyi çıkar, diğer küratörlü koleksiyonları göster (gerçek veri).
  const related = premiumCategories.filter((c) => c.href !== path);
  const relatedPills = related.slice(0, 6); // hero'da hızlı ilgili koleksiyon linkleri
  const otherCategories = related.slice(0, 12); // altta görsel keşif grid'i

  return (
    <>
      <main className="bg-white">
        {/* ── Premium hero band (lilac) ── */}
        <section
          className="border-b border-black/[0.04]"
          style={{ background: "linear-gradient(180deg, #FAFAFA 0%, #F5F3FF 100%)" }}
        >
          <div className="max-w-[1100px] mx-auto px-6 lg:px-8 pt-10 pb-14 lg:pt-14 lg:pb-20">
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

            {/* İlgili koleksiyon hızlı linkleri (pills) — sayfa üstünde erken iç-linkleme */}
            {relatedPills.length > 0 ? (
              <div className="mt-8">
                <p className="text-[11px] text-[#9CA3AF] font-medium mb-3">İlgili koleksiyonlar</p>
                <div className="flex flex-wrap gap-2">
                  {relatedPills.map((cat) => (
                    <Link
                      key={cat.id}
                      href={cat.href}
                      className="rounded-full border border-[#DDD6FE] bg-white/70 px-4 py-2 text-[13px] font-medium text-[#6B21A8] transition-colors hover:bg-[#F5F3FF] hover:border-[#8B5CF6]"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* ── SEO body ── */}
        {page.body_blocks && page.body_blocks.length > 0 ? (
          <section className="max-w-[820px] mx-auto px-6 lg:px-8 py-14 lg:py-20">
            {page.body_blocks.map((b, i) => renderBlock(b, i))}
          </section>
        ) : null}

        {/* ── FAQ (görsel accordion; JSON-LD route'ta üretiliyor → burada tekrar YOK) ── */}
        {faqItems.length > 0 ? (
          <section className="max-w-[820px] mx-auto px-6 lg:px-8 pb-16 lg:pb-20">
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

        {/* ── İç-linkleme: Diğer Koleksiyonlar (SEO Internal Linking — gerçek küratörlü veri) ── */}
        {otherCategories.length > 0 ? (
          <section className="border-t border-black/[0.04] bg-[#FAFAFA]">
            <div className="max-w-[1100px] mx-auto px-6 lg:px-8 py-14 lg:py-20">
              <p className="text-[10px] tracking-[0.3em] text-[#8B5CF6] uppercase font-bold mb-3">Keşfet</p>
              <h2
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
                className="text-2xl lg:text-3xl font-semibold text-[#111827] mb-8"
              >
                Diğer Koleksiyonlar
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {otherCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={cat.href}
                    className="group block rounded-2xl overflow-hidden bg-white border border-black/[0.05] transition-all hover:border-[#DDD6FE] hover:shadow-[0_8px_28px_rgba(139,92,246,0.10)]"
                  >
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-semibold text-[#111827] group-hover:text-[#8B5CF6] transition-colors">{cat.name}</p>
                      {cat.count ? <p className="text-xs text-[#9CA3AF] mt-0.5">{cat.count} ürün</p> : null}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── WhatsApp / Sipariş CTA ── */}
        <section className="bg-white">
          <div className="max-w-[1100px] mx-auto px-6 lg:px-8 py-14 lg:py-20">
            <div
              className="relative overflow-hidden rounded-[28px] px-8 py-14 lg:px-16 text-center"
              style={{
                background: "linear-gradient(135deg, #1E0845 0%, #4C1D95 30%, #7C3AED 65%, #9333EA 100%)",
                boxShadow: "0 30px 90px rgba(139,92,246,0.28)",
              }}
            >
              <p className="text-[10px] tracking-[0.28em] text-[#DDD6FE]/70 uppercase font-bold mb-5">Kişiye Özel Hizmet</p>
              <h2
                style={{ fontFamily: "var(--font-display)", lineHeight: 1.1, letterSpacing: "-0.02em" }}
                className="text-3xl lg:text-[42px] font-semibold text-white max-w-[640px] mx-auto mb-5"
              >
                Aradığınız aranjmanı bulamadınız mı?
              </h2>
              <p className="text-white/60 text-base max-w-[520px] mx-auto mb-10 leading-relaxed">
                Uzman tasarımcılarımız size özel aranjman hazırlasın. WhatsApp&apos;tan yazın, gerisini biz halledelim.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={WHATSAPP_URL}
                  className="flex items-center gap-3 bg-white text-[#7C3AED] px-9 py-4 rounded-full text-sm font-bold"
                  style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.22)" }}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp&apos;tan Sipariş Ver
                </a>
                <Link
                  href="/"
                  className="flex items-center gap-2 px-9 py-4 rounded-full text-white/90 text-sm font-semibold transition-colors"
                  style={{ border: "1.5px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.07)" }}
                >
                  Tüm Koleksiyonlar <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Breadcrumb JSON-LD (additive; mevcut schema ile çakışmaz) ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd(page.h1, path) }}
      />
    </>
  );
}
