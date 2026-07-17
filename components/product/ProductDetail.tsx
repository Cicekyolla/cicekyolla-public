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
import { Heart, MessageCircle, ShoppingBag, Truck, Zap, Sparkles, Star, ShieldCheck, ChevronRight, Ruler, Package, Leaf, Gift, Info, MapPin, Clock, Camera, Check, ZoomIn, type LucideIcon } from "lucide-react";
import { formatMinorTRY, type PublicProductDetail, type PublicProductImage } from "@/lib/api";
import galleryMapJson from "@/lib/gallery-map.json";

/** Ürün slug'ı → yaşam alanı galeri görselleri (/galeri/...).
 *  KURAL: Kapak her zaman beyaz stüdyo kalır; bu görseller yalnızca
 *  galerinin sonuna eklenir (additive, geri alınabilir). */
const LIFESTYLE_GALLERY: Record<string, string[]> = galleryMapJson as Record<string, string[]>;
import { ProductImage } from "@/components/product/ProductImage";
import Lightbox, { type LightboxItem } from "@/components/product/Lightbox";
import DeliveryPlanner from "@/components/product/DeliveryPlanner";
import { ProductTrustPanel } from "@/components/product/ProductTrustPanel";
import { savePendingDelivery } from "@/lib/pendingDelivery";

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
  // Sahte başlıkları (uzun metin veya blok içeren) düz bloğa indir — gerçek kısa başlıkları KORUR.
  // Callback ile başlık-başına işlenir; başlıklar arasına taşmaz.
  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (full, _lvl, inner) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    return text.length > 90 || /<(?:p|ul|ol|div|br)\b/i.test(inner) ? `<div>${inner}</div>` : full;
  });
  // Boş kalıntıları temizle
  s = s.replace(/<span>\s*<\/span>/gi, "").replace(/<div>\s*<\/div>/gi, "");
  // Baştaki tekrar başlık (çift "Ürün Açıklaması" önler)
  s = s.replace(/^\s*<h[1-6][^>]*>\s*Ürün\s+Açıklaması\s*<\/h[1-6]>/i, "");
  return s.trim();
}

