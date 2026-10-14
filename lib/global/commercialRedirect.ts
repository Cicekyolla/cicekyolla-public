// ============================================================================
// GLOBAL — İSTANBUL TİCARİ URL 301'i (middleware; ADDITIVE).
// Karar saf modülde (commercialUrl.ts commercialRedirectTarget); burada yalnız o dilin YAYINDAKİ lokasyon
// anahtarları (approved + indexable — /api/public/global/pages-inventory) süreç içinde önbelleklenir.
//  • Yalnız ticari kalıbı olan dillerin İstanbul yolları / ticari slug adayları için okunur; diğer her istek
//    ağ isteği yapmadan döner (null).
//  • FAIL-OPEN: envanter okunamazsa yönlendirme YOK → sayfa çizilir ve kanonik adresini (localeLocationPath)
//    basar; Googlebot tek yönlü bile olsa doğru adresi canonical'dan öğrenir.
//  • 5 dk taze, hata sonrası 10 sn (managed-redirects ile aynı desen); süre dolmuşsa beklenmez, eski küme
//    kullanılır ve yenileme arka planda yapılır (defer). Hiç küme yokken en çok 1,5 sn beklenir.
// ============================================================================
import {
  COMMERCIAL_CITY,
  COMMERCIAL_LOCALES,
  COMMERCIAL_URL_PATTERNS,
  commercialRedirectTarget,
  isCommercialSlugCandidate,
} from "./commercialUrl";
import { isGlobalLocale } from "./config";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";
const TTL_MS = 5 * 60_000;
const ERROR_TTL_MS = 10_000;
const TIMEOUT_MS = 1_500;

type Entry = { keys: ReadonlySet<string> | null; expiresAt: number };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<ReadonlySet<string> | null>>();

async function fetchLiveKeys(locale: string): Promise<ReadonlySet<string> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_ORIGIN}/api/public/global/pages-inventory?locale=${locale}`, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const body = (await res.json()) as { data?: { page_key?: unknown }[] } | null;
    if (!Array.isArray(body?.data)) throw new Error("bad body");
    const keys = new Set<string>();
    for (const r of body!.data) if (typeof r?.page_key === "string" && r.page_key.startsWith(COMMERCIAL_CITY)) keys.add(r.page_key);
    cache.set(locale, { keys, expiresAt: Date.now() + TTL_MS });
    return keys;
  } catch {
    const prev = cache.get(locale)?.keys ?? null;
    cache.set(locale, { keys: prev, expiresAt: Date.now() + ERROR_TTL_MS });
    return prev;
  } finally {
    clearTimeout(timer);
  }
}

function refresh(locale: string): Promise<ReadonlySet<string> | null> {
  const running = inflight.get(locale);
  if (running) return running;
  const p = fetchLiveKeys(locale).finally(() => inflight.delete(locale));
  inflight.set(locale, p);
  return p;
}

/** Bu yol ticari 301 kararına aday mı? (ağ isteği yapmadan) */
export function isCommercialRedirectCandidate(pathname: string): boolean {
  const m = /^\/([a-z]{2})\/([^?#]+?)\/?$/.exec(pathname);
  if (!m || !isGlobalLocale(m[1]) || !COMMERCIAL_URL_PATTERNS[m[1]]) return false;
  const segs = m[2].split("/");
  if (COMMERCIAL_LOCALES.has(m[1])) return segs[0] === COMMERCIAL_CITY && segs.length <= 3;
  return segs.length === 1 && isCommercialSlugCandidate(m[1], segs[0]);
}

/** Tek adımlık ticari 301 hedefi ya da null. `defer`: süresi dolmuş kümenin arka plan yenilemesi (waitUntil). */
export async function resolveCommercialRedirect(
  pathname: string,
  defer?: (p: Promise<unknown>) => void,
): Promise<string | null> {
  try {
    if (!isCommercialRedirectCandidate(pathname)) return null;
    const locale = pathname.slice(1, 3);
    const hit = cache.get(locale);
    let keys: ReadonlySet<string> | null;
    if (hit && hit.expiresAt > Date.now()) keys = hit.keys;
    else if (hit) {
      keys = hit.keys;
      const p = refresh(locale);
      if (defer) defer(p);
    } else keys = await refresh(locale);
    return commercialRedirectTarget(pathname, keys);
  } catch {
    return null;
  }
}
