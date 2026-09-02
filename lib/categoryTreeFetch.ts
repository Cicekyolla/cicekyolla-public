// ============================================================================
// categoryTreeFetch.ts — kategori ağacı okuma stratejisi (SAF, birim testli)
// ----------------------------------------------------------------------------
// MALİYET KAÇAĞI #1 (2 Eyl 2026): tam ağaç GET /api/categories ~3,46 MB (telde
// ~855 KB). Vercel Data Cache 2 MB üstünü SAKLAMAZ → `revalidate: 300` etkisizdi;
// her sayfa üretimi Render'dan tam ağacı çekiyordu (12 saatte 62 bin çağrı,
// önbellek 0). Çözüm ADDITIVE:
//   1) HAFİF uç  GET /api/categories/public-tree  (aynı ağaç, aynı sıra, yalnız
//      vitrinin okuduğu alanlar; ~66 KB → Data Cache'e girer), revalidate 300
//   2) API eski sürümdeyse (404) ya da kesintide MEVCUT tam ağaç, revalidate 300
//   3) son çare: tam ağaç no-store (mevcut cold-start dayanıklılığı)
// Deploy sırasından bağımsız: API henüz yayında değilse bugünkü davranış aynen.
// Bu dosya Next/DOM'a bağımlı değildir; lib/api.ts yalnız origin/path/başlık verir.
// ============================================================================

export interface TreeAttempt { url: string; init: RequestInit }

export function categoryTreeAttempts(origin: string, categoriesPath: string, headers: Record<string, string>): TreeAttempt[] {
  const lightUrl = `${origin}${categoriesPath}/public-tree`;
  const fullUrl = `${origin}${categoriesPath}`;
  return [
    { url: lightUrl, init: { headers, next: { revalidate: 300 } } as RequestInit },
    { url: fullUrl, init: { headers, next: { revalidate: 300 } } as RequestInit },
    { url: fullUrl, init: { headers, cache: "no-store" } },
  ];
}

/** Denemeleri sırayla yürütür; ilk geçerli (name+slug taşıyan ≥1 düğüm) diziyi döner. */
export async function fetchTreeViaAttempts<T extends { name?: unknown; slug?: unknown }>(
  attempts: TreeAttempt[],
  fetchFn: typeof fetch = fetch,
): Promise<T[] | null> {
  for (const { url, init } of attempts) {
    let res: Response;
    try {
      res = await fetchFn(url, init);
    } catch {
      continue;
    }
    if (!res.ok) continue;

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      continue;
    }

    // Zarf esnek: { data: [...] } ya da düz [...] — ikisini de kabul et.
    const payload = (json as { data?: unknown } | null)?.data ?? json;
    if (!Array.isArray(payload)) continue;

    const nodes = payload.filter(
      (n): n is T => !!n && typeof (n as T).name === "string" && typeof (n as T).slug === "string",
    );
    if (nodes.length > 0) return nodes;
  }
  return null;
}

/**
 * Tek kategori kaydı (GET /api/categories/:id — mevcut sözleşme, ENRICHED alanlar:
 * description, faq_json, seo_title, seo_description, h1_title, is_indexable …).
 * Yalnız kategori sayfasının SEO fallback'i için, gerektiğinde çağrılır.
 * Zarf esnek; 404/hata → null, fırlatmaz.
 */
export async function fetchCategoryRowById(
  origin: string,
  categoriesPath: string,
  headers: Record<string, string>,
  id: number,
  fetchFn: typeof fetch = fetch,
): Promise<Record<string, unknown> | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const res = await fetchFn(`${origin}${categoriesPath}/${id}`, { headers, next: { revalidate: 300 } } as RequestInit);
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: unknown } | null;
    const row = json && typeof json === "object" && "data" in json ? json.data : json;
    return row && typeof row === "object" ? (row as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
