"use client";

import type { ImgHTMLAttributes } from "react";

// Sunucu bileşenlerinin <img>'e onError veremediği yerler için: asıl kaynak
// (ör. /_next/image küçültülmüş sürüm) açılmazsa bir kez fallbackSrc'ye düşer.
export function FallbackImg({ fallbackSrc, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fallbackSrc: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img
      {...props}
      onError={(e) => {
        const el = e.currentTarget;
        if (fallbackSrc && el.getAttribute("src") !== fallbackSrc) el.src = fallbackSrc;
      }}
    />
  );
}
