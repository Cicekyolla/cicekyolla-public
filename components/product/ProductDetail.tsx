"use client";

/**
 * ProductDetail — Public premium ürün detay sayfası.
 * CTO Decision: Admin Ürün Merkezi → API → DB → BURASI → müşteri.
 * Veri gerçek backend'den (fetchProductBySlug) gelir; mock/hardcode YOK.
 * Tasarım: Aesop/Net-A-Porter seviyesi, mevcut public tasarım diliyle (Tailwind v4,
 * lilac/purple, premium kartlar, soft shadow, mikro animasyon). Header/Footer
 * layout'tan gelir (DEĞİŞMEZ).
 */

import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, ShoppingBag, Truck, Zap, Sparkles, Star, ShieldCheck, ChevronRight } from "lucide-react";
import { formatMinorTRY, type PublicProductDetail, type PublicProductImage } from "@/lib/api";

const WHATSAPP = "905074413474";

const TYPE_LABEL: Record<string, string> = {
  flower: "Çiçek", plant: "Bitki", wreath: "Çelenk", artificial: "Yapay", gift: "Hediye", service: "Hizmet",
};
const SCOPE_LABEL: Record<string, string> = { istanbul: "İstanbul", turkiye: "Türkiye geneli", regional: "Bölgesel" };

function isVideo(url: string): boolean {
  return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url);
}

/**
 * Ürün açıklaması HTML'ini güvenli + premium sunuma hazırlar.
 * SSR-güvenli, bağımlılıksız (saf regex). Tehlikeli/istenmeyen etiketleri ve
 * satır-içi stilleri temizler, blok içerik barındıran sahte başlıkları düz bloğa
 * indirir ve baştaki tekrar "Ürün Açıklaması" başlığını kaldırır.
 */
