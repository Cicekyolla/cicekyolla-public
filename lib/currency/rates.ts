// ---------------------------------------------------------------------------
// KUR KAYNAĞI — TCMB günlük bülteni. Yalnız SUNUCUDA çalışır (route handler).
//
// ═══ HANGİ KUR ALANI? → MID = (ForexBuying + ForexSelling) / 2 ═══════════════
//
// TCMB her para birimi için DÖRT alan yayımlar:
//   ForexBuying / ForexSelling        → döviz (havale/hesap) alış / satış
//   BanknoteBuying / BanknoteSelling  → efektif (nakit banknot) alış / satış
//
// Seçim GEREKÇESİ (varsayım değil, ölçüm — 04.09.2026 bülteni):
//
//  1) BİZ DÖVİZ ALIP SATMIYORUZ. ÇiçekYolla TRY tahsil eder; çevrimi müşterinin
//     kendi bankası yapar. "Alış" ve "satış" bir bankanın işlemdeki İKİ TARAFIDIR;
//     birini seçmek, sahip olmadığımız bir pozisyonu benimsemek olurdu.
//
//  2) İKİ TARAF DA TERS YÖNDE SİSTEMATİK SAPMALI. Aynı ürün (₺2.999):
//        ForexBuying  48,2326 → $62,18   (daha fazla dolar gösterir)
//        ForexSelling 48,3195 → $62,07   (daha az dolar gösterir)
//     Gerçek, ikisinin arasındadır. Birini sabitlemek her fiyatta sessiz ve
//     tek yönlü bir yanlılık üretir.
//
//  3) MID NÖTR REFERANSTIR ve gösterim için fiili standarttır (XE/Google/Wise
//     "kur" derken bunu gösterir). Ayrıca SİMETRİKTİR: TRY→USD ve USD→TRY aynı
//     kurla birbirinin tam tersidir, gidiş-dönüş kayma üretmez.
//
//  4) HATA BANDI ÖLÇÜLDÜ VE EN KÜÇÜĞÜ BUDUR. Forex spread'i %0,18; $62'lik bir
//     üründe alış↔satış farkı 0,11 USD. MID her iki tarafa da spread'in YARISI
//     kadar uzaktır (±0,056 USD) — yani üç seçenek içinde en kötü durumu
//     matematiksel olarak minimize eden tek seçim.
//
//  5) EFEKTİF (Banknote) ALANLARI BURADA YANLIŞTIR: onlar gişede fiziksel
//     banknot bozdurma kurudur; kartla yapılan bir işlemle ilgisi yoktur.
//     Bu dosya o alanları HİÇ OKUMAZ.
//
//  6) Zaten müşterinin gerçek maliyeti kendi bankasının kuru + komisyonudur ve
//     bunu bilemeyiz. §6 bildirimi tam bu yüzden var. MID dürüst olandır:
//     yansız referans + "bankanız kendi kurunu uygulayabilir" açıklaması.
//
// GÜVENLİK: kur alınamaz veya kabul edilemeyecek kadar eskiyse USD/EUR KAPANIR
// ve vitrin TRY ile çalışmaya devam eder. Eski/uydurma kurla fiyat gösterilmez.
// ---------------------------------------------------------------------------
import type { Currency } from "./config";

export const FX_SOURCE = "TCMB";

/** Bülten bu süreden eskiyse tazeleme denenir (başarısızsa mevcutla devam). */
export const FRESH_TTL_MS = 6 * 60 * 60 * 1000; // 6 saat

/**
 * Bülten bundan eskiyse USD/EUR KAPANIR. 7 gün: TCMB hafta sonu ve resmî
 * tatilde bülten yayımlamaz; 9 günlük bayramda bile son iş gününün bülteni
 * geçerlidir. 7 günü aşan boşluk artık tatil değil, gerçek bir arızadır.
 */
export const MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000;

/** today.xml yoksa (hafta sonu/tatil) arşivde geriye taranacak gün sayısı. */
const ARCHIVE_LOOKBACK_DAYS = 10;
const FETCH_TIMEOUT_MS = 8000;

export interface FxRates {
  base: "TRY";
  /** 1 birim para için kaç TRY (MID). TRY daima 1. */
  rates: Record<Currency, number>;
  source: string;
  /** Bültenin günü (YYYY-MM-DD). */
  bulletin_date: string;
  fetched_at: string;
  stale: boolean;
}

// ── Saf yardımcılar (ağ yok → doğrudan test edilir) ────────────────────────

/**
 * Bir para birimi için GÖSTERİM kuru.
 * Kural: MID = (alış + satış) / 2.
 * Savunmacı geri düşüş: TCMB bir tarafı yayımlamazsa var olan taraf kullanılır
 * (asla alış ile EFEKTİF satışı gibi farklı aileler KARIŞTIRILMAZ).
 * Hiçbiri yoksa null → o para birimi satılabilir sayılmaz.
 */
