// ============================================================================
// lib/revalidatePaths.ts — SEO sayfası kaydından sonra anında güncelleme (27 Eki 2026, ADDITIVE).
// ----------------------------------------------------------------------------
// API, panelden bir SEO sayfası kaydedilince POST /api/revalidate'i { paths: [...] } gövdesiyle
// çağırır (anahtar: lib/revalidateAuth.ts). Gövdesiz çağrı bugünkü gibi yalnız ana sayfayı yeniler.
// Bu dosya saf: gövdeden güvenli site içi yolları ayıklar ve fetchSeoPage'in önbellek etiketini üretir.
// Neden: Skyversal'da 300 sn ISR yenilemesi güvenilir değil — /kategori/ogretmenler-gunu panel
// kaydından ~50 dk sonra hâlâ eski başlık + noindex veriyordu (27 Eki).
// ============================================================================

export const MAX_REVALIDATE_PATHS = 50;
const MAX_PATH_LENGTH = 512;

/** fetchSeoPage / fetchSeoPageChecked önbellek etiketi — yol ile birebir (sorgu/parça yok, sondaki "/" yok). */
export function seoPageTag(path: string): string {
  return `seo-page:${normalizeSitePath(path) ?? path}`;
}

/** Site içi yol mu? Değilse null. Sorgu ve parça atılır, sondaki "/" kırpılır (kök "/" kalır). */
export function normalizeSitePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const p = raw.trim().split("#")[0].split("?")[0];
  if (!p.startsWith("/") || p.startsWith("//") || p.length > MAX_PATH_LENGTH) return null;
  if (/[\s\\]/.test(p) || p.includes("://") || p.includes("..")) return null;
  return p.length > 1 ? p.replace(/\/+$/, "") || "/" : p;
}

/**
 * Gövdeden yol listesi. `paths` alanı yoksa null (bugünkü davranış: yalnız ana sayfa).
 * Varsa geçerli, tekil yollar (en çok MAX_REVALIDATE_PATHS) + reddedilen sayısı.
 */
export function parseRevalidatePaths(body: unknown): { paths: string[]; rejected: number } | null {
  if (!body || typeof body !== "object" || !("paths" in body)) return null;
  const raw = (body as { paths?: unknown }).paths;
  const list = Array.isArray(raw) ? raw : [];
  const paths: string[] = [];
  let rejected = Array.isArray(raw) ? 0 : 1;
  for (const item of list) {
    const p = normalizeSitePath(item);
    if (!p) { rejected++; continue; }
    if (!paths.includes(p)) paths.push(p);
  }
  if (paths.length > MAX_REVALIDATE_PATHS) {
    rejected += paths.length - MAX_REVALIDATE_PATHS;
    paths.length = MAX_REVALIDATE_PATHS;
  }
  return { paths, rejected };
}
