// ============================================================================
// PILLAR YOLLARI (Maltepe pilotu) — middleware için, managed-redirects.ts deseni.
// Yayındaki category_location sayfalarının yolları (örn. /maltepe-cicek-siparisi).
// Bu yollar (ve ${pillar}/sayfa/N) legacy kuralların yutmasından muaftır.
// FAIL-SAFE: API erişilemezse / yavaşsa boş küme → bugünkü davranış birebir.
// ============================================================================
import { parseShowcasePath } from "./showcasePagination.ts";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "https://cicekyolla-api.onrender.com";
const TTL_MS = 5 * 60_000;
const TIMEOUT_MS = 1500;

let cache: { set: Set<string>; expiresAt: number } | null = null;
let inflight: Promise<Set<string>> | null = null;

function normalize(path: string): string {
  let p = (path || "").split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

/** Saf (test edilebilir): yol pillar mı ya da pillar/sayfa/N mi? */
export function isPillarPathname(pathname: string, pillars: ReadonlySet<string>): boolean {
  if (pillars.size === 0) return false;
  const p = normalize(pathname);
  if (pillars.has(p)) return true;
  const { basePath, page } = parseShowcasePath(p);
  return page !== null && pillars.has(basePath);
}

async function fetchSet(): Promise<Set<string>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_ORIGIN}/api/public/seo/pillar-paths`, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) return cache?.set ?? new Set();
    const json = (await res.json()) as { paths?: unknown };
    const set = new Set<string>();
    if (Array.isArray(json?.paths)) for (const p of json.paths) if (typeof p === "string" && p) set.add(normalize(p));
    return set;
  } catch {
    return cache?.set ?? new Set();
  } finally {
    clearTimeout(timer);
  }
}

async function getSet(): Promise<Set<string>> {
  if (cache && cache.expiresAt > Date.now()) return cache.set;
  if (inflight) return inflight;
  inflight = fetchSet()
    .then((set) => {
      cache = { set, expiresAt: Date.now() + TTL_MS };
      return set;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

/** Bu yol yayındaki bir pillar (ya da sayfalaması) mı? Evetse legacy kurallar atlanır. */
export async function isPillarPath(pathname: string): Promise<boolean> {
  try {
    return isPillarPathname(pathname, await getSet());
  } catch {
    return false;
  }
}
