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

import { parseShowcasePath, isSafeInternalPath } from './showcasePagination.ts';

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://cicekyolla-api.onrender.com';

/** Önbellek ömrü. API tarafı da Cache-Control: max-age=300 veriyor. */
const TTL_MS = 5 * 60_000;
/** Edge'de istek bloklamamak için kısa; aşılırsa yönlendirme atlanır. */
const TIMEOUT_MS = 1500;

type Entry = { to: string; code: number };

/** EK (MALTEPE AİLESİ): geçici hata (zaman aşımı / 5xx) sonucu elde edilen harita 5 dk DEĞİL kısa süre saklanır.
 *  Aksi halde soğuk açılışta tek bir yavaş yanıt boş haritayı 5 dk sabitler ve taşınmış sayfalar (ör. /maltepe-cicek-siparisi)
 *  bu sürede eski legacy kurala takılırdı. Başarılı yanıtta davranış BİREBİR aynı (TTL_MS). */
const ERROR_TTL_MS = 10_000;
let lastFetchFailed = false;

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
    if (!res.ok) { lastFetchFailed = true; return cache?.map ?? new Map(); }
    lastFetchFailed = false;
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
    lastFetchFailed = true;
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
      cache = { map, expiresAt: Date.now() + (lastFetchFailed ? ERROR_TTL_MS : TTL_MS) };
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

// ============================================================================
// EK (DÖNGÜ GUARD) — ADDITIVE. Mevcut hiçbir fonksiyon değiştirilmedi.
//
// SORUN: Lokasyon SEO Merkezi'nde "SEO Dili" seçilince sistem "/il → /il-{ek}"
// biçiminde yönetilen bir 301 kuruyor. Aynı "/il-{ek}" adresi legacy konum
// kuralına da uyduğu için middleware onu "/il"e geri 301'liyor → iki adımlı
// sonsuz döngü (ERR_TOO_MANY_REDIRECTS). 81 ilin ve üç düğmenin tamamında.
//
// ÇÖZÜM: Gelen yol, onaylı bir yönetilen 301'in HEDEFİ ise o yol artık canlı
// bir sayfadır; legacy kurallar onu yutmamalıdır. Legacy listeler (SUFFIXES,
// public-targets) OLDUĞU GİBİ KALIR — hiçbir sonek silinmez, mevcut ~73 bin
// legacy yönlendirme aynen çalışır.
//
// FAIL-SAFE: harita boşsa / API erişilemezse false döner → bugünkü davranış
// birebir korunur. Bugün yayındaki 15 yönetilen 301'in hiçbirinin hedefi
// legacy kurala takılmıyor, yani guard bugün NO-OP'tur.
// ============================================================================

/** Saf yardımcı (test edilebilir): yol, verilen hedef kümesinde mi? */
export function isManagedTargetPath(
  pathname: string,
  targets: ReadonlySet<string>,
): boolean {
  const p = normalize(pathname);
  if (targets.has(p)) return true;
  // EK (MALTEPE AİLESİ): hedef sayfanın yol-tabanlı vitrin sayfalaması (/…/sayfa/N) da canlı sayfadır; legacy kurallar yutmamalı.
  const paged = parseShowcasePath(p);
  return paged.page !== null && targets.has(paged.basePath);
}

/** Onaylı yönetilen 301'lerin hedef kümesi (önbellekten; ek ağ isteği yok). */
export async function managedRedirectTargets(): Promise<ReadonlySet<string>> {
  try {
    const map = await getMap();
    const targets = new Set<string>();
    for (const entry of map.values()) targets.add(entry.to);
    return targets;
  } catch {
    return new Set<string>();
  }
}

/** Bu yol yönetilen bir 301'in hedefi mi? Evetse legacy kurallar atlanır. */
export async function isManagedRedirectTarget(pathname: string): Promise<boolean> {
  return isManagedTargetPath(pathname, await managedRedirectTargets());
}