// Açıklama gövdesi için premium tipografi (intro + accordion içleri paylaşır).
const DESC_PROSE =
  "text-[15px] text-[#4B5563] leading-[1.85] [&_p]:mb-4 [&_p:last-child]:mb-0 " +
  "[&_h1]:text-[18px] [&_h1]:font-bold [&_h1]:text-[#111827] [&_h1]:mt-5 [&_h1]:mb-2 " +
  "[&_h2]:text-[16px] [&_h2]:font-bold [&_h2]:text-[#111827] [&_h2]:mt-5 [&_h2]:mb-2 " +
  "[&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-[#1F2937] [&_h3]:mt-4 [&_h3]:mb-2 " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-1.5 " +
  "[&_li]:leading-relaxed [&_li]:marker:text-[#C4B5FD] [&_strong]:text-[#111827] [&_strong]:font-semibold " +
  "[&_b]:text-[#111827] [&_b]:font-semibold [&_em]:italic [&_a]:text-[#8B5CF6] [&_a]:font-medium hover:[&_a]:underline " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-[#DDD6FE] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#6B7280] [&_blockquote]:my-4 " +
  "[&_hr]:my-5 [&_hr]:border-[#F3F4F6] [&_img]:hidden";

type DescSection = { title: string | null; html: string; isIntro: boolean };

// Uzun açıklamayı başlıklara göre bölümlere ayırır (intro + accordion bölümleri).
// SEO: içerik DOM'da kalır; başlıklar korunur; native <details> Google tarafından okunur.
function parseDescriptionSections(raw: string): DescSection[] {
  const clean = sanitizeProductHtml(raw);
  if (!clean) return [];
  const re = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  const heads: { title: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) {
    const title = m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
    heads.push({ title, start: m.index, end: re.lastIndex });
  }
  if (!heads.length) return [{ title: null, html: clean, isIntro: true }];
  const out: DescSection[] = [];
  const intro = clean.slice(0, heads[0].start).trim();
  if (intro) out.push({ title: null, html: intro, isIntro: true });
  for (let i = 0; i < heads.length; i++) {
    const body = clean.slice(heads[i].end, i + 1 < heads.length ? heads[i + 1].start : clean.length).trim();
    if (!body && !heads[i].title) continue;
    out.push({ title: heads[i].title || "Detay", html: body, isIntro: false });
  }
  return out;
}

// Bölüm başlığına göre ikon seçer (gerçek özelliğe göre, uydurma yok).
function sectionIcon(title: string): LucideIcon {
  const t = (title || "").toLocaleLowerCase("tr");
  if (/(boyut|ölçü|ebat|\bcm\b|yükseklik|genişlik|ürün boyu)/.test(t)) return Ruler;
  if (/(malzeme|içerik|içindeki|kullanıl|adet)/.test(t)) return Package;
  if (/(bakım|saklama|ömür|taze|sula|canlı)/.test(t)) return Leaf;
  if (/(teslim|kargo|gönderi|sipariş)/.test(t)) return Truck;
  if (/(hediye|not|mesaj|kart)/.test(t)) return Gift;
  if (/(açıklama|hakkında|anlam|hikaye|özel)/.test(t)) return Sparkles;
  return Info;
}

export type AutoSizeProduct = {
  id: number;
  name: string;
  slug: string;
  image: string;
  price: number;
  derivatives?: PublicProductImage["derivatives"];
  blurhash?: string | null;
};

export function ProductDetail({
  data,
  sizeProducts = [],
}: {
  data: PublicProductDetail;
  sizeProducts?: AutoSizeProduct[];
}) {
  const { product, images, variants } = data;
  const sortedImages: PublicProductImage[] = [...images].sort((a, b) => {
    if (a.role === "cover") return -1;
    if (b.role === "cover") return 1;
    return a.sort_order - b.sort_order;
  });
  // Yaşam alanı kareleri galerinin SONUNA eklenir; kapak (beyaz stüdyo) hep ilk görsel kalır.
  const lifestyleExtras: PublicProductImage[] = (LIFESTYLE_GALLERY[product.slug] ?? []).map((url, i) => ({
    id: -(i + 1),
    url,
    alt: `${product.name} — yaşam alanında`,
    role: "gallery",
    sort_order: 100 + i,
  }));
  const gallery: PublicProductImage[] = [...sortedImages, ...lifestyleExtras];
  const [active, setActive] = useState(0);
  const [wish, setWish] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [infoTab, setInfoTab] = useState<"description" | "details" | "delivery">("description");

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
  const productIntroSource = (product.short_description || product.long_description || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '\"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  const productIntro = productIntroSource.length > 170
    ? `${productIntroSource.slice(0, 167).replace(/\s+\S*$/, "")}…`
    : productIntroSource;

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
          <div
            className={`relative overflow-hidden rounded-[24px] bg-white ring-1 ring-[#F1F0F5] ${gallery.length > 0 && !isVideo(cover.url) ? "cursor-zoom-in" : ""}`}
            style={{ aspectRatio: "4/5" }}
            onClick={() => { if (gallery.length > 0 && !isVideo(cover.url)) setLightboxOpen(true); }}
          >
            {gallery.length > 0 ? (
              isVideo(cover.url) ? (
                <video
                  src={cover.url}
                  controls
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <ProductImage src={cover.url} alt={cover.alt ?? product.name} priority padding="16px" derivatives={cover.derivatives} blurhash={cover.blurhash} sizes="(max-width:1024px) 100vw, 50vw" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#C4B5FD]">
                <Sparkles className="w-10 h-10" />
              </div>
            )}
            {/* Büyüt ipucu (dokun → tam ekran) */}
            {gallery.length > 0 && !isVideo(cover.url) ? (
              <div className="absolute bottom-4 right-4 z-[2] w-9 h-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center shadow-md pointer-events-none">
                <ZoomIn className="w-4 h-4 text-[#6B7280]" />
              </div>
            ) : null}
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
              onClick={(e) => { e.stopPropagation(); setWish((w) => !w); }}
              aria-label="Favorilere ekle"
              className="absolute top-4 right-4 z-[2] w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center transition-all hover:scale-110"
            >
              <Heart className={`w-5 h-5 transition-colors ${wish ? "fill-[#DC2626] text-[#DC2626]" : "text-[#6B7280]"}`} />
            </button>
          </div>

          {/* Tam ekran büyütme (dokun → zoom/lightbox) */}
          {lightboxOpen && gallery.length > 0 ? (
            <Lightbox
              items={gallery.map((im): LightboxItem => ({ url: im.url, alt: im.alt, isVideo: isVideo(im.url) }))}
              index={active}
              onIndexChange={setActive}
              onClose={() => setLightboxOpen(false)}
            />
          ) : null}

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
                    ? <video src={img.url} muted draggable={false} onContextMenu={(e) => e.preventDefault()} className="w-full h-full object-contain bg-white p-1.5" />
                    : <ProductImage src={img.url} alt={img.alt ?? ""} padding="6px" protect={false} />}
                </button>
              ))}
            </div>
          )}

          {/* Masaüstünde ürün görselinin altındaki doğal boşluğu dolduran additive güven alanı. */}
          <ProductTrustPanel />
        </div>

        {/* BİLGİ */}
        <div>
          <h1 className="text-[28px] md:text-[34px] font-bold text-[#111827] leading-tight tracking-tight">{product.name}</h1>

          {productIntro && (
            <p className="mt-3 max-w-2xl text-[15px] leading-[1.75] text-[#6B7280]">{productIntro}</p>
          )}

          {/* Fiyat */}
          <div className="mt-6 flex items-end gap-3">
            <span className="text-[32px] font-bold text-[#111827]">{formatMinorTRY(shown)}</span>
            {hasSale && (
              <span className="text-[18px] text-[#C4B5FD] line-through font-medium mb-1">{formatMinorTRY(basePrice)}</span>
            )}
          </div>

          {/* Otomatik boyut önerileri — üç ayrı gerçek ürün; sahte varyant ve sahte fiyat YOK */}
          {sizeProducts.length >= 3 && (
            <section aria-labelledby="auto-size-title" className="mt-7">
              <h2 id="auto-size-title" className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#8B5CF6]">
                Boyut Seçin
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {sizeProducts.slice(0, 3).map((item, index) => {
                  const labels = [
                    ["Küçük", "Standart"],
                    ["Orta", "Premium"],
                    ["Büyük", "Deluxe"],
                  ] as const;
                  const [label, tier] = labels[index];
                  return (
                    <Link
                      key={item.id}
                      href={`/urun/${item.slug}`}
                      aria-label={`${label}: ${item.name}, ₺${item.price}`}
                      className={`group overflow-hidden rounded-[18px] border bg-white transition duration-200 hover:-translate-y-0.5 hover:border-[#8B5CF6] hover:shadow-[0_10px_26px_rgba(124,58,237,0.12)] ${
                        index === 1 ? "border-[#8B5CF6] bg-[#F8F5FF] shadow-[0_7px_20px_rgba(124,58,237,0.10)]" : "border-[#EDE9FE]"
                      }`}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-white">
                        <ProductImage
                          src={item.image}
                          alt={item.name}
                          padding="8px"
                          derivatives={item.derivatives}
                          blurhash={item.blurhash}
                          sizes="(max-width:640px) 100vw, 180px"
                        />
                      </div>
                      <div className="border-t border-[#F1EEFA] px-3.5 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[14px] font-bold text-[#111827]">{label}</p>
                            <p className="text-[11px] text-[#9CA3AF]">{tier}</p>
                          </div>
                          <p className={`text-[15px] font-bold ${index === 1 ? "text-[#7C3AED]" : "text-[#111827]"}`}>₺{item.price}</p>
                        </div>
                        <p
                          className="mt-2 text-[11px] font-medium leading-[1.45] text-[#4B5563]"
                          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                        >
                          {item.name}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <p className="mt-2.5 text-[10.5px] leading-relaxed text-[#9CA3AF]">
                Her seçenek ayrı bir gerçek üründür. Seçtiğinizde ilgili ürün sayfası açılır.
              </p>
            </section>
          )}

          {/* Teslimat planlayıcı — adres + 30 gün takvim + banda endeksli slot (Delivery Engine V2) */}
          <DeliveryPlanner
            product={{
              id: product.id,
              product_type: product.product_type,
              same_day_available: product.same_day_available,
              delivery_scope: product.delivery_scope,
              categoryId: data.categories?.find((c) => c.is_primary)?.category_id ?? data.categories?.[0]?.category_id ?? null,
            }}
            onSelect={(sel) =>
              savePendingDelivery({
                productSlug: product.slug,
                productName: product.name,
                categoryId: data.categories?.find((c) => c.is_primary)?.category_id ?? data.categories?.[0]?.category_id ?? null,
                date: sel.date,
                mode: sel.mode,
                slotId: sel.slot?.id ?? null,
                slotLabel: sel.slot?.label,
                slotStart: sel.slot?.start_time,
                slotEnd: sel.slot?.end_time,
                slotFeeMinor: sel.slot?.extra_fee_minor ?? null,
                address: sel.address.formattedAddress,
                placeName: sel.address.placeName ?? null,
                neighborhood: sel.address.mahalle ?? null,
                district: sel.address.ilce ?? undefined,
                city: sel.address.il ?? undefined,
                placeId: sel.address.placeId ?? null,
                lat: sel.address.lat ?? null,
                lng: sel.address.lng ?? null,
                band: sel.band ?? null,
              })
            }
          />

          {/* Varyantlar */}
          {variants.length > 0 && (
            <div className="mt-6">
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

          {/* CTA — ana buton CICEKYOLLA mor; WhatsApp yeşil; favori */}
          <div className="mt-7 flex gap-3">
            <Link
              href={`/hizli-siparis?product=${encodeURIComponent(product.slug)}`}
              className="flex-1 flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-[#7C3AED] text-white text-[15px] font-bold transition-all hover:bg-[#6D28D9] hover:scale-[1.01] shadow-[0_8px_24px_rgba(124,58,237,0.28)]"
            >
              <ShoppingBag className="w-5 h-5" /> Hemen Sipariş Ver
            </Link>
            <a
              href={`https://wa.me/${WHATSAPP}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp ile Sipariş"
              className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-[#25D366] text-white text-[14px] font-bold transition-all hover:brightness-105 hover:scale-[1.01]"
            >
              <MessageCircle className="w-5 h-5" /> <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <button
              onClick={() => setWish(!wish)}
              aria-label="Favorilere ekle"
              className={`grid place-items-center w-14 rounded-2xl border transition-all ${wish ? "bg-[#FFF1F2] border-[#FECDD3] text-[#E11D48]" : "bg-white border-[#E5E7EB] text-[#9CA3AF] hover:border-[#C4B5FD]"}`}
            >
              <Heart className={`w-5 h-5 ${wish ? "fill-[#E11D48]" : ""}`} />
            </button>
          </div>

          {/* Güven ikonları — gerçek özellikler (sahte yorum/yıldız/satış YOK) */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
            {[
              { icon: Camera, t: "Fotoğraftaki ürün gönderilir", show: true },
              { icon: Leaf, t: "Taze hazırlanır", show: true },
              { icon: ShieldCheck, t: "Güvenli ödeme", show: true },
              { icon: Zap, t: "Aynı gün teslimat", show: product.same_day_available },
              { icon: Gift, t: "Hediye notu eklenebilir", show: true },
              { icon: Check, t: "Görsel onay desteği", show: true },
            ].filter((x) => x.show).map((x, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-[#4B5563]">
                <span className="grid place-items-center w-7 h-7 rounded-lg bg-[#F5F3FF] text-[#7C3AED] shrink-0"><x.icon className="w-3.5 h-3.5" /></span>
                {x.t}
              </div>
            ))}
          </div>

          {/* Görsel onay kutusu */}
          <div className="mt-5 rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] p-4 flex items-start gap-3">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-white text-[#7C3AED] shrink-0"><Camera className="w-[18px] h-[18px]" /></span>
            <div>
              <div className="text-[13.5px] font-bold text-[#111827]">Görsel Onay</div>
              <p className="text-[12.5px] text-[#6B7280] mt-0.5 leading-relaxed">Hazırlanan ürünün fotoğrafını teslimat öncesi sizinle paylaşabiliriz.</p>
            </div>
          </div>

          {/* Teslimat notu — şeffaf */}
          <p className="mt-3 text-[11.5px] text-[#9CA3AF] leading-relaxed">
            Teslimat saatleri bölge yoğunluğu, hava ve trafik durumuna göre değişebilir.
          </p>

          {/* Ürün bilgileri — tek satırlı sekmeler; aynı anda yalnız seçilen içerik görünür */}
          {product.long_description && (() => {
            const sections = parseDescriptionSections(product.long_description);
            if (!sections.length) return null;
            const intro = sections.find((s) => s.isIntro);
            const panels = sections.filter((s) => !s.isIntro);
            return (
              <section aria-label="Ürün detayları" className="mt-9 pt-7 border-t border-[#F3F4F6]">
                <div role="tablist" aria-label="Ürün bilgi sekmeleri" className="flex gap-7 overflow-x-auto border-b border-[#D1D5DB] scrollbar-none">
                  {[
                    ["description", "Ürün Açıklaması"],
                    ["details", "Ürün Bilgileri"],
                    ["delivery", "Gönderim Detayları"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={infoTab === key}
                      onClick={() => setInfoTab(key as typeof infoTab)}
                      className={`relative shrink-0 pb-3 text-[15px] font-medium transition-colors ${infoTab === key ? "text-[#111827]" : "text-[#9CA3AF] hover:text-[#4B5563]"}`}
                    >
                      {label}
                      {infoTab === key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#7C3AED]" />}
                    </button>
                  ))}
                </div>

                <div className="pt-6">
                  {infoTab === "description" && (
                    <div role="tabpanel" className={DESC_PROSE}>
                      {intro?.html ? (
                        <div dangerouslySetInnerHTML={{ __html: intro.html }} />
                      ) : panels[0]?.html ? (
                        <div dangerouslySetInnerHTML={{ __html: panels[0].html }} />
                      ) : null}
                    </div>
                  )}

                  {infoTab === "details" && (
                    <div role="tabpanel" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {panels.length > 0 ? panels.map((s, i) => {
                        const Icon = sectionIcon(s.title || "");
                        return (
                          <div key={i} className="rounded-xl border border-[#F0EEF6] bg-[#FBFAFE] px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="grid place-items-center w-8 h-8 rounded-lg bg-[#F3EEFF] text-[#7C3AED] shrink-0"><Icon className="w-4 h-4" /></span>
                              <h3 className="text-[14px] font-semibold text-[#1F2937] leading-snug">{s.title}</h3>
                            </div>
                            {s.html && <div className={`mt-3 ${DESC_PROSE}`} dangerouslySetInnerHTML={{ __html: s.html }} />}
                          </div>
                        );
                      }) : (
                        <p className="text-[14px] text-[#6B7280]">Bu ürün için ek içerik bilgisi bulunmuyor.</p>
                      )}
                    </div>
                  )}

                  {infoTab === "delivery" && (
                    <div role="tabpanel" className="text-[14px] text-[#4B5563] leading-[1.85] space-y-3">
                      <p>Teslimat bölgesi: <b className="text-[#111827]">{SCOPE_LABEL[product.delivery_scope] ?? "İstanbul"}</b>.{product.same_day_available ? " Aynı gün teslimat uygundur." : ""}</p>
                      <p>Uygun teslimat günü ve saati sipariş adımında, bölgenizdeki yoğunluğa göre belirlenir. Teslimat saatleri hava ve trafik durumuna göre değişebilir.</p>
                      <p>Hediye notunuzu sipariş adımında ekleyebilir; hazırlanan ürünün görsel onayını talep edebilirsiniz.</p>
                    </div>
                  )}
                </div>
              </section>
            );
          })()}
        </div>
      </div>

      {/* Mobil sticky CTA — satın alma paneli alta gelir */}
      <div className="h-24 lg:hidden" aria-hidden="true" />
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-[#EDE9FE] px-4 py-3 flex items-center gap-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="shrink-0">
          <div className="text-[11px] text-[#9CA3AF] leading-none">Fiyat</div>
          <div className="text-[18px] font-bold text-[#111827] leading-tight">{formatMinorTRY(shown)}</div>
        </div>
        <Link
          href={`/hizli-siparis?product=${encodeURIComponent(product.slug)}`}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#7C3AED] text-white text-[14px] font-bold shadow-[0_6px_18px_rgba(124,58,237,0.3)]"
        >
          <ShoppingBag className="w-[18px] h-[18px]" /> Sipariş Ver
        </Link>
        <a
          href={`https://wa.me/${WHATSAPP}?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp ile Sipariş"
          className="grid place-items-center w-12 h-12 rounded-xl bg-[#25D366] text-white shrink-0"
        >
          <MessageCircle className="w-5 h-5" />
        </a>
      </div>
    </main>
  );
}
