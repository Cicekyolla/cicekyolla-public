// Yerel medya adreslerini Next görsel optimizasyon ucuna (/_next/image) çevirir:
// gösterim genişliğine küçültülmüş WebP döner (ör. 300 KB kategori dairesi → ~10 KB).
// Dokunulmayanlar: SVG/GIF (vektör/animasyon), /api/ (yönlendirme dönebilir), dış adresler.

// Next varsayılan imageSizes + deviceSizes; `w` bunlardan biri olmak zorunda.
export const OPTIMIZER_WIDTHS = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840] as const;

const OPTIMIZABLE_PREFIX = /^\/(r2|studio|brand|brand-logo|uploads|legacy-products)(\/|$|\?)/;
const SKIP_EXT = /\.(svg|gif)(\?|#|$)/i;

export function snapOptimizerWidth(width: number): number {
  const w = Math.max(1, Math.round(width));
  return OPTIMIZER_WIDTHS.find((x) => x >= w) ?? OPTIMIZER_WIDTHS[OPTIMIZER_WIDTHS.length - 1];
}

export function isOptimizableSrc(src: string | null | undefined): src is string {
  return typeof src === "string" && OPTIMIZABLE_PREFIX.test(src) && !SKIP_EXT.test(src);
}

export function optimizedImageSrc(src: string | null | undefined, width: number, quality = 75): string {
  if (!src) return "";
  if (!isOptimizableSrc(src)) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${snapOptimizerWidth(width)}&q=${quality}`;
}

export function optimizedImageSrcSet(src: string | null | undefined, widths: number[], quality = 75): string | undefined {
  if (!isOptimizableSrc(src)) return undefined;
  const ws = [...new Set(widths.map(snapOptimizerWidth))].sort((a, b) => a - b);
  return ws.map((w) => `${optimizedImageSrc(src, w, quality)} ${w}w`).join(", ");
}