// ============================================================================
// EK (GLOBAL LOCALE 301) — ADDITIVE. Mevcut hiçbir fonksiyon değiştirilmedi.
//
// SORUN: middleware Global locale yollarında (/de/…, /en/… — 13 dil) hiçbir
// kurala bakmadan devam ediyordu. Locale ürün/kategori slug'ı değişince eski
// adres (/de/produkt/<eski-slug>) 404'e düşüyor, birikmiş sinyal taşınmıyordu.
// GET /api/public/redirects artık locale yollarını da taşıyor
// (/<locale>/<bölüm>/<eski-slug> → yeni adres).
//
// ÇÖZÜM: locale yolu için YALNIZ tam yol eşleşmesine bakılır (legacy konum/
// kategori kuralları locale yollarına hâlâ GİRMEZ). Aşağıdaki saf yardımcı
// kaydın uygulanıp uygulanmayacağına karar verir.
//
// FAIL-SAFE: harita boşsa / API erişilemezse resolveManagedRedirect null döner
// → istek bugünkü gibi doğrudan devam eder.
// ============================================================================

/**
 * Saf yardımcı (test edilebilir): locale yolu için uygulanacak yönlendirme.
 *   hit  — bu yolun kaydı (resolveManagedRedirect sonucu); yoksa null.
 *   back — hedefin kendi kaydı (varsa); çevrim tespiti için.
 * null dönerse istek olduğu gibi devam eder:
 *   • kayıt yok,
 *   • hedef istek yoluyla aynı (kendine yönlendirme),
 *   • hedef site içi güvenli bir yol değil ("//dış-site" → açık yönlendirme),
 *   • hedef bu yola geri dönüyor (A→B, B→A → ERR_TOO_MANY_REDIRECTS).
 */
export function managedLocaleTarget(
  pathname: string,
  hit: { to: string; code: number } | null,
  back: { to: string; code: number } | null = null,
): { to: string; code: number } | null {
  if (!hit) return null;
  const from = normalize(pathname);
  const to = normalize(hit.to);
  if (to === from) return null;
  if (!isSafeInternalPath(to)) return null;
  if (back && normalize(back.to) === from) return null;
  return { to, code: hit.code };
}

// ============================================================================
// EK (GLOBAL LOCALE 301 — ZİNCİR + UCUZ HARİTA) — ADDITIVE. Yukarıdaki hiçbir
// fonksiyon değiştirilmedi.
//
// 1) ZİNCİR / ÇEVRİM. managedLocaleTarget yalnız İKİ adımlı çevrimi (A→B, B→A)
//    görüyordu: A→B, B→C, C→A kayıtları her adımda yönlendirip sonsuz döngü
//    üretir; A→B→C ise iki ayrı 301 demektir. managedLocaleFinalTarget haritayı
//    ziyaret kümesiyle izler: zincir TEK adımda nihai hedefe düzleşir, HER
//    uzunlukta çevrimde yönlendirme yapılmaz (sayfa çizilir).
//
// 2) UCUZ HARİTA. Locale yolları daha önce middleware'de hiç beklemiyordu.
//    Haritanın süresi dolduğunda ELDEKİ (bayat) harita hemen kullanılır, yenileme
//    arka planda yapılır → API yavaşken locale istekleri 1,5 sn beklemez. Yalnız
//    süreçte hiç harita yokken (soğuk açılış) beklenir: aksi hâlde soğuk açılışta
//    eski adres 301 yerine 404 görürdü. TR yollarının harita okuması AYNEN.
// ============================================================================

/** Locale zincirinde izlenecek en çok adım; aşılırsa yönlendirme yapılmaz (tahmin yok). */
export const MANAGED_LOCALE_MAX_HOPS = 5;

/**
 * Saf yardımcı (test edilebilir): locale yolunun NİHAİ yönlendirme hedefi.
 *   lookup — normalize edilmiş yol → kayıt (haritadan); yoksa null/undefined.
 * null dönerse istek olduğu gibi devam eder:
 *   • kayıt yok,
 *   • zincirin herhangi bir yerinde çevrim (başlangıca ya da ara adıma geri dönüş),
 *   • İLK hedef site içi güvenli bir yol değil ("//dış-site" → açık yönlendirme),
 *   • zincir MANAGED_LOCALE_MAX_HOPS adımdan uzun.
 * Zincirin İLERİKİ bir adımı güvenli değilse o adım izlenmez; son güvenli hedefte durulur.
 * Kod ilk kayıttan gelir; zincirde geçici (302/307) bir adım varsa sonuç da geçicidir
 * (geçici bir taşınma, düzleştirilince kalıcıya dönüşmez).
 */
