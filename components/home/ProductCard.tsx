"use client";

/**
 * ProductCard — ZIP Homepage.tsx birebir port. Reusable ürün kartı (BestSellers + ileride ürün grid'leri).
 * Hover: görsel zoom + "Sepete Ekle" yukarı kayar; wishlist toggle; badge + fiyat + rating.
 * Adaptasyon: react-router <Link to=…> → next/link <Link href=…>. Görsel/etkileşim birebir.
 */

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Heart, Zap, Clock3 } from "lucide-react";
import { ProductImage } from "@/components/product/ProductImage";
import { useT, Num } from "@/lib/i18n";
import { useProductName } from "@/lib/i18n/content";

export type Product = {
  id: number;
  name: string;
  subtitle?: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating?: number;
  reviews?: number;
  slug: string;
  badge?: string;
  productType?: string;
  sameDay?: boolean;
  scope?: string;
  hasSale?: boolean;
  categoryId?: number | null;
  derivatives?: { webp?: string; avif?: string; responsive?: Record<string, string> } | null;
  blurhash?: string | null;
};

/** Kategori sayfasından gelen bağlam (gerçek kategori / gönderim amacı). */
export type CardContextTag = { label: string; isOccasion: boolean };
export type ProductDeliveryPromise = "today" | "tomorrow";

type CardTag = { label: string; icon: string; tone: "occasion" | "category" | "delivery" | "promo" };

// Etiketler HARDCODED değil — ürünün gerçek alanlarından (ad, tip, teslimat, kampanya) +
// kategori bağlamından türetilir. Sahte sosyal kanıt YOK. Öncelik: amaç > kategori > teslimat > premium/kampanya. Maks 3.
function deriveTags(p: Product, ctx?: CardContextTag): CardTag[] {
  const tags: CardTag[] = [];
  const n = (p.name || "").toLocaleLowerCase("tr");
  const has = (...k: string[]) => k.some((x) => n.includes(x));

  // 1) GÖNDERİM AMACI
  if (ctx?.isOccasion) tags.push({ label: ctx.label, icon: "🎯", tone: "occasion" });
  else if (has("sevgili", "romantik", "aşk")) tags.push({ label: "Sevgiliye Özel", icon: "🌹", tone: "occasion" });
  else if (has("doğum günü", "dogum gunu")) tags.push({ label: "Doğum Günü", icon: "🎂", tone: "occasion" });
  else if (has("yeni ev", "ev hediye")) tags.push({ label: "Yeni Ev Hediyesi", icon: "🏡", tone: "occasion" });
  else if (has("anneler", "anneye")) tags.push({ label: "Anneye Hediye", icon: "👩", tone: "occasion" });
  else if (has("geçmiş olsun", "gecmis olsun")) tags.push({ label: "Geçmiş Olsun", icon: "💐", tone: "occasion" });
  else if (has("başsağlığı", "taziye", "cenaze")) tags.push({ label: "Başsağlığı", icon: "🙏", tone: "occasion" });
  else if (has("açılış", "acilis")) tags.push({ label: "Açılış Töreni", icon: "🎈", tone: "occasion" });
  else if (has("kurumsal")) tags.push({ label: "Kurumsal Hediye", icon: "🏢", tone: "occasion" });

  // 2) KATEGORİ
  if (ctx && !ctx.isOccasion && tags.length < 3) {
    tags.push({ label: ctx.label, icon: "🌿", tone: "category" });
  } else if (tags.length < 3) {
    if (has("orkide")) tags.push({ label: "Orkide", icon: "🌸", tone: "category" });
    else if (has("gül", "gul")) tags.push({ label: "Güller", icon: "🌹", tone: "category" });
    else if (p.productType === "plant") tags.push({ label: "Saksı Bitkisi", icon: "🪴", tone: "category" });
    else if (p.productType === "artificial") tags.push({ label: "Solmayan Çiçek", icon: "🌼", tone: "category" });
    else if (p.productType === "wreath") tags.push({ label: "Çelenk", icon: "🎗️", tone: "category" });
    else tags.push({ label: "Taze Çiçek", icon: "🌼", tone: "category" });
  }

  // 3) TESLİMAT
  if (tags.length < 3 && p.sameDay) tags.push({ label: "Aynı Gün Teslim", icon: "🚀", tone: "delivery" });
  else if (tags.length < 3 && p.scope === "istanbul") tags.push({ label: "İstanbul İçi Teslimat", icon: "📍", tone: "delivery" });

  // 4) PREMIUM / KAMPANYA
  if (tags.length < 3 && has("premium", "lüks", "luks", "deluxe")) tags.push({ label: "Premium Koleksiyon", icon: "💎", tone: "promo" });
  else if (tags.length < 3 && p.hasSale) tags.push({ label: "Kampanyalı", icon: "🎉", tone: "promo" });

  return tags.slice(0, 3);
}

