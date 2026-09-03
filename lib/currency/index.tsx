"use client";

/**
 * CurrencyProvider / useCurrency / useMoney
 * ---------------------------------------------------------------------------
 * i18n sağlayıcısının kardeşi — aynı desen, aynı güvenlik garantileri:
 *
 * • SUNUCU DAİMA TRY RENDER EDER. Kur ve para birimi yalnız istemcide, mount'tan
 *   sonra uygulanır. Bunun üç sonucu var ve üçü de zorunlu:
 *     1) Hydration mismatch YOK (§37).
 *     2) Next.js ISR / CDN önbelleğine ASLA kullanıcıya özel fiyat girmez —
 *        bir müşterinin USD fiyatı başkasına önbellekten gidemez (§39).
 *     3) Googlebot her zaman TRY görür; structured data ve canonical
 *        deterministik kalır (§37/§38).
 *
 * • Kur SUNUCUDAN gelir (`/api/fx/rates`). Kategori sayfasında 60 ürün olsa da
 *   TEK istek atılır — ürün başına kur isteği YOK (§47).
 *
 * • Kur alınamıyorsa para birimi TRY'ye sabitlenir ve seçici yalnız TRY gösterir.
 *   TRY satışı kur altyapısına BAĞLI DEĞİLDİR ve asla durmaz (§10).
 *
 * • Para birimi değişimi yalnız cookie + gösterimdir. Sepet, adres, teslimat,
 *   slot, ürün fiyatı (TRY taban) DOKUNULMAZ — dil değişimiyle aynı sözleşme.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import {
  BASE_CURRENCY,
  CURRENCIES,
  CURRENCY_COOKIE,
  CURRENCY_COOKIE_MAX_AGE,
  defaultCurrencyForLocale,
  isCurrency,
  parseCurrencyCookie,
  type Currency,
} from "./config";
import { convertMinor, priceInCurrency, rateFor, type PriceLine, type PricedTotals, type RateTable } from "./price";
import { formatMoney } from "./format";

export type { Currency };
export { CURRENCIES, BASE_CURRENCY } from "./config";
export { convertMinor, priceInCurrency } from "./price";
export { formatMoney } from "./format";

interface FxPayload {
  base: string;
  rates: RateTable;
  available: Currency[];
  rate_id: string | null;
  bulletin_date: string | null;
  source: string | null;
  stale: boolean;
}

interface Ctx {
  currency: Currency;
  /** Gerçekten satılabilir para birimleri. Kur yoksa yalnız ["TRY"]. */
  available: Currency[];
  /** 1 birim `currency` kaç TRY. TRY'de 1. */
  rate: number;
  /** Müşterinin fiyatı gördüğü kur bülteninin kimliği — sipariş isteğine eklenir. */
  rateId: string | null;
  /** Kur kaynağı (TCMB) — bilgilendirme satırı için. */
  source: string | null;
  /** Kur yüklendi mi? false iken TRY gösterilir. */
  ready: boolean;
  setCurrency: (c: Currency) => void;
  /** TRY kuruş → seçili parada biçimlenmiş metin. Vitrindeki TEK para yazımı. */
  money: (baseMinor: number | string | null | undefined) => string;
  /** TRY kuruş → seçili parada minor tam sayı (analitik/checkout için). */
  toMinor: (baseMinor: number) => number;
  /** Sipariş toplamı — backend ile birebir aynı algoritma. */
  price: (lines: PriceLine[], discountBaseMinor?: number, deliveryFeeBaseMinor?: number) => PricedTotals;
}

const CurrencyContext = createContext<Ctx | null>(null);