export function managedLocaleFinalTarget(
  pathname: string,
  lookup: (path: string) => { to: string; code: number } | null | undefined,
  maxHops: number = MANAGED_LOCALE_MAX_HOPS,
): { to: string; code: number } | null {
  const from = normalize(pathname);
  let hit = lookup(from) ?? null;
  if (!hit) return null;
  const seen = new Set<string>([from]);
  let to = from;
  let code = hit.code;
  for (let hop = 0; hit; hop++) {
    if (hop >= maxHops) return null;
    const next = normalize(hit.to);
    if (!isSafeInternalPath(next)) {
      if (hop === 0) return null;
      break;
    }
    if (seen.has(next)) return null;
    seen.add(next);
    if (hit.code === 302 || hit.code === 307) code = hit.code;
    to = next;
    hit = lookup(next) ?? null;
  }
  return { to, code };
}

/**
 * Locale yolu için harita: taze ise o; süresi dolmuşsa eldeki harita HEMEN döner ve yenileme
 * arka planda başlar (`defer` verilirse yenileme ona teslim edilir — Edge'de waitUntil).
 * Süreçte hiç harita yoksa beklenir (en çok TIMEOUT_MS).
 */
async function getMapForLocale(defer?: (refresh: Promise<unknown>) => void): Promise<Map<string, Entry>> {
  if (cache && cache.expiresAt > Date.now()) return cache.map;
  if (!cache) return getMap();
  const stale = cache.map;
  const refresh = getMap().catch(() => stale);
  if (defer) defer(refresh);
  return stale;
}

/**
 * Locale yolu için uygulanacak yönlendirme (zincir düzleştirilmiş, çevrimsiz); yoksa null.
 * FAIL-OPEN: harita boşsa / okunamadıysa null → istek bugünkü gibi doğrudan devam eder.
 */
export async function resolveManagedLocaleRedirect(
  pathname: string,
  defer?: (refresh: Promise<unknown>) => void,
): Promise<{ to: string; code: number } | null> {
  try {
    const map = await getMapForLocale(defer);
    if (map.size === 0) return null;
    return managedLocaleFinalTarget(pathname, (path) => map.get(path));
  } catch {
    return null;
  }
}

// ============================================================================
// EK (TR YÖNETİLEN 301 — TAŞINAN SORGU DİZESİ) — ADDITIVE. Yukarıdaki hiçbir
// fonksiyon değiştirilmedi.
//
// TR yönetilen 301 dalı isteğin sorgu dizesini hedefe taşır (gclid / utm_* kaybolmasın).
// İki sınır:
//   1) Hedef site içi güvenli bir yol DEĞİLSE ("//dış-site/yol" — normalize() bu biçimi
//      korur, tarayıcı dış siteye çözer) sorgu TAŞINMAZ: ziyaretçinin tıklama kimliği / utm
//      değerleri üçüncü bir hosta verilmez. Yönlendirmenin kendisi önceki hâliyle aynıdır
//      (kayıt operatör onaylıdır; sorgusuz Location — bu eklemeden önceki davranış).
//   2) `page` parametresi TAŞINMAZ: hedef başka bir liste olabilir (kategori birleştirme —
//      9 sayfalık kategori 3 sayfalık kategoriye taşındıysa "?page=7" hedefte 404 verir).
//      Sayfa numarası düşünce yönlendirme hedefin 1. sayfasına iner (200) — sorgu dizesi
//      taşınmadan önceki davranışla aynı. Diğer parametreler bayt bayt aynen kalır.
// ============================================================================

/**
 * Saf yardımcı (test edilebilir): TR yönetilen yönlendirmede hedefe yazılacak sorgu dizesi.
 *   to     — kaydın hedef yolu (normalize edilmiş).
 *   search — isteğin sorgu dizesi ("?a=1&b=2" ya da "").
 * Dönen değer "" ya da "?…" biçimindedir. Kalan parametreler yeniden kodlanmaz (ham parçalar korunur).
 */
export function managedRedirectSearch(to: string, search: string): string {
  if (!isSafeInternalPath(to)) return '';
  const raw = typeof search === 'string' ? search.replace(/^\?/, '') : '';
  if (!raw) return '';
  const kept = raw.split('&').filter((pair) => {
    const key = pair.split('=')[0];
    let name = key;
    try {
      name = decodeURIComponent(key.replace(/\+/g, ' '));
    } catch {
      // Bozuk yüzde-kodlu anahtar: ham hâliyle karşılaştırılır.
    }
    return name !== 'page';
  });
  const out = kept.join('&');
  return out ? `?${out}` : '';
}
