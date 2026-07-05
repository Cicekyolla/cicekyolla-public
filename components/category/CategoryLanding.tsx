import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { fetchProductsPaged, toCardProduct, type SeoPublicPage, type BodyBlock } from "@/lib/api";
import { getCategoryTree } from "@/lib/categories";
import {
  mapTreeToItems,
  getBreadcrumbTrailFromTree,
  findCategoryIdBySlug,
  findCategoryNodeBySlug,
} from "@/lib/catalog";
import { ProductCard } from "@/components/home/ProductCard";
import { FloatingCategoryRail } from "@/components/home/FloatingCategoryRail";

/**
 * §Category Landing (Yol A — SEO-Content). Parça 1 (iskelet) + Parça 2 (iç-linkleme + CTA).
 * Kaynak: fetchSeoPage(path) → SeoPublicPage (h1, intro_html, body_blocks, faq).
 * ÜRÜN GRID YOK, SAHTE VERİ YOK, BACKEND'E DOKUNULMAZ. Server component (SEO-first SSR).
 *
 * İç-linkleme (SEO Internal Linking) YALNIZCA backend'in Category Center'dan ürettiği SEO içeriğinden
 * gelir (intro_html / body_blocks içindeki anchor linkler). Hardcoded kategori listesi YOK, seed YOK,
 * ağaç çoğaltılmaz — Category Center tek gerçek kaynaktır. WhatsApp: sabit doğru link (905074413474).
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

/** BreadcrumbList JSON-LD — ADDITIVE. Backend schema_jsonld'a DOKUNMAZ; ayrı <script>.
 *  trail (canlı ağaç ata zinciri) varsa çok seviyeli; yoksa 2 seviyeli fallback. */
function breadcrumbJsonLd(
  h1: string,
  path: string,
  trail: { name: string; slug: string }[]
): string {
  const itemListElement = trail.length
    ? [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: SITE_URL + "/" },
        ...trail.map((t, i) => ({
          "@type": "ListItem",
          position: i + 2,
          name: t.name,
          item: `${SITE_URL}/kategori/${t.slug}`,
        })),
      ]
    : [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: SITE_URL + "/" },
        { "@type": "ListItem", position: 2, name: h1, item: SITE_URL + path },
      ];
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  });
}

