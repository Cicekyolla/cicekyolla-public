"use client";

// ---------------------------------------------------------------------------
// PRODUCTIMAGE — MERKEZİ PREMIUM ÜRÜN GÖRSELİ (TEK BİLEŞEN).
// Tüm public ürün görselleri (anasayfa, kategori, koleksiyon, arama, öneri,
// teslimat/kargo koleksiyonu, ürün detay, benzer ürünler, kampanya, carousel)
// bu bileşeni kullanır. Standart:
//   • object-fit: contain · object-position: center · beyaz zemin (ASLA crop/cover)
//   • CLS = 0  → sabit aspect-ratio container, görsel absolute doldurur
//   • Premium skeleton (shimmer) yüklenene kadar
//   • onError / eksik URL → premium marka placeholder (kırık görsel YOK)
//   • Güvenlik: draggable=false · onContextMenu/onDragStart engel · user-select/
//     touch-callout none · görünmez koruma katmanı (SEO/erişilebilirlik bozulmaz)
//   • Native optimizasyon: loading=lazy (ilk ekran hariç) · decoding=async ·
//     fetchPriority · isteğe bağlı srcSet/sizes (backend türevleri gelince additive)
// ADDITIVE: mevcut davranışı bozmaz; görseli aynı bırakır, üstüne katman ekler.
// ---------------------------------------------------------------------------

import { useMemo, useState } from "react";
import { resolveProductImage, type ImageSourceLike } from "@/lib/productImage";

type ProductImageProps = {
  /** Doğrudan URL (öncelikli) — verilmezse `source` çözülür. */
  src?: string | null;
  /** Görsel alanları taşıyan gevşek nesne (resolver ile çözülür). */
  source?: string | ImageSourceLike | null;
  alt: string;
  /** İlk ekran (LCP) görselleri için: eager + yüksek öncelik. Aksi halde lazy. */
  priority?: boolean;
  /** İç padding (contain nefes alanı). Varsayılan premium spacing. */
  padding?: string;
  /** Hover zoom ölçeği (kartlarda kullanılır). 1 = kapalı. */
  scale?: number;
  /** SSR grid'lerde CSS-tabanlı hover zoom (parent `.group` olmalı). scale'e gerek kalmaz. */
  hoverZoom?: boolean;
  /** Responsive srcSet/sizes (backend türevleri geldiğinde additive kullanılır). */
  srcSet?: string;
  sizes?: string;
  /** Görünmez güvenlik katmanı (varsayılan açık). */
  protect?: boolean;
  className?: string;
  /** Görsele uygulanacak ek className (object-contain zaten uygulanır). */
  imgClassName?: string;
};

/** Marka placeholder — soft lila degrade + zarif çiçek/sparkle ikonu (kırık görsel yerine). */
function PremiumPlaceholder({ label }: { label?: string }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 select-none"
      style={{ background: "linear-gradient(135deg,#FBFAFF 0%,#F5F3FF 55%,#EDE9FE 100%)" }}
      aria-hidden="true"
    >
      <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#C4B5FD" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c4.97 0 9-4.03 9-9-4.97 0-9 4.03-9 9Z" />
        <path d="M12 22c-4.97 0-9-4.03-9-9 4.97 0 9 4.03 9 9Z" />
        <path d="M12 13c0-4.97 4.03-9 9-9 0 4.97-4.03 9-9 9Z" />
        <path d="M12 13c0-4.97-4.03-9-9-9 0 4.97 4.03 9 9 9Z" />
        <circle cx="12" cy="13" r="1.2" fill="#C4B5FD" stroke="none" />
      </svg>
      {label ? <span className="text-[11px] font-medium tracking-wide text-[#A78BDA]">{label}</span> : null}
    </div>
  );
}

export function ProductImage({
  src,
  source,
  alt,
  priority = false,
  padding = "12px",
  scale = 1,
  hoverZoom = false,
  srcSet,
  sizes,
  protect = true,
  className = "",
  imgClassName = "",
}: ProductImageProps) {
  const resolved = useMemo(() => (src != null ? resolveProductImage(src) : resolveProductImage(source ?? null)), [src, source]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const showImg = resolved != null && !failed;

  return (
    <div className={`absolute inset-0 overflow-hidden bg-white ${className}`}>
      {/* Skeleton — yüklenene kadar premium shimmer (boş beyaz alan yok, CLS yok). */}
      {showImg && !loaded ? (
        <div
          className="absolute inset-0 cy-img-shimmer"
          style={{ background: "linear-gradient(100deg,#F6F5FA 30%,#EFEDF6 50%,#F6F5FA 70%)", backgroundSize: "200% 100%" }}
          aria-hidden="true"
        />
      ) : null}

      {showImg ? (
        <img
          src={resolved}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={protect ? (e) => e.preventDefault() : undefined}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`w-full h-full object-contain ${hoverZoom ? "group-hover:scale-105" : ""} ${imgClassName}`}
          style={{
            objectPosition: "center",
            padding,
            ...(hoverZoom ? {} : { transform: `scale(${scale})` }),
            transition: hoverZoom
              ? "transform 0.5s ease-out, opacity 0.5s ease"
              : "transform 0.7s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease",
            opacity: loaded ? 1 : 0,
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
          }}
        />
      ) : (
        <PremiumPlaceholder />
      )}

      {/* Görünmez koruma katmanı — sağ tık/uzun bas kaydetmeyi zorlaştırır.
          pointer-events kapalı → tıklama/gezinme (Link) ve üstteki butonlar BOZULMAZ;
          yalnız contextmenu/dragstart yakalanır. */}
      {protect && showImg ? (
        <div
          className="absolute inset-0 z-[1] select-none"
          style={{ pointerEvents: "none" }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

export default ProductImage;
