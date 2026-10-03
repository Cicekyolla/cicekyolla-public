// Vitrin sayfalama — saf yardımcılar (Maltepe pilotu). Edge-safe: import yok.
// Yol tabanlı: /maltepe-cicek-siparisi/sayfa/2. Sorgu dizesi KULLANILMAZ (ISR bozulmasın).

export const SHOWCASE_PAGE_SIZE = 30;

export type ShowcasePathInfo = { basePath: string; page: number | null };

/** "/x/y/sayfa/3" → {basePath:"/x/y", page:3}. Eşleşmezse {basePath:path, page:null}. N tam sayı ≥1, baştaki sıfır YOK. */
export function parseShowcasePath(path: string): ShowcasePathInfo {
  const clean = (path || "").split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  const m = /^(\/.+?)\/sayfa\/([1-9]\d{0,5})$/.exec(clean);
  if (!m) return { basePath: clean, page: null };
  return { basePath: m[1], page: Number(m[2]) };
}

/** Yönlendirme hedefi olarak güvenli, SİTE İÇİ mutlak yol mu? Tek "/" ile başlar; ters eğik çizgi ve kontrol karakteri içermez.
 *  Protokol-göreli ("//evil.com") ve ters eğik çizgili ("/\evil.com") hedefler tarayıcıda dış siteye çözülür → açık yönlendirme. */
export function isSafeInternalPath(path: string): boolean {
  if (typeof path !== "string" || path.length === 0 || path.length > 2048) return false;
  if (path[0] !== "/" || path[1] === "/" || path[1] === "\\") return false;
  return !/[\\\u0000-\u001f\u007f]/.test(path);
}

export function totalPages(total: number, pageSize: number = SHOWCASE_PAGE_SIZE): number {
  if (!Number.isFinite(total) || total <= 0 || pageSize <= 0) return 0;
  return Math.ceil(total / pageSize);
}

/** Sayfa 1 = taban yol; N≥2 = taban/sayfa/N. */
export function showcasePageHref(basePath: string, page: number): string {
  const base = basePath.replace(/\/+$/, "") || "/";
  return page <= 1 ? base : `${base}/sayfa/${page}`;
}

/** Önceki/sonraki sayfa numarası (yoksa null). */
export function prevNext(current: number, total: number): { prev: number | null; next: number | null } {
  return { prev: current > 1 ? current - 1 : null, next: current < total ? current + 1 : null };
}

/** Görünür sayfa numaraları: ilk, son ve geçerli çevresi (±radius); aralar "gap". */
export function visiblePages(current: number, total: number, radius = 2): (number | "gap")[] {
  if (total <= 0) return [];
  const keep = new Set<number>([1, total]);
  for (let i = current - radius; i <= current + radius; i++) if (i >= 1 && i <= total) keep.add(i);
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let last = 0;
  for (const n of sorted) {
    if (last && n - last === 2) out.push(last + 1); // tek sayfalık boşluk için "…" yerine sayı
    else if (last && n - last > 2) out.push("gap");
    out.push(n);
    last = n;
  }
  return out;
}

/** Sayfa ≥2 başlık/açıklama son ekleri. */
export function titleWithPage(title: string, page: number): string {
  return page >= 2 ? `${title} — Sayfa ${page}` : title;
}
export function descriptionWithPage(desc: string, page: number): string {
  return page >= 2 ? `${desc} (Sayfa ${page})` : desc;
}