function writeCookie(c: Currency) {
  try {
    document.cookie = `${CURRENCY_COOKIE}=${c}; path=/; max-age=${CURRENCY_COOKIE_MAX_AGE}; samesite=lax`;
  } catch {
    /* cookie kapalıysa oturum içi devam eder */
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { locale, intl } = useI18n();

  // Sunucu + ilk istemci render'ı DAİMA TRY (hydration güvenliği).
  const [currency, setCurrencyState] = useState<Currency>(BASE_CURRENCY);
  const [fx, setFx] = useState<FxPayload | null>(null);
  const [ready, setReady] = useState(false);
  /** Kullanıcı bilinçli seçim yaptı mı? (cookie varsa evet) */
  const [userPicked, setUserPicked] = useState(false);

  useEffect(() => {
    let alive = true;
    const cookieChoice = parseCurrencyCookie(document.cookie);
    if (cookieChoice) setUserPicked(true);

    fetch("/api/fx/rates")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!alive) return;
        const data = body?.data as FxPayload | undefined;
        if (!data || !Array.isArray(data.available)) { setReady(true); return; }
        setFx(data);
        // Seçim önceliği: kullanıcının cookie'si > dile göre varsayılan.
        // Kur o an satılabilir değilse (bayat/erişilemez) TRY'ye düşülür —
        // müşteriye gösterilemeyecek bir parada fiyat ASLA gösterilmez.
        const wanted = cookieChoice ?? defaultCurrencyForLocale(locale);
        setCurrencyState(data.available.includes(wanted) ? wanted : BASE_CURRENCY);
        setReady(true);
      })
      .catch(() => { if (alive) setReady(true); });

    return () => { alive = false; };
    // locale yalnız İLK varsayılanı belirler; dil değişimi para birimini
    // ezmesin diye bağımlılık listesi bilerek boş (aşağıdaki effect yönetir).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dil değişimi (§14): kullanıcı para birimini KENDİ seçtiyse KORUNUR.
  // Seçmediyse yeni dilin mantıklı varsayılanına geçilir.
  useEffect(() => {
    if (!ready || userPicked || !fx) return;
    const wanted = defaultCurrencyForLocale(locale);
    setCurrencyState(fx.available.includes(wanted) ? wanted : BASE_CURRENCY);
  }, [locale, ready, userPicked, fx]);

  const setCurrency = useCallback((c: Currency) => {
    if (!isCurrency(c)) return;
    writeCookie(c);
    setUserPicked(true);
    setCurrencyState(c);
  }, []);

  const value = useMemo<Ctx>(() => {
    const available = fx?.available?.length ? fx.available : [BASE_CURRENCY];
    // Seçili para satılabilir değilse gösterim TRY'ye düşer (fiyat uydurulmaz).
    const active: Currency = available.includes(currency) ? currency : BASE_CURRENCY;
    const rate = rateFor(fx?.rates ?? null, active) ?? 1;
    const safeRate = active === BASE_CURRENCY ? 1 : rate;

    return {
      currency: active,
      available,
      rate: safeRate,
      rateId: active === BASE_CURRENCY ? null : fx?.rate_id ?? null,
      source: fx?.source ?? null,
      ready,
      setCurrency,
      money: (baseMinor) => {
        if (baseMinor == null) return "";
        const n = Number(baseMinor);
        if (!Number.isFinite(n)) return "";
        return formatMoney(active === BASE_CURRENCY ? n : convertMinor(n, safeRate), active, intl);
      },
      toMinor: (baseMinor) => (active === BASE_CURRENCY ? Math.round(baseMinor) : convertMinor(baseMinor, safeRate)),
      price: (lines, discountBaseMinor = 0, deliveryFeeBaseMinor = 0) =>
        priceInCurrency(lines, discountBaseMinor, deliveryFeeBaseMinor, safeRate),
    };
  }, [currency, fx, ready, intl, setCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): Ctx {
  const ctx = useContext(CurrencyContext);
  if (ctx) return ctx;
  // Provider dışı (test / izole render / sunucu bileşeni) → TRY sabit, kırılmaz.
  // Bu dal sayesinde hiçbir bileşen provider'a BAĞIMLI hâle gelmez.
  return {
    currency: BASE_CURRENCY,
    available: [BASE_CURRENCY],
    rate: 1,
    rateId: null,
    source: null,
    ready: true,
    setCurrency: () => {},
    money: (m) => formatMoney(m, BASE_CURRENCY, "tr-TR"),
    toMinor: (m) => Math.round(m),
    price: (lines, d = 0, f = 0) => priceInCurrency(lines, d, f, 1),
  };
}

/** Kısa yol: yalnız para yazımı gereken bileşenler için. */
export function useMoney() {
  return useCurrency().money;
}
