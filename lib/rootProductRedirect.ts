// =============================================================================
// rootProductRedirect.ts — kök dizinde duran ürün adresi → /urun/<slug> (308)
// -----------------------------------------------------------------------------
// GSC (23 Eki 2026): 404 örneklerinde `/lika-kalpli-pembe-ve-krem-gul-sepeti` gibi
// başında `/urun/` olmayan ürün adresleri var; örneklenen 60 kök adresin 45'i
// `/urun/<slug>` olarak CANLI. Kaynak: dışarıda paylaşılmış eski kök linkler
// (ürün WA linki kök URL hatası). Bu adresler 404 yerine ürüne kalıcı yönlenir.
//
// Kural (tahmin YOK): yalnız TEK SEGMENTLİ, en az 3 kelimelik küçük harf slug
// adayıdır; API'de AYNI slug'la AKTİF ürün varsa yönlendirilir. Middleware'de
// managed-redirects ile aynı desen: kısa zaman aşımı + TTL önbellek; API
// erişilemezse null → istek bugünkü davranışıyla devam eder (fail-open).
// =============================================================================

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://cicekyolla-api.onrender.com';

const TTL_MS = 10 * 60_000;
const ERROR_TTL_MS = 10_000;
const TIMEOUT_MS = 1500;
const MAX_ENTRIES = 5000;

/** Tek segmentli, ≥3 kelimelik küçük harf slug (ör. /nina-2-dalli-mavi-orkide). */
const CANDIDATE = /^\/([a-z0-9]+(?:-[a-z0-9]+){2,})\/?$/;

export function rootProductCandidate(pathname: string): string | null {
  const m = CANDIDATE.exec(pathname || '');
  return m ? m[1] : null;
}

type Lookup = (slug: string) => Promise<boolean | null>;

const cache = new Map<string, { exists: boolean; expiresAt: number }>();

/** Aktif ürün var mı? true/false = kesin yanıt; null = geçici hata (kısa süre saklanır). */
async function lookupActiveProduct(slug: string): Promise<boolean | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {};
    const token = process.env.API_READ_TOKEN;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-user-role'] = 'viewer';
    }
    const res = await fetch(`${API_ORIGIN}/api/products/slug/${encodeURIComponent(slug)}`, {
      headers,
      signal: controller.signal,
      cache: 'no-store',
    });
    if (res.status === 404 || res.status === 422) return false;
    if (!res.ok) return null;
    const data = (await res.json()) as { product?: { slug?: string; status?: string } };
    return data?.product?.status === 'active' && data.product.slug === slug;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Kök adres aktif bir ürünse `/urun/<slug>` döner; değilse ya da okunamazsa null. */
export async function resolveRootProductRedirect(
  pathname: string,
  lookup: Lookup = lookupActiveProduct,
  now: number = Date.now(),
): Promise<string | null> {
  const slug = rootProductCandidate(pathname);
  if (!slug) return null;
  const hit = cache.get(slug);
  if (hit && hit.expiresAt > now) return hit.exists ? `/urun/${slug}` : null;
  const exists = await lookup(slug);
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(slug, { exists: exists === true, expiresAt: now + (exists === null ? ERROR_TTL_MS : TTL_MS) });
  return exists === true ? `/urun/${slug}` : null;
}

/** Yalnız testler için. */
export function __resetRootProductCache(): void {
  cache.clear();
}