const TAG_TONE: Record<CardTag["tone"], string> = {
  occasion: "bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]",
  category: "bg-[#F5F3FF] text-[#7C3AED] border-[#EDE9FE]",
  delivery: "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]",
  promo: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
};

export function ProductCard({ product, idx, contextTag, deliveryPromise, polish = false }: { product: Product; idx: number; contextTag?: CardContextTag; deliveryPromise?: ProductDeliveryPromise; polish?: boolean }) {
  const tr = useT();
  // Faz 2: onaylı çeviri varsa GÖRÜNEN ad; id/slug/fiyat/href değişmez.
  const shownName = useProductName(product.id, product.name);
  const [wish, setWish] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hoverImage, setHoverImage] = useState<string | null>(null);
  const [hoverImageLoaded, setHoverImageLoaded] = useState(false);
  const hoverRequested = useRef(false);
  const tags = deriveTags(product, contextTag);

  const requestHoverImage = () => {
    setHovered(true);
    if (hoverRequested.current) return;
    hoverRequested.current = true;
    void fetch(`/api/product-hover/${encodeURIComponent(product.slug)}`)
      .then((response) => response.ok ? response.json() as Promise<{ image?: string | null }> : null)
      .then((data) => { if (data?.image) setHoverImage(data.image); })
      .catch(() => undefined);
  };

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.09, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/urun/${product.slug}`}
        className={`group flex flex-col h-full rounded-[20px] border bg-white overflow-hidden transition-all duration-300 hover:border-[#EDE9FE] ${
          polish
            ? "border-[#EDE9FE] shadow-[0_8px_24px_rgba(17,12,34,0.06)] hover:shadow-[0_18px_44px_rgba(124,58,237,0.14)]"
            : "border-[#F1F0F5] hover:shadow-[0_14px_36px_rgba(124,58,237,0.10)]"
        }`}
        onMouseEnter={requestHoverImage}
        onFocus={requestHoverImage}
        onMouseLeave={() => setHovered(false)}
        onBlur={() => setHovered(false)}
      >
        {/* Image container — beyaz stüdyo zemini, kırpma yok (object-contain), merkezi ProductImage */}
        <div className="relative overflow-hidden bg-white" style={{ aspectRatio: "4/5" }}>
          <ProductImage
            src={product.image}
            alt={shownName}
            scale={hovered ? 1.06 : 1}
            padding="0px"
            derivatives={product.derivatives}
            blurhash={product.blurhash}
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
            className={`transition-opacity duration-500 ${hovered && hoverImageLoaded ? "opacity-0" : "opacity-100"}`}
          />
          {hoverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hoverImage}
              alt={`${shownName} yaşam alanında`}
              draggable={false}
              loading="lazy"
              decoding="async"
              onLoad={() => setHoverImageLoaded(true)}
              onError={() => setHoverImage(null)}
              className={`absolute inset-0 h-full w-full object-contain bg-white transition-[opacity,transform] duration-500 ease-out ${hovered && hoverImageLoaded ? "scale-[1.03] opacity-100" : "scale-100 opacity-0"}`}
            />
          ) : null}
          {/* Gradient overlay */}
          <div
            className="absolute inset-0 transition-opacity duration-500"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 50%)", opacity: hovered ? 1 : 0 }}
          />
          {/* V65 cila: kalıcı çok yumuşak üst/alt geçiş — stüdyo görselini karta oturtur */}
          {polish ? (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(10,1,24,0.04) 0%, transparent 18%, transparent 78%, rgba(10,1,24,0.07) 100%)",
                pointerEvents: "none",
              }}
            />
          ) : null}

          {/* Badge — glassmorphism */}
          {product.badge ? (
          <div
            className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-white text-[10px] font-bold tracking-wider"
            style={{
              background: "rgba(139,92,246,0.85)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 4px 16px rgba(139,92,246,0.4)",
            }}
          >
            {product.badge}
          </div>
          ) : null}

          {/* Wishlist */}
          <button
            onClick={(e) => {
              e.preventDefault();
              setWish(!wish);
            }}
            aria-label="Favorilere ekle"
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              transform: wish ? "scale(1.1)" : "scale(1)",
            }}
          >
            <Heart className={`w-4 h-4 transition-colors ${wish ? "fill-[#8B5CF6] text-[#8B5CF6]" : "text-[#9CA3AF]"}`} />
          </button>

          {/* Quick add — slides up on hover */}
          <motion.div
            animate={{ y: hovered ? 0 : "100%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-0 left-0 right-0 p-4"
          >
            {/* TEK KAPI: liste kartından sepete YAZILMAZ. Çiçek siparişi "nereye + ne zaman"
                olmadan anlamsızdır; teslimatsız sepet satırı checkout'ta çıkmaz sokak üretiyordu.
                Kart zaten /urun/[slug]'a Link — buton tıklaması doğal olarak oraya götürür.
                Görsel V85 ile birebir aynı kalır (aynı gradient/gölge/radius). */}
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className={`w-full py-3 text-white text-sm font-semibold tracking-wide ${polish ? "rounded-full" : "rounded-xl"}`}
              style={
                polish
                  ? {
                      // V65 cila: Figma'daki premium his — cam kenar + iç ışık + derin mor gölge
                      background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)",
                      border: "1px solid rgba(255,255,255,0.28)",
                      backdropFilter: "blur(8px)",
                      boxShadow: "0 12px 32px rgba(139,92,246,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
                    }
                  : {
                      background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)",
                      boxShadow: "0 8px 24px rgba(139,92,246,0.5)",
                    }
              }
            >
              {tr("card.addToCart")}
            </button>
          </motion.div>
        </div>

        {/* Info — kartla bütünleşik; ad 2 satır, fiyat sabit alt hizalı */}
        <div className="flex flex-col flex-1 px-4 pt-3.5 pb-4">
          {product.subtitle ? (
            <p className="text-[10px] text-[#A855F7] font-bold tracking-[0.18em] uppercase mb-1.5">{product.subtitle}</p>
          ) : null}
          <h3
            className="text-[#111827] font-semibold leading-snug transition-colors duration-200 group-hover:text-[#7C3AED]"
            style={{ fontSize: "14.5px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.55em" }}
          >
            {shownName}
          </h3>
          {tags.length > 0 ? (
            // V65 cila (polish): etiketler TEK satırda hizalı kalır, taşan zarifçe kırpılır
            <div className={`gap-1.5 mt-2 ${polish ? "flex flex-nowrap overflow-hidden" : "flex flex-wrap"}`}>
              {tags.map((t, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-[3px] rounded-full border whitespace-nowrap ${polish ? "shrink-0" : ""} ${TAG_TONE[t.tone]}`}
                >
                  <span aria-hidden="true">{t.icon}</span>
                  {t.label}
                </span>
              ))}
            </div>
          ) : null}
          {deliveryPromise ? (
            <div className={`mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold ${deliveryPromise === "today" ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]" : "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]"}`}>
              {deliveryPromise === "today" ? <Zap className="h-3 w-3" aria-hidden="true" /> : <Clock3 className="h-3 w-3" aria-hidden="true" />}
              {deliveryPromise === "today" ? tr("card.fastToday") : tr("card.tomorrow")}
            </div>
          ) : null}
          <div className="mt-auto pt-3 flex items-baseline gap-2">
            <span style={{ fontFamily: "var(--font-display)", fontSize: "19px" }} className="font-semibold text-[#111827]">
              <Num>₺{product.price}</Num>
            </span>
            {product.originalPrice ? (
              <Num className="text-sm text-[#C4B5FD] line-through font-medium">₺{product.originalPrice}</Num>
            ) : null}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
