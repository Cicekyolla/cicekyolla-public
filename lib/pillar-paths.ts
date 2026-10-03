// ============================================================================
// PILLAR MUAFİYETİ (middleware) — Maltepe pilotu, v2: yeni uç YOK.
// Yalnız /{x}-cicek-siparisi[/sayfa/N] kalıbındaki yollar için mevcut
// GET /api/public/seo/page?path=<taban> sorulur; page_type==='category_location'
// ise legacy kurallar atlanır. Yol başına 60 sn bellek önbelleği (en çok 50 giriş).
// FAIL-SAFE: hata / zaman aşımı → false → bugünkü (legacy) davranış.
// ============================================================================
import { parseShowcasePath } from "./showcasePagination.ts";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "https://cicekyolla-api.onrender.com";
const TTL_MS = 60_000;
const ERROR_TTL_MS = 15_000;
const TIMEOUT_MS = 1500;
const MAX_ENTRIES = 50;

const PRECHECK = /^\/[a-z0-9-]+-cicek-siparisi(\/sayfa\/[0-9]+)?$/;

/** Saf ön kontrol: kalıba uyuyorsa taban yolu (sayfa eki atılmış), uymuyorsa null. */
export function pillarBasePath(pathname: string): string | null {
  const p = (pathname || "").split("?")[0].split("#")[0].replace(/\/+$/, "");
  if (!PRECHECK.test(p)) return null;
  return parseShowcasePath(p).basePath;
}

/** Saf: sayfa yanıtı (zarf içindeki data) pillar mı? */
export function isPillarPageData(data: unknown): boolean {
  return !!data && typeof data === "object" && (data as { page_type?: unknown }).page_type === "category_location";
}

const cache = new Map<string, { value: boolean; expiresAt: number }>();

function remember(key: string, value: boolean, ttl: number) {
  if (cache.size >= MAX_ENTRIES && !cache.has(key)) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttl });
}

/** Bu yol yayındaki bir pillar (ya da sayfalaması) mı? Evetse legacy kurallar atlanır. */
export async function isPillarPath(pathname: string): Promise<boolean> {
  const base = pillarBasePath(pathname);
  if (!base) return false;
  const hit = cache.get(base);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_ORIGIN}/api/public/seo/page?path=${encodeURIComponent(base)}`, { signal: controller.signal, cache: "no-store" });
    if (res.status === 404) { remember(base, false, TTL_MS); return false; }
    if (!res.ok) { remember(base, false, ERROR_TTL_MS); return false; }
    const json = (await res.json()) as { data?: unknown };
    const value = isPillarPageData(json?.data);
    remember(base, value, TTL_MS);
    return value;
  } catch {
    remember(base, false, ERROR_TTL_MS);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
