// ============================================================================
// hreflang AİLESİ — Türkçe sayfaların veri okumaları (ADDITIVE; SEO yayın zinciri).
// Küme kurma mantığı saf modülde: lib/global/hreflangFamily.ts. Burada yalnız okuma var.
// Next/DOM bağımlılığı yok → lib/hreflangSources.test.ts (fetch ve saat enjekte edilir).
//
// NEDEN AYRI DOSYA: lib/global/api.ts'in kuralı "no-store"dur (locale rotaları
// force-dynamic; yayından kaldırma anında yansır). Türkçe sayfalar ise ISR / Data Cache
// kullanır — no-store bir fetch ISR rotasını dinamiğe çevirir. Buradaki okumalar bu
// yüzden `next: { revalidate: 300 }` ile yapılır (Türkçe kümede en çok 5 dk gecikme).
//
// FAIL-OPEN: her okuma süre sınırlıdır; uç yok (404) / yavaş / hata → null → çağıran
// hreflang BASMAZ (bugünkü davranış). Vitrin API'den önce de sonra da yayınlanabilir.
//  • Süre sınırı 2,5 sn ve süre dolunca TEKRAR DENENMEZ (en kötü bekleme 2,5 sn; kopan
//    soket gibi hızlı hatalar bir kez tekrar denenir — lib/fetchWithDeadline.ts).
//  • 404 "yok" notu (5 dk, süreç içi): Next Data Cache yalnız 200 yanıtı saklar; uç henüz
//    yayında değilken her sayfa görüntülemesi aynı 404'ü yeniden sormasın.
//  • Devre kesici (süreç içi), iki ayrı kapsam:
//      – YOL başına 60 sn: 404 dışı hata durumu (5xx …) YALNIZ o yolu duraklatır. Tek bir
//        ürünün hatası başka ürünlerin hreflang'ini kesmez.
//      – AİLE başına 10 sn: zaman aşımı / ağ hatası "API yanıt vermiyor" demektir → aynı
//        ailenin hiçbir yolu kısa süre sorulmaz; API yavaşken her sayfa görüntülemesi süre
//        sınırı kadar beklemez.
//    Duraklama süresince Türkçe sayfa hreflang basmaz; locale sayfası aynı ucu süre sınırı
//    olmadan okuduğu için o pencerede `tr`yi listelemeyi sürdürebilir (tek yönlü bağ Google
//    tarafından yok sayılır, bir sonraki taramada düzelir). Pencere bilinçli olarak kısadır.
// ============================================================================
import { fetchWithDeadline } from "./fetchWithDeadline.ts";
import { GLOBAL_LOCALES } from "./global/config.ts";
import { X_DEFAULT_LOCALE } from "./global/hreflang.ts";
import type { LocaleVersion } from "./global/hreflangFamily.ts";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export const HREFLANG_REVALIDATE_S = 300;
export const HREFLANG_DEADLINE_MS = 2_500;
export const HREFLANG_MISSING_MEMO_MS = 5 * 60_000;
/** 404 dışı hata durumu (5xx …): YALNIZ o yol bu kadar süre sorulmaz. */
export const HREFLANG_PAUSE_MS = 60_000;
/** Zaman aşımı / ağ hatası: uç AİLESİ bu kadar süre sorulmaz (API yanıt vermiyor). */
export const HREFLANG_FAMILY_PAUSE_MS = 10_000;
const MEMO_CAP = 2_000;

/** Ürün / kategori locale sürümleri yanıtı (product-locales/:id, category-locales/:id). */
export interface LocaleVersionsPayload {
  tr_slug?: string | null;
  locales?: LocaleVersion[] | null;
}

/** ok=false → OKUNAMADI (duraklatılmış / 5xx / zaman aşımı / ağ / bozuk gövde); ok=true + data=null → yanıt geldi, veri yok (404 dahil). */
export interface HreflangRead<T> {
  ok: boolean;
  data: T | null;
}

export interface HreflangReader {
  /** `family`: devre kesici anahtarı (uç ailesi); `path`: API yolu. Hiçbir koşulda fırlatmaz. */
  read<T>(family: string, path: string): Promise<T | null>;
  /** read() ile aynı okuma; "veri yok" ile "okunamadı" ayrımını da taşır. Hiçbir koşulda fırlatmaz. */
  readChecked<T>(family: string, path: string): Promise<HreflangRead<T>>;
}

/**
 * Okuyucu fabrikası (fetch ve saat enjekte edilebilir → birim testi). fetch verilmezse HER ÇAĞRIDA
 * o anki global fetch kullanılır (modül yüklenirken yakalanmaz → Next'in önbellekli fetch'i kesin devrede).
 */