function sanitizeProductHtml(html: string): string {
  let s = html;
  // Tehlikeli/istenmeyen bloklar (içerikle birlikte kaldırılır)
  s = s.replace(/<(script|style|iframe|object|embed|form|button|svg|message)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  // Etiketi kaldır, metni koru
  s = s.replace(/<\/?(script|style|iframe|object|embed|form|button|input|img|svg|path|link|meta|font|o|section)\b[^>]*>/gi, "");
  // Olay işleyicileri + sunuma karışan attribute'lar (tipografiyi biz veriyoruz)
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/\s(style|class|id|dir|tabindex|role|data-[\w-]+|width|height|align|face|color)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // Blok içerik barındıran sahte başlıkları düz bloğa indir (nested için 2 geçiş)
  for (let i = 0; i < 2; i++) s = s.replace(/<h([1-6])[^>]*>([\s\S]*?<(?:p|ul|ol|div|br)[\s\S]*?)<\/h\1>/gi, "<div>$2</div>");
  // Boş kalıntıları temizle
  s = s.replace(/<span>\s*<\/span>/gi, "").replace(/<div>\s*<\/div>/gi, "");
  // Baştaki tekrar başlık (çift "Ürün Açıklaması" önler)
  s = s.replace(/^\s*<h[1-6][^>]*>\s*Ürün\s+Açıklaması\s*<\/h[1-6]>/i, "");
  return s.trim();
}

export function ProductDetail({ data }: { data: PublicProductDetail }) {
  const { product, images, variants } = data;
  const gallery: PublicProductImage[] = [...images].sort((a, b) => {
    if (a.role === "cover") return -1;
    if (b.role === "cover") return 1;
    return a.sort_order - b.sort_order;
  });
  const [active, setActive] = useState(0);
  const [wish, setWish] = useState(false);
  const [variantId, setVariantId] = useState<number | null>(variants[0]?.id ?? null);

  const sel = variants.find((v) => v.id === variantId) ?? null;
  const basePrice = sel?.price_minor ?? product.price_minor;
  const salePrice = sel?.sale_price_minor ?? product.sale_price_minor;
  const hasSale = salePrice != null && Number(salePrice) > 0 && Number(salePrice) < Number(basePrice);
  const shown = hasSale ? salePrice : basePrice;
  const discountPct = hasSale ? Math.round((1 - Number(salePrice) / Number(basePrice)) * 100) : 0;

  const waText = encodeURIComponent(
    `Merhaba, "${product.name}" ürününü sipariş vermek istiyorum. ${typeof window !== "undefined" ? window.location.href : ""}`,
  );

  const cover = gallery[active];

  return (
    <main className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 pt-6">
        <nav className="flex items-center gap-1.5 text-[12px] text-[#9CA3AF]">
          <Link href="/" className="hover:text-[#7C3AED] transition-colors">Ana Sayfa</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#6B7280]">{TYPE_LABEL[product.product_type] ?? "Ürün"}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#111827] font-medium truncate max-w-[220px]">{product.name}</span>
        </nav>
      </div>

      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        {/* GALERİ */}
        <div>
          <div className="relative overflow-hidden rounded-[24px] bg-[#F3F4F6]" style={{ aspectRatio: "4/5" }}>
            {gallery.length > 0 ? (
              isVideo(cover.url) ? (
                <video src={cover.url} controls className="w-full h-full object-cover" />
              ) : (
                <img src={cover.url} alt={cover.alt ?? product.name} className="w-full h-full object-cover" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#C4B5FD]">
                <Sparkles className="w-10 h-10" />
              </div>
            )}
            {/* Badge'ler */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {hasSale && (
                <span className="px-3 py-1.5 rounded-full bg-[#DC2626] text-white text-[11px] font-bold tracking-wider">%{discountPct} İNDİRİM</span>
              )}
              {product.is_bestseller && (
                <span className="px-3 py-1.5 rounded-full bg-[#F59E0B] text-white text-[11px] font-bold tracking-wider">ÇOK SATAN</span>
              )}
              {product.is_new && (
                <span className="px-3 py-1.5 rounded-full bg-[#7C3AED] text-white text-[11px] font-bold tracking-wider">YENİ</span>
              )}
            </div>
            <button
              onClick={() => setWish((w) => !w)}
              aria-label="Favorilere ekle"
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center transition-all hover:scale-110"
            >
              <Heart className={`w-5 h-5 transition-colors ${wish ? "fill-[#DC2626] text-[#DC2626]" : "text-[#6B7280]"}`} />
            </button>
          </div>

          {/* Küçük görseller */}
          {gallery.length > 1 && (
            <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
              {gallery.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActive(i)}
                  className={`relative w-[72px] h-[72px] rounded-[14px] overflow-hidden flex-shrink-0 transition-all ${i === active ? "ring-2 ring-[#7C3AED]" : "ring-1 ring-[#E5E7EB] opacity-70 hover:opacity-100"}`}
                >
                  {isVideo(img.url)
                    ? <video src={img.url} muted className="w-full h-full object-cover" />
                    : <img src={img.url} alt={img.alt ?? ""} className="w-full h-full object-cover" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* BİLGİ */}
        <div>
          <h1 className="text-[28px] md:text-[34px] font-bold text-[#111827] leading-tight tracking-tight">{product.name}</h1>

          {product.short_description && (
            <p className="mt-3 text-[15px] text-[#6B7280] leading-relaxed">{product.short_description}</p>
          )}

          {/* Fiyat */}
          <div className="mt-6 flex items-end gap-3">
            <span className="text-[32px] font-bold text-[#111827]">{formatMinorTRY(shown)}</span>
            {hasSale && (
              <span className="text-[18px] text-[#C4B5FD] line-through font-medium mb-1">{formatMinorTRY(basePrice)}</span>
            )}
          </div>

          {/* Teslimat rozetleri */}
          <div className="mt-5 flex flex-wrap gap-2.5">
            {product.same_day_available && (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F3FF] text-[#7C3AED] text-[12.5px] font-semibold">
                <Zap className="w-4 h-4" /> Aynı gün teslimat
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F9FAFB] text-[#6B7280] text-[12.5px] font-semibold border border-[#F3F4F6]">
              <Truck className="w-4 h-4" /> {SCOPE_LABEL[product.delivery_scope] ?? "Teslimat"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F9FAFB] text-[#6B7280] text-[12.5px] font-semibold border border-[#F3F4F6]">
              <ShieldCheck className="w-4 h-4" /> Taze &amp; güvenli teslimat
            </span>
          </div>

          {/* Varyantlar */}
          {variants.length > 0 && (
            <div className="mt-7">
              <div className="text-[12px] font-bold text-[#9CA3AF] tracking-wider mb-3">SEÇENEK</div>
              <div className="flex flex-wrap gap-2.5">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariantId(v.id)}
                    className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${variantId === v.id ? "bg-[#7C3AED] text-white shadow-[0_2px_10px_rgba(124,58,237,0.3)]" : "bg-white text-[#374151] border border-[#E5E7EB] hover:border-[#7C3AED]"}`}
                  >
                    {v.title}
                    {v.price_minor != null && (
                      <span className="ml-2 opacity-70">{formatMinorTRY(v.price_minor)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link href={`/hizli-siparis?product=${encodeURIComponent(product.slug)}`} className="flex-1 flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-[#111827] text-white text-[15px] font-bold transition-all hover:bg-[#000] hover:scale-[1.01]">
              <ShoppingBag className="w-5 h-5" /> Hemen Sipariş Ver
            </Link>
            <a
              href={`https://wa.me/${WHATSAPP}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-[#25D366] text-white text-[15px] font-bold transition-all hover:brightness-105 hover:scale-[1.01]"
            >
              <MessageCircle className="w-5 h-5" /> WhatsApp ile Sipariş
            </a>
          </div>

          {/* Güven şeridi */}
          <div className="mt-6 flex items-center gap-4 text-[12px] text-[#9CA3AF]">
            <span className="inline-flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" /> Premium kalite</span>
            <span>·</span>
            <span>El yapımı aranjman</span>
            <span>·</span>
            <span>Fotoğrafla teslimat</span>
          </div>

          {/* Uzun açıklama */}
          {product.long_description && (
            <div className="mt-9 pt-8 border-t border-[#F3F4F6]">
              <h2 className="text-[16px] font-bold text-[#111827] mb-3">Ürün Açıklaması</h2>
              <div
                className="text-[15px] text-[#4B5563] leading-[1.85] [&_p]:mb-4 [&_p:last-child]:mb-0 [&_h1]:text-[20px] [&_h1]:font-bold [&_h1]:text-[#111827] [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:text-[#111827] [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-[16px] [&_h3]:font-semibold [&_h3]:text-[#1F2937] [&_h3]:mt-5 [&_h3]:mb-2 [&_h4]:text-[15px] [&_h4]:font-semibold [&_h4]:text-[#1F2937] [&_h4]:mt-4 [&_h4]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-1.5 [&_li]:leading-relaxed [&_li]:marker:text-[#C4B5FD] [&_strong]:text-[#111827] [&_strong]:font-semibold [&_b]:text-[#111827] [&_b]:font-semibold [&_em]:italic [&_a]:text-[#8B5CF6] [&_a]:font-medium hover:[&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#DDD6FE] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#6B7280] [&_blockquote]:my-4 [&_hr]:my-6 [&_hr]:border-[#F3F4F6] [&_img]:hidden"
                dangerouslySetInnerHTML={{ __html: sanitizeProductHtml(product.long_description) }}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