export async function CategoryLanding({ page, path, searchParams }: { page: SeoPublicPage; path: string; searchParams?: { [k: string]: string | string[] | undefined } }) {
  const faqItems = (page.faq ?? []).filter((f) => f.q && f.a);

  // TEK KAYNAK = canlı Category Center ağacı (fetchCategoryTree). Env path yoksa
  // veya okuma başarısızsa → mevcut catalog'a güvenli fallback (UI birebir aynı).
  const tree = await getCategoryTree();
  const slug = path.replace(/^\/kategori\//, "").replace(/\/+$/, "");

  // İç-linkleme (Related): canlı ağaçtan; yetersizse catalog.
  const liveItems = tree ? mapTreeToItems(tree) : [];
  const pool = liveItems; // TEK KAYNAK: yalnız canlı ağaç; hardcoded/fallback YOK
  const related = pool.filter((c) => c.href !== path).slice(0, 8);

  // Breadcrumb: parent-child ağaçtan türetilir; yoksa 2 seviyeli fallback.
  const trail = tree ? getBreadcrumbTrailFromTree(tree, slug) : [];

  // ── KATEGORİ ÜRÜNLERİ (canlı katalog + sıralama + sayfalama) ──
  // Admin Ürün Merkezi > Kapsam/Kategori → API → DB → BURASI → müşteri.
  // slug → category_id → /api/products?category_id=&status=active&sort=&page=.
  // Kayıt yoksa/kategori id çözülmezse grid gizlenir (mock YOK, regresyon YOK).
  const SORTS = [
    { key: "created_at_desc", label: "En Yeni" },
    { key: "price_asc", label: "Artan Fiyat" },
    { key: "price_desc", label: "Azalan Fiyat" },
    { key: "name_asc", label: "A → Z" },
  ] as const;
  const sortParam = typeof searchParams?.sort === "string" ? searchParams.sort : "created_at_desc";
  const sort = (SORTS.find((s) => s.key === sortParam)?.key ?? "created_at_desc") as typeof SORTS[number]["key"];
  const pageNum = Math.max(1, Number(typeof searchParams?.page === "string" ? searchParams.page : 1) || 1);

  const categoryId = tree ? findCategoryIdBySlug(tree, slug) : null;
  // Kategori-içi alt kategori slider'ı (Çiçeksepeti deseni): mevcut kategorinin
  // DOĞRUDAN children'ı → yuvarlak koleksiyon kartları (≤50). Canlı ağaç, uydurma yok.
  const currentNode = tree ? findCategoryNodeBySlug(tree, slug) : null;
  const subItems = currentNode?.children
    ? mapTreeToItems(currentNode.children as Parameters<typeof mapTreeToItems>[0]).slice(0, 50)
    : [];
  const productPage = categoryId
    ? await fetchProductsPaged({ category_id: categoryId, page_size: 12, page: pageNum, sort })
    : null;
  const products = (productPage?.items ?? []).filter((p) => p.cover_image_url).map(toCardProduct);
  const totalPages = productPage?.pagination.total_pages ?? 1;
  const totalProducts = productPage?.pagination.total ?? 0;
  const buildHref = (p: { sort?: string; page?: number }) => {
    const sp = new URLSearchParams();
    const s = p.sort ?? sort;
    const pg = p.page ?? 1;
    if (s !== "created_at_desc") sp.set("sort", s);
    if (pg > 1) sp.set("page", String(pg));
    const qs = sp.toString();
    return qs ? `${path}?${qs}` : path;
  };

  return (
    <>
      <main className="bg-white">
        {/* ── Premium hero band (lilac) ── */}
        <section
          aria-label="Koleksiyon başlığı"
          className="border-b border-black/[0.04]"
          style={{ background: "linear-gradient(180deg, #FAFAFA 0%, #F5F3FF 100%)" }}
        >
          <div className="max-w-[1100px] mx-auto px-6 lg:px-8 pt-10 pb-14 lg:pt-14 lg:pb-20">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-8">
              <Link href="/" className="hover:text-[#8B5CF6] transition-colors">Ana Sayfa</Link>
              {trail.length ? (
                trail.map((t, i) => (
                  <span key={t.slug} className="flex items-center gap-2">
                    <span aria-hidden="true">/</span>
                    {i === trail.length - 1 ? (
                      <span className="text-[#374151] font-medium">{t.name}</span>
                    ) : (
                      <Link href={`/kategori/${t.slug}`} className="hover:text-[#8B5CF6] transition-colors">
                        {t.name}
                      </Link>
                    )}
                  </span>
                ))
              ) : (
                <>
                  <span aria-hidden="true">/</span>
                  <span className="text-[#374151] font-medium">{page.h1}</span>
                </>
              )}
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

        {/* ── Alt Kategori Slider (Çiçeksepeti deseni): mevcut kategorinin children'ı ── */}
        {subItems.length > 0 ? (
          <section aria-label="Alt kategoriler" className="max-w-[1440px] mx-auto pt-8 lg:pt-10">
            <FloatingCategoryRail items={subItems} variant="light" label={`${page.h1} Kategorileri`} />
          </section>
        ) : null}

        {/* ── Kategori Ürünleri (canlı katalog → /urun/{slug}) ── */}
        {products.length > 0 ? (
          <section aria-label="Bu kategorideki ürünler" className="max-w-[1440px] mx-auto px-6 lg:px-14 py-14 lg:py-20">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
              <div>
                <p className="text-[10px] tracking-[0.3em] text-[#8B5CF6] uppercase font-bold mb-3">Ürünler</p>
                <h2
                  style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
                  className="text-2xl lg:text-3xl font-semibold text-[#111827]"
                >
                  Bu Koleksiyondaki Ürünler
                  {totalProducts > 0 ? <span className="ml-2 text-base font-normal text-[#9CA3AF]">({totalProducts})</span> : null}
                </h2>
              </div>
              {/* Sıralama */}
              <div className="flex flex-wrap items-center gap-2">
                {SORTS.map((s) => (
                  <Link
                    key={s.key}
                    href={buildHref({ sort: s.key, page: 1 })}
                    scroll={false}
                    className={`px-3.5 py-2 rounded-full text-[12.5px] font-semibold transition-colors ${sort === s.key ? "bg-[#7C3AED] text-white" : "bg-white text-[#6B7280] border border-[#E5E7EB] hover:border-[#DDD6FE]"}`}
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7">
              {products.map((product, idx) => (
                <ProductCard key={product.id} product={product} idx={idx} />
              ))}
            </div>
            {/* Sayfalama */}
            {totalPages > 1 ? (
              <nav aria-label="Sayfalama" className="flex items-center justify-center gap-2 mt-12">
                {pageNum > 1 ? (
                  <Link href={buildHref({ page: pageNum - 1 })} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#374151] bg-white border border-[#E5E7EB] hover:border-[#DDD6FE] transition-colors">
                    ← Önceki
                  </Link>
                ) : null}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - pageNum) <= 1)
                  .map((n, i, arr) => (
                    <span key={n} className="flex items-center gap-2">
                      {i > 0 && arr[i - 1] !== n - 1 ? <span className="text-[#C4B5FD]">…</span> : null}
                      <Link
                        href={buildHref({ page: n })}
                        aria-current={n === pageNum ? "page" : undefined}
                        className={`min-w-[40px] text-center px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${n === pageNum ? "bg-[#7C3AED] text-white" : "bg-white text-[#374151] border border-[#E5E7EB] hover:border-[#DDD6FE]"}`}
                      >
                        {n}
                      </Link>
                    </span>
                  ))}
                {pageNum < totalPages ? (
                  <Link href={buildHref({ page: pageNum + 1 })} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#374151] bg-white border border-[#E5E7EB] hover:border-[#DDD6FE] transition-colors">
                    Sonraki →
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </section>
        ) : null}

        {/* ── SEO body ── */}
        {page.body_blocks && page.body_blocks.length > 0 ? (
          <section aria-label="Koleksiyon içeriği" className="max-w-[820px] mx-auto px-6 lg:px-8 py-14 lg:py-20">
            {page.body_blocks.map((b, i) => renderBlock(b, i))}
          </section>
        ) : null}

        {/* ── FAQ (görsel accordion; JSON-LD route'ta üretiliyor → burada tekrar YOK) ── */}
        {faqItems.length > 0 ? (
          <section aria-label="Sıkça sorulan sorular" className="max-w-[820px] mx-auto px-6 lg:px-8 pb-16 lg:pb-20">
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

        {/* ── İlgili Koleksiyonlar (İç-linkleme — TEK kaynak: @/lib/catalog) ── */}
        {related.length > 0 ? (
          <section aria-label="İlgili koleksiyonlar" className="border-t border-black/[0.04] bg-[#FAFAFA]">
            <div className="max-w-[1100px] mx-auto px-6 lg:px-8 py-14 lg:py-20">
              <p className="text-[10px] tracking-[0.3em] text-[#8B5CF6] uppercase font-bold mb-3">Keşfet</p>
              <h2
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
                className="text-2xl lg:text-3xl font-semibold text-[#111827] mb-8"
              >
                İlgili Koleksiyonlar
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {related.map((cat) => (
                  <Link
                    key={cat.id}
                    href={cat.href}
                    className="group block rounded-2xl overflow-hidden bg-white border border-black/[0.05] transition-all hover:border-[#DDD6FE] hover:shadow-[0_8px_28px_rgba(139,92,246,0.10)]"
                  >
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={cat.image}
                        alt={cat.name}
                        loading="lazy"
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
        <section aria-label="Sipariş çağrısı" className="bg-white">
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
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp'tan sipariş ver (yeni sekmede açılır)"
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
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd(page.h1, path, trail) }}
      />
    </>
  );
}
