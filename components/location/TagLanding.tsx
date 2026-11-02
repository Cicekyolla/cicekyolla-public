// ---------------------------------------------------------------------------
// İLÇE + ETİKET sayfası (Kadıköy pilotu: /kadikoy/orkideler). Server Component — JS yok.
// Karar ve veri sözleşmesi: lib/tagPage.ts. Vitrin mevcut listeleme motorundan (showcase bloğu,
// kaynak = kategori) gelir; /sayfa/N serisi ShowcaseGrid'in gerçek <a href> linkleriyle.
// Metin yalnız operatör içeriği (H1 / intro / body / SSS); uydurma konum metni üretilmez.
// ---------------------------------------------------------------------------
import Link from "next/link";
import { MapPin, MessageCircle, Sparkles } from "lucide-react";
import { ShowcaseGrid } from "@/components/location/ShowcaseGrid";
import { escapeJsonLdText } from "@/lib/jsonLdSafe";
import { absoluteUrl } from "@/lib/site-config";
import { tagBreadcrumbJsonLd, type TagPageInfo } from "@/lib/tagPage";
import type { CardProduct, SeoPublicPage } from "@/lib/api";

export function TagLanding({ page, path, tag, showcase, pageNumber }: {
  page: SeoPublicPage;
  path: string;
  tag: TagPageInfo;
  showcase: { items: CardProduct[]; totalPages: number } | null;
  pageNumber: number;
}) {
  const h1 = page.h1 || `${tag.districtName} ${tag.categoryName}`;
  const breadcrumbLd = tagBreadcrumbJsonLd(tag, h1, path, absoluteUrl);
  const textBlocks = pageNumber === 1 ? (page.body_blocks ?? []).filter((b) => (b.type === "paragraph" || b.type === "heading") && b.text) : [];
  return <main className="bg-[#fcfbfd] text-[#111827]">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: escapeJsonLdText(breadcrumbLd) }} />
    <section className="bg-white px-6 pb-14 pt-16 lg:px-14 lg:pb-20 lg:pt-24">
      <div className="mx-auto max-w-[1320px]">
        <nav aria-label="Sayfa yolu" className="flex flex-wrap items-center gap-2 text-sm text-[#746c80]">
          <Link href="/" className="hover:text-[#6d28d9]">Ana Sayfa</Link><span aria-hidden>›</span>
          <Link href={tag.pillarPath} className="hover:text-[#6d28d9]">{tag.districtName} Çiçekçi</Link><span aria-hidden>›</span>
          <span className="text-[#121827]">{h1}</span>
        </nav>
        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#c4b5fd]/30 bg-[#f4efff] px-5 py-2 text-xs font-bold uppercase tracking-[.18em] text-[#6d28d9]"><Sparkles className="h-4 w-4" /> {tag.sameDay ? "Aynı gün teslimat" : "1–3 iş günü kargo"} — {tag.districtName}</div>
        <h1 className="mt-8 max-w-4xl font-serif text-5xl font-semibold leading-[1.02] text-[#121827] md:text-6xl lg:text-7xl">{h1}</h1>
        {pageNumber === 1 && page.intro_html ? <div className="prose mt-8 max-w-3xl text-lg leading-8 text-[#667085]" dangerouslySetInnerHTML={{ __html: page.intro_html }} /> : null}
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href={tag.pillarPath} className="inline-flex items-center gap-2 rounded-full bg-[#8b5cf6] px-8 py-4 font-bold text-white shadow-[0_18px_45px_rgba(139,92,246,.28)]"><MapPin className="h-5 w-5" /> {tag.districtName} Çiçekçi</Link>
          <Link href="https://wa.me/905458813450" className="inline-flex items-center gap-3 rounded-full border border-[#e8e1f0] bg-white px-8 py-4 font-bold text-[#141020]"><MessageCircle className="h-5 w-5" /> WhatsApp'tan Sipariş</Link>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-[1320px] px-6 py-16 lg:px-14">
      <p className="text-xs font-bold uppercase tracking-[.24em] text-[#8b5cf6]">{tag.districtName} için</p>
      <h2 className="mt-3 font-serif text-4xl font-semibold text-[#140b20] md:text-5xl">{tag.categoryName}</h2>
      {showcase && showcase.items.length > 0
        ? <ShowcaseGrid items={showcase.items} basePath={path} page={pageNumber} totalPages={showcase.totalPages} />
        : <div className="mt-10 rounded-[24px] border border-[#ede9fe] bg-white p-8"><p className="text-[#746c80]">Bu seçkideki güncel ürünler koleksiyon sayfasında listeleniyor.</p></div>}
      <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm font-bold text-[#6d28d9]">
        <Link href={tag.categoryPath} className="hover:underline">Tüm {tag.categoryName}</Link>
        <Link href={tag.pillarPath} className="hover:underline">{tag.districtName} Çiçek Siparişi</Link>
      </div>
    </section>

    {textBlocks.length > 0 ? <section className="bg-white px-6 py-16 lg:px-14"><div className="mx-auto max-w-[1320px] space-y-6 text-lg leading-8 text-[#4b5563]">{textBlocks.map((b, i) => b.type === "heading" ? <h2 key={i} className="font-serif text-3xl font-semibold text-[#140b20]">{b.text}</h2> : <p key={i}>{b.text}</p>)}</div></section> : null}

    {pageNumber === 1 && page.faq && page.faq.length > 0 ? <section className="bg-gradient-to-b from-[#f7f5fc] to-white px-6 py-16 lg:px-14"><div className="mx-auto max-w-[1320px]"><h2 className="mb-10 text-center font-serif text-4xl font-semibold text-[#140b20]">Sıkça Sorulan Sorular</h2><div className="grid gap-6 md:grid-cols-2">{page.faq.map((item, i) => item.q && item.a ? <div key={i} className="rounded-[20px] border border-[#ebe7f2] bg-white p-8 shadow-sm"><h3 className="font-semibold text-[#140b20]">{item.q}</h3><p className="mt-4 text-[#667085]">{item.a}</p></div> : null)}</div></div></section> : null}
  </main>;
}
