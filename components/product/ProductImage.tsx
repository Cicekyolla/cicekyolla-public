"use client";

// ---------------------------------------------------------------------------
// PRODUCTIMAGE — MERKEZİ PREMIUM ÜRÜN GÖRSELİ (TEK BİLEŞEN).
// Tüm public ürün görselleri bu bileşeni kullanır. Standart:
//   • object-fit: contain · object-position: center · beyaz zemin (ASLA crop/cover)
//   • CLS = 0  → sabit aspect-ratio container, görsel absolute doldurur
//   • WebP/AVIF/responsive: backend türevleri (<picture> AVIF→WebP→orijinal, srcset)
//     — Vercel image kotası HARCANMAZ; türevi olmayan üründe orijinale düşer.
//   • Blurhash LQIP: backend blurhash'i decode edilip bulanık önizleme; yoksa shimmer
//   • onError / eksik URL → premium marka placeholder (kırık görsel YOK)
//   • Güvenlik: draggable=false · contextmenu/dragstart engel · user-select/callout none
//   • Native: loading=lazy (ilk ekran priority) · decoding=async · fetchPriority
// ADDITIVE: mevcut davranışı bozmaz; tüm yeni alanlar opsiyonel, graceful fallback.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { resolveProductImage, type ImageSourceLike } from "@/lib/productImage";
import { mediaDerivatives } from "@/lib/media";
import { blurhashToDataURL } from "@/lib/blurhash";

export interface MediaDerivativesLike {
  webp?: string;
  avif?: string;
  responsive?: Record<string, string>;
}

type ProductImageProps = {
  src?: string | null;
  source?: string | ImageSourceLike | null;
  alt: string;
  priority?: boolean;
  padding?: string;
  scale?: number;
  hoverZoom?: boolean;
  srcSet?: string;
  sizes?: string;
  derivatives?: MediaDerivativesLike | null;
  blurhash?: string | null;
  protect?: boolean;
  className?: string;
  imgClassName?: string;
};

function pickFromSource(source: ProductImageProps["source"]): { derivatives?: MediaDerivativesLike | null; blurhash?: string | null } {
  if (!source || typeof source === "string") return {};
  const s = source as {
    cover_derivatives?: MediaDerivativesLike | null; cover_blurhash?: string | null;
    derivatives?: MediaDerivativesLike | null; blurhash?: string | null;
    images?: Array<{ derivatives?: MediaDerivativesLike | null; blurhash?: string | null } | null> | null;
  };
  const img0 = s.images?.find((i) => i);
  return {
    derivatives: s.cover_derivatives ?? s.derivatives ?? img0?.derivatives ?? null,
    blurhash: s.cover_blurhash ?? s.blurhash ?? img0?.blurhash ?? null,
  };
}

function PremiumPlaceholder() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center select-none"
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
  derivatives,
  blurhash,
  protect = true,
  className = "",
  imgClassName = "",
}: ProductImageProps) {
  const resolved = useMemo(() => (src != null ? resolveProductImage(src) : resolveProductImage(source ?? null)), [src, source]);

  const picked = useMemo(() => pickFromSource(source), [source]);
  const deriv = useMemo(() => mediaDerivatives(derivatives ?? picked.derivatives ?? null), [derivatives, picked.derivatives]);
  const hash = blurhash ?? picked.blurhash ?? null;

  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lqip, setLqip] = useState<string | null>(null);

  useEffect(() => {
    if (!hash) { setLqip(null); return; }
    setLqip(blurhashToDataURL(hash, 32));
  }, [hash]);

  const showImg = resolved != null && !failed;

  const avifSrc = deriv?.avif || null;
  const respEntries = deriv?.responsive ? Object.entries(deriv.responsive) : [];
  const webpSrcSet =
    srcSet ||
    (respEntries.length ? respEntries.map(([w, u]) => `${u} ${w}w`).join(", ") : deriv?.webp || null);
  const webpType = respEntries.length || deriv?.webp ? "image/webp" : null;

  const imgStyle: React.CSSProperties = {
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
  };

  const imgEl = showImg ? (
    <picture>
      {avifSrc ? <source type="image/avif" srcSet={avifSrc} sizes={sizes} /> : null}
      {webpType && webpSrcSet ? <source type={webpType} srcSet={webpSrcSet} sizes={sizes} /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolved!}
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
        style={imgStyle}
      />
    </picture>
  ) : null;

  return (
    <div className={`absolute inset-0 overflow-hidden bg-white ${className}`}>
      {showImg && !loaded ? (
        lqip ? (
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `url(${lqip})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(6px)", transform: "scale(1.06)" }}
            aria-hidden="true"
          />
        ) : (
          <div
            className="absolute inset-0 cy-img-shimmer"
            style={{ background: "linear-gradient(100deg,#F6F5FA 30%,#EFEDF6 50%,#F6F5FA 70%)", backgroundSize: "200% 100%" }}
            aria-hidden="true"
          />
        )
      ) : null}

      {imgEl ?? <PremiumPlaceholder />}

      {protect && showImg ? (
        <div className="absolute inset-0 z-[1] select-none" style={{ pointerEvents: "none" }} aria-hidden="true" />
      ) : null}
    </div>
  );
}

export default ProductImage;