export function createHreflangReader(
  fetchFn?: typeof fetch,
  now: () => number = Date.now,
  origin: string = API_ORIGIN,
): HreflangReader {
  const missingUntil = new Map<string, number>();
  const pathPausedUntil = new Map<string, number>();
  const familyPausedUntil = new Map<string, number>();
  const failed = { ok: false, data: null } as const;
  async function readChecked<T>(family: string, path: string): Promise<HreflangRead<T>> {
    const t = now();
    if ((familyPausedUntil.get(family) ?? 0) > t) return failed;
    if ((pathPausedUntil.get(path) ?? 0) > t) return failed;
    if ((missingUntil.get(path) ?? 0) > t) return { ok: true, data: null };
    // Hata DURUMU / bozuk gövde bu yola özgü olabilir (tek bir kaydın hatası) → yalnız bu yol duraklar.
    const pausePath = (): HreflangRead<T> => {
      if (pathPausedUntil.size >= MEMO_CAP) pathPausedUntil.clear();
      pathPausedUntil.set(path, now() + HREFLANG_PAUSE_MS);
      return failed;
    };
    let res: Response;
    try {
      res = await fetchWithDeadline(
        `${origin}${path}`,
        { next: { revalidate: HREFLANG_REVALIDATE_S } },
        HREFLANG_DEADLINE_MS,
        fetchFn ?? fetch,
        false,
      );
    } catch {
      // Zaman aşımı / ağ hatası: API yanıt vermiyor → aile kısa süre sorulmaz.
      familyPausedUntil.set(family, now() + HREFLANG_FAMILY_PAUSE_MS);
      return failed;
    }
    if (res.status === 404) {
      if (missingUntil.size >= MEMO_CAP) missingUntil.clear();
      missingUntil.set(path, now() + HREFLANG_MISSING_MEMO_MS);
      return { ok: true, data: null };
    }
    if (!res.ok) return pausePath();
    try {
      const body = (await res.json()) as { data?: T } | null;
      return { ok: true, data: body?.data ?? null };
    } catch {
      return pausePath();
    }
  }
  return {
    readChecked,
    async read<T>(family: string, path: string): Promise<T | null> {
      return (await readChecked<T>(family, path)).data;
    },
  };
}

const reader = createHreflangReader();

/** Kimlik yalnız rakamsa geçerlidir (yol enjeksiyonu yok); aksi hâlde null. */
function numericId(id: unknown): string | null {
  const s = typeof id === "number" || typeof id === "string" ? String(id) : "";
  return /^\d{1,12}$/.test(s) ? s : null;
}

/** ÜRÜN: locale sürümleri (mevcut uç product-locales/:id). null → küme basılmaz. */
export async function fetchProductLocaleVersions(
  productId: unknown,
): Promise<LocaleVersionsPayload | null> {
  const id = numericId(productId);
  if (!id) return null;
  return reader.read<LocaleVersionsPayload>("product-locales", `/api/public/translations/surface/product-locales/${id}`);
}

/** KATEGORİ: locale sürümleri (YENİ uç category-locales/:id; eski API'de 404 → null). */
export async function fetchCategoryLocaleVersions(
  categoryId: unknown,
): Promise<LocaleVersionsPayload | null> {
  const id = numericId(categoryId);
  if (!id) return null;
  return reader.read<LocaleVersionsPayload>("category-locales", `/api/public/translations/surface/category-locales/${id}`);
}

/**
 * ANA SAYFA: onaylı locale ana sayfaları. Locale ana sayfasının zaten kullandığı uç
 * (global/page?key=home) — onaylı TEK satırın `locales` alanı kümenin TAMAMINI taşır.
 * Çapa = EN (x-default dili): normalde tek istek. EN ana sayfası onaylı değilse (satır yok)
 * diğer dillerin satırlarına paralel bakılır ve ilk onaylı satır kullanılır → Türkçe ana
 * sayfa, EN olmasa da indexlenebilir her locale ana sayfasıyla karşılıklı kalır. Hiç satır
 * yok / okuma hatası → null → Türkçe ana sayfa hreflang basmaz (fail-open).
 * Çapa OKUNAMADIYSA (5xx / zaman aşımı / ağ) diğer dillere SORULMAZ: API arızalıyken 13 istek
 * atılmaz (karar okumanın `ok` alanından; devre kesicinin yan etkisine bağlı değildir).
 */
export async function readHomeLocaleVersions(r: HreflangReader): Promise<LocaleVersion[] | null> {
  const path = (locale: string) => `/api/public/global/page?locale=${locale}&key=home`;
  const ask = (locale: string) => r.read<{ locales?: LocaleVersion[] | null }>("global-home", path(locale));
  const anchor = await r.readChecked<{ locales?: LocaleVersion[] | null }>("global-home", path(X_DEFAULT_LOCALE));
  if (!anchor.ok) return null;
  if (anchor.data) return Array.isArray(anchor.data.locales) ? anchor.data.locales : null;
  const rows = await Promise.all(GLOBAL_LOCALES.filter((l) => l !== X_DEFAULT_LOCALE).map(ask));
  return rows.find((row) => Array.isArray(row?.locales))?.locales ?? null;
}

export function fetchHomeLocaleVersions(): Promise<LocaleVersion[] | null> {
  return readHomeLocaleVersions(reader);
}
