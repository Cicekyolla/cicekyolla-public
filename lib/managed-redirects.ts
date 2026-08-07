// ============================================================================
// YÖNETİLEN YÖNLENDİRMELER — AI Merkezi'nde onaylanan 301'ler
// ----------------------------------------------------------------------------
// Mevcut yönlendirme katmanını DEĞİŞTİRMEZ. middleware.ts'te EN SONDA,
// mevcut tüm kurallar (resolveSayfaLegacy, resolveKategoriLegacy,
// resolveLegacyLocation, guardedCategoryTarget, resolveMidCicek …) çalıştıktan
// ve HİÇBİRİ tutmadıktan sonra bakılır.
//
// FAIL-SAFE: API erişilemezse, yavaşsa veya boş dönerse null döner ve istek
// bugünkü davranışıyla devam eder. Yönlendirme uygulanmaz, hiçbir şey bozulmaz.
//
// Veri kanalı yeni değil: link-dictionary ile aynı desen (public uç + TTL cache).
// ============================================================================

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://cicekyolla-api.onrender.com';

/** Önbellek ömrü. API tarafı da Cache-Control: max-age=300 veriyor. */
const TTL_MS = 5 * 60_000;
/** Edge'de istek bloklamamak için kısa; aşılırsa yönlendirme atlanır. */
const TIMEOUT_MS = 1500;

type Entry = { to: string; code: number };

let cache: { map: Map<string, Entry>; expiresAt: number } | null = null;
/** Aynı anda birden fazla yenileme isteği gitmesin. */
let inflight: Promise<Map<string, Entry>> | null = null;

function normalize(path: string): string {
  let p = (path || '').split('?')[0].split('#')[0];
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
}

async function fetchMap(): Promise<Map<string, Entry>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_ORIGIN}/api/public/redirects`, {
      signal: controller.signal,
      // Edge önbelleği bizim TTL'imizle çakışmasın.
      cache: 'no-store',
    });
    if (!res.ok) return cache?.map ?? new Map();
    const json = (await res.json()) as {
      redirects?: Array<{ from: string; to: string; code: number }>;
    };
    const map = new Map<string, Entry>();
    for (const r of json.redirects ?? []) {
      if (!r?.from || !r?.to) continue;
      const from = normalize(r.from);
      const to = normalize(r.to);
      if (from === to) continue; // döngü koruması
      map.set(from, { to, code: r.code === 302 || r.code === 307 || r.code === 308 ? r.code : 301 });
    }
    return map;
  } catch {
    // Zaman aşımı / ağ hatası: elde varsa eski haritayı kullan, yoksa boş.
    return cache?.map ?? new Map();
  } finally {
    clearTimeout(timer);
  }
}

async function getMap(): Promise<Map<string, Entry>> {
  if (cache && cache.expiresAt > Date.now()) return cache.map;
  if (inflight) return inflight;
  inflight = fetchMap()
    .then((map) => {
      cache = { map, expiresAt: Date.now() + TTL_MS };
      return map;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

/**
 * Bu yol için onaylanmış bir yönlendirme var mı?
 * Yoksa null → çağıran mevcut davranışına devam eder.
 */
export async function resolveManagedRedirect(
  pathname: string,
): Promise<{ to: string; code: number } | null> {
  try {
    const map = await getMap();
    if (map.size === 0) return null;
    const hit = map.get(normalize(pathname));
    if (!hit) return null;
    // Tek adım: hedef de yönlendirme kaynağıysa zinciri burada kurmayız.
    // API tarafı upsert sırasında zinciri zaten son hedefe düzleştiriyor.
    return hit;
  } catch {
    return null;
  }
}
