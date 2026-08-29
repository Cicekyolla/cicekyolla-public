// ============================================================================
// LEGACY MAHALLE 301'LERİ — eski URL -> bugünkü current mahalle URL'i
// ----------------------------------------------------------------------------
// 10 Mayıs 2026 migration'ında eksik kalan EXACT mahalle taşınması (70.132
// doğrulanmış çift). Mevcut yönlendirme katmanını DEĞİŞTİRMEZ; middleware'de
// mevcut legacy konum kuralından hemen ÖNCE bakılır ve YALNIZ sözlükte birebir
// karşılığı olan yollar için devreye girer.
//
// NEDEN GÖMÜLÜ LİSTE DEĞİL: sözlük 5,9 MB — Vercel middleware bundle sınırının
// (2 MB) çok üstünde. Bu yüzden managed-redirects.ts ile AYNI desen kullanılır:
// public uç + TTL önbellek + fail-safe. Tek fark, tüm harita yerine TEK YOL
// sorgulanır; 70 bin kaydı her soğuk başlatmada çekmek gerekmez.
//
// NEDEN ALGORİTMİK RESOLVER YETMİYOR: legacy-location-redirect.ts eski
// slug'daki parantezli köy adını atıyor ("cakmak-mahallesi-(akdurak-koyu)"),
// oysa bugünkü slug onu KORUYOR ("cakmak-mah-akdurak-koyu"). Ölçüldü: 70.132
// kaydın yalnız 41.971'ini (%60) doğru üretiyor, 28.133'ü ilçeye düşüyordu.
//
// FAIL-SAFE: API erişilemez/yavaş/404 ise null döner ve istek BUGÜNKÜ
// davranışıyla devam eder (ilçe sayfasına 301). Hiçbir şey bozulmaz, yanlış
// 301 üretilmez.
// ============================================================================

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL ?? "https://cicekyolla-api.onrender.com";

/** Hedefler statik (tek seferlik üretim) — uzun TTL güvenli. */
const TTL_MS = 24 * 60 * 60_000;
/**
 * OLUMSUZ sonuç için ÇOK daha kısa TTL.
 * Bir "hedef yok" yanıtı kalıcı gerçek değildir: API'nin deploy/soğuk başlatma
 * penceresinde dönen geçici bir 404, uzun TTL ile saklanırsa o legacy URL bir
 * gün boyunca ilçeye düşmeye devam eder. Production'da tam bu yaşandı.
 */
const NEGATIVE_TTL_MS = 10 * 60_000;
/** Edge'de isteği bloklamamak için kısa; aşılırsa yönlendirme atlanır. */
const TIMEOUT_MS = 1500;
/** Edge örneği başına önbellek tavanı; aşılırsa en eski kayıt düşer. */
const MAX_ENTRIES = 5_000;

type Kayit = { to: string | null; expiresAt: number };
const cache = new Map<string, Kayit>();

/**
 * Ucuz ön eleme — sözlükteki 70.131 kaynağın TAMAMI "-cicekci" ile bitiyor.
 * Bu kapı sayesinde normal trafikte hiç ağ isteği yapılmaz.
 */
export function looksLikeLegacyNeighborhood(pathname: string): boolean {
  const p = (pathname || "").split("?")[0].split("#")[0].replace(/\/+$/, "");
  return p.length > 9 && p.toLowerCase().endsWith("-cicekci");
}

function remember(key: string, to: string | null): string | null {
  if (cache.size >= MAX_ENTRIES) {
    const ilk = cache.keys().next();
    if (!ilk.done) cache.delete(ilk.value);
  }
  cache.set(key, { to, expiresAt: Date.now() + (to ? TTL_MS : NEGATIVE_TTL_MS) });
  return to;
}

/**
 * Bu eski yolun onaylanmış current hedefi var mı?
 * Yoksa null → çağıran mevcut davranışına devam eder.
 */
export async function resolveLegacyNeighborhoodRedirect(
  pathname: string,
): Promise<string | null> {
  try {
    if (!looksLikeLegacyNeighborhood(pathname)) return null;
    const key = (pathname || "").split("?")[0].split("#")[0].replace(/\/+$/, "").toLowerCase();

    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.to;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(
        `${API_ORIGIN}/api/public/redirects/legacy-neighborhood?path=${encodeURIComponent(key)}`,
        { signal: controller.signal, cache: "no-store" },
      );
      // 404 = bu yolun onaylı hedefi yok. Bunu da önbelleğe al ki aynı
      // adres tekrar geldiğinde boşuna ağ isteği yapılmasın.
      if (res.status === 404) return remember(key, null);
      if (!res.ok) return null;
      const json = (await res.json()) as { data?: { to?: string } };
      const to = json?.data?.to;
      if (typeof to !== "string" || !to.startsWith("/")) return null;
      // Döngü koruması: hedef kaynağın kendisi olamaz.
      if (to.toLowerCase() === key) return null;
      return remember(key, to);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Zaman aşımı / ağ hatası: bugünkü davranış aynen sürer.
    return null;
  }
}