export function displayRate(forexBuying: number | null, forexSelling: number | null): number | null {
  const b = Number.isFinite(forexBuying) && (forexBuying as number) > 0 ? (forexBuying as number) : null;
  const s = Number.isFinite(forexSelling) && (forexSelling as number) > 0 ? (forexSelling as number) : null;
  if (b != null && s != null) return (b + s) / 2;
  return b ?? s ?? null;
}

/** TCMB bülten XML'ini MID kur tablosuna çevirir. */
export function parseTcmbXml(xml: string): { rates: Record<Currency, number>; bulletin_date: string } | null {
  const tarih = /Tarih="(\d{2})\.(\d{2})\.(\d{4})"/.exec(xml);
  if (!tarih) return null;
  const bulletin_date = `${tarih[3]}-${tarih[2]}-${tarih[1]}`;

  const rates: Record<Currency, number> = { TRY: 1, USD: NaN, EUR: NaN };
  for (const kod of ["USD", "EUR"] as const) {
    const blok = new RegExp(`<Currency[^>]*CurrencyCode="${kod}"[\\s\\S]*?</Currency>`).exec(xml)?.[0];
    if (!blok) return null;
    const num = (tag: string): number | null => {
      const m = new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(blok);
      if (!m) return null;
      const v = parseFloat(m[1].trim());
      return Number.isFinite(v) ? v : null;
    };
    // Bazı para birimleri 100 birim üzerinden kote edilir (JPY). USD/EUR'da
    // Unit=1'dir ama bölme genel doğruluk için yine uygulanır.
    const unit = num("Unit") ?? 1;
    const mid = displayRate(num("ForexBuying"), num("ForexSelling"));
    if (mid == null || unit <= 0) return null;
    rates[kod] = mid / unit;
  }
  if (!Number.isFinite(rates.USD) || !Number.isFinite(rates.EUR)) return null;
  return { rates, bulletin_date };
}

/** Bülten tarihinden bu yana geçen süre (ms). Gün sonu baz alınır. */
export function bulletinAgeMs(bulletinDate: string, now: Date = new Date()): number {
  const t = Date.parse(`${bulletinDate}T23:59:59+03:00`);
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return Math.max(0, now.getTime() - t);
}

/** Kur gösterilebilir mi? Aşılırsa USD/EUR kapanır, TRY etkilenmez. */
export function isUsable(bulletinDate: string, now: Date = new Date()): boolean {
  return bulletinAgeMs(bulletinDate, now) <= MAX_STALE_MS;
}

// ── Ağ + önbellek (yalnız sunucu) ──────────────────────────────────────────

function tcmbUrl(d: Date | null): string {
  if (!d) return "https://www.tcmb.gov.tr/kurlar/today.xml";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `https://www.tcmb.gov.tr/kurlar/${y}${m}/${dd}${m}${y}.xml`;
}

async function fetchXml(url: string): Promise<string | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { accept: "application/xml" },
      // Bülten günde bir kez değişir; edge'de paylaşılır (kullanıcıya özel değil).
      next: { revalidate: 21600 },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

let cached: FxRates | null = null;

/**
 * Geçerli kur tablosu. Kullanılabilir kur yoksa `null` — çağıran USD/EUR'u
 * kapatır ve TRY akışına DOKUNMAZ.
 */
export async function getRates(now: Date = new Date()): Promise<FxRates | null> {
  const recent = cached && now.getTime() - Date.parse(cached.fetched_at) < FRESH_TTL_MS;
  if (cached && recent) {
    // Tazelik İKİ ayrı şeydir ve ikisi de zorunludur: "ne zaman çektik"
    // gereksiz isteği önler, "kur hangi güne ait" YANLIŞ FİYATI önler.
    // Bir aylık bülteni bugün çekmiş olmak onu güncel yapmaz.
    if (!isUsable(cached.bulletin_date, now)) return null;
    return { ...cached, stale: bulletinAgeMs(cached.bulletin_date, now) > FRESH_TTL_MS };
  }

  let parsed = null as ReturnType<typeof parseTcmbXml>;
  const todayXml = await fetchXml(tcmbUrl(null));
  if (todayXml) parsed = parseTcmbXml(todayXml);
  if (!parsed) {
    // Hafta sonu/tatilde today.xml 404 verir → arşivde geriye tara.
    for (let back = 1; back <= ARCHIVE_LOOKBACK_DAYS && !parsed; back++) {
      const xml = await fetchXml(tcmbUrl(new Date(now.getTime() - back * 86400000)));
      if (xml) parsed = parseTcmbXml(xml);
    }
  }
  if (parsed) {
    cached = {
      base: "TRY",
      rates: parsed.rates,
      source: FX_SOURCE,
      bulletin_date: parsed.bulletin_date,
      fetched_at: new Date().toISOString(),
      stale: false,
    };
  }

  if (!cached) return null;
  if (!isUsable(cached.bulletin_date, now)) return null;
  return { ...cached, stale: bulletinAgeMs(cached.bulletin_date, now) > FRESH_TTL_MS };
}

/** Test/kontrol amaçlı. */
export function __resetRateCache(): void { cached = null; }
export function __seedRateCache(r: FxRates | null): void { cached = r; }
