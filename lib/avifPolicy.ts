// ============================================================================
// avifPolicy.ts — <picture> içinde AVIF/WebP seçimini BAĞLAMA göre kuran saf
// yardımcılar (9 Eyl 2026, Adım 3b). Next/DOM bağımlılığı yok; Node testli.
// ----------------------------------------------------------------------------
// ÖLÇÜM (30 türevli ürün, ortalama KB): orijinal 92 · tek boy AVIF (~1500 px)
// 41 · WebP 400w 11 · 800w 29 · 1500w 57. Tarayıcı <picture>'da İLK desteklenen
// <source>'u seçtiği için bugün her bağlamda tam boy AVIF iniyor. Oysa:
//   • tarayıcının WebP adayı 400w/800w ise (gereken cihaz pikseli ≤ 800)
//     responsive WebP ürünlerin %97–100'ünde AVIF'ten küçük;
//   • aday 1500w ise (gereken cihaz pikseli > 800) tek boy AVIF %97'de küçük.
// Kural: AVIF <source>'una yalnız "CSS genişliği × DPR > 800" olan ekranlarda
// eşleşen bir `media` koşulu verilir. Koşul, çağıranın `sizes` değerinden
// türetilir; böylece hiçbir bağlam bugünden kötüleşmez (bkz. lib/avifPolicy.test.ts
// — ızgara simülasyonu: media eşleşiyorsa WebP adayı KESİN 1500w'dir).
//
// KAPSAM: yalnız `sizes` değeri bu gramerle yazılmış çağıranlar:
//   "(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"  ·  "160px"  ·
//   "(max-width:640px) 100px, 180px". Ayrıştırılamayan sizes → undefined →
//   ProductImage bugünkü davranışını (AVIF önce, koşulsuz) aynen sürdürür.
// ============================================================================

export interface SizesSegment {
  /** Segmentin uygulandığı en büyük viewport (px). Son/varsayılan segmentte yok. */
  maxWidth?: number;
  vw?: number;
  px?: number;
}

/** `sizes` özniteliğini ayrıştırır; desteklenmeyen gramer → null. */
export function parseSizes(sizes: string | null | undefined): SizesSegment[] | null {
  if (!sizes) return null;
  const parts = sizes.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const out: SizesSegment[] = [];
  for (let i = 0; i < parts.length; i++) {
    const m = /^(?:\(\s*max-width\s*:\s*(\d+(?:\.\d+)?)px\s*\)\s+)?(\d+(?:\.\d+)?)(vw|px)$/i.exec(parts[i]);
    if (!m) return null;
    const seg: SizesSegment = {};
    if (m[1] != null) seg.maxWidth = Number(m[1]);
    if (m[3].toLowerCase() === "vw") seg.vw = Number(m[2]);
    else seg.px = Number(m[2]);
    const last = i === parts.length - 1;
    if (!last && seg.maxWidth == null) return null; // koşulsuz değer yalnız sonda olabilir
    if (last && seg.maxWidth != null) return null; // son değer varsayılan olmalı
    if (i > 0 && !last && (seg.maxWidth ?? 0) <= (out[i - 1].maxWidth ?? 0)) return null; // artan sıra
    out.push(seg);
  }
  return out;
}

/** WebP adayının 1500w'ye geçtiği eşik: 800w türevi bu cihaz pikseline kadar yeter. */
export const AVIF_BREAK_EVEN_PX = 800;

/** Koşullar bu DPR basamaklarına göre yazılır; aradaki DPR'ler güvenli tarafa (WebP) düşer. */
export const DPR_BUCKETS: ReadonlyArray<number> = [1, 1.5, 2, 3, 4];

/**
 * `sizes` → AVIF <source> için `media` listesi.
 *   string    → yalnız bu koşullarda AVIF (aksi hâlde responsive WebP)
 *   false     → AVIF hiçbir ekranda kazanmıyor (küçük sabit px); kaynak basılmaz
 *   undefined → sizes ayrıştırılamadı; bugünkü davranış (koşulsuz AVIF önce)
 */
export function avifMediaFromSizes(sizes: string | null | undefined, threshold: number = AVIF_BREAK_EVEN_PX): string | false | undefined {
  const segs = parseSizes(sizes);
  if (!segs) return undefined;
  const clauses: string[] = [];
  let prevMax = 0;
  for (const seg of segs) {
    const minV = prevMax + 1;
    const maxV = seg.maxWidth;
    for (const d of DPR_BUCKETS) {
      let minW: number;
      if (seg.vw != null) {
        if (seg.vw <= 0) continue;
        // viewport × vw/100 × d > threshold  ⇔  viewport > threshold·100/(vw·d)
        minW = Math.floor((threshold * 100) / (seg.vw * d)) + 1;
      } else {
        if ((seg.px ?? 0) * d <= threshold) continue;
        minW = 0;
      }
      const lo = Math.max(minW, minV);
      if (maxV != null && lo > maxV) continue;
      const parts = [`(min-resolution: ${d}dppx)`];
      if (lo > 1) parts.push(`(min-width: ${lo}px)`);
      if (maxV != null) parts.push(`(max-width: ${maxV}px)`);
      clauses.push(parts.join(" and "));
      if (seg.px != null) break; // sabit px: ilk yeterli DPR basamağı üsttekileri de kapsar
    }
    if (maxV != null) prevMax = maxV;
  }
  return clauses.length > 0 ? clauses.join(", ") : false;
}

// ── <picture> kaynak listesi (ProductImage bunu render eder) ─────────────────
export interface PictureSource {
  type: string;
  srcSet: string;
  sizes?: string;
  media?: string;
}

export function pictureSources(input: {
  avifSrc?: string | null;
  webpSrcSet?: string | null;
  webpType?: string | null;
  sizes?: string;
  /** undefined = bugünkü davranış (AVIF önce, koşulsuz); false = AVIF yok; string = media koşulu. */
  avifMedia?: string | false;
}): PictureSource[] {
  const out: PictureSource[] = [];
  if (input.avifSrc && input.avifMedia !== false) {
    const s: PictureSource = { type: "image/avif", srcSet: input.avifSrc, sizes: input.sizes };
    if (typeof input.avifMedia === "string" && input.avifMedia.trim()) s.media = input.avifMedia;
    out.push(s);
  }
  if (input.webpType && input.webpSrcSet) out.push({ type: input.webpType, srcSet: input.webpSrcSet, sizes: input.sizes });
  return out;
}
