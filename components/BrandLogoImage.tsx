"use client";

import { useState } from "react";

const FALLBACK_LOGO = "/brand/cicekyolla-brand.svg";

export function BrandLogoImage({
  src,
  alt,
  className,
  style,
}: {
  src?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [currentSrc, setCurrentSrc] = useState(src || FALLBACK_LOGO);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      style={style}
      onError={() => {
        if (currentSrc !== FALLBACK_LOGO) setCurrentSrc(FALLBACK_LOGO);
      }}
    />
  );
}
