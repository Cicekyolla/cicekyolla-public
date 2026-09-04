"use client";

/**
 * CurrencyProvider / useCurrency
 * ---------------------------------------------------------------------------
 * i18n sağlayıcısının kardeşi — aynı desen, aynı garantiler:
 *
 * • SUNUCU DAİMA TRY RENDER EDER. Para birimi yalnız istemcide, mount'tan sonra
 *   uygulanır. Üç sonucu var, üçü de zorunlu:
 *     1) Hydration mismatch YOK.
 *     2) Next.js ISR / CDN önbelleğine kullanıcıya özel fiyat ASLA girmez.
 *     3) Googlebot daima TRY görür → canonical/schema deterministik kalır.
 *
 * • Kur SUNUCUDAN gelir (`/api/fx/rates`, tek istek). Ürün başına istek YOK.
 *
 * • Kur alınamıyorsa para birimi TRY'ye sabitlenir, seçici gizlenir.
 *   TRY satışı kur altyapısına BAĞLI DEĞİLDİR ve asla durmaz.
 *
 * • ⚠ BURADAN ÇIKAN HİÇBİR SAYI ÖDEMEYE/SİPARİŞE/ANALİTİĞE GİRMEZ.
 *   Sipariş gövdesinde para birimi alanı YOKTUR; PayTR TRY alır.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import {
  BASE_CURRENCY,
  CURRENCIES,
  CURRENCY_COOKIE,
  CURRENCY_COOKIE_MAX_AGE,
  CURRENCY_ENABLED,
  CURRENCY_PREVIEW_COOKIE,
  CURRENCY_PREVIEW_PARAM,
  defaultCurrencyForLocale,
  hasPreviewCookie,
  isForeignLocaleContext,
  isCurrency,
  parseCurrencyCookie,
  type Currency,
} from "./config";
import { convertMinor, priceInCurrency, rateFor, type PriceLine, type PricedTotals, type RateTable } from "./price";
import { formatMoney, type FormatOpts } from "./format";

export type { Currency };
export { CURRENCIES, BASE_CURRENCY } from "./config";
export { convertMinor, priceInCurrency } from "./price";
export { formatMoney } from "./format";

interface FxPayload {
  base: string;
  rates: RateTable;
  available: Currency[];
  bulletin_date: string | null;
  source: string | null;
  stale: boolean;
}

interface Ctx {
  currency: Currency;
  /** Gerçekten gösterilebilir para birimleri. Kur yoksa yalnız ["TRY"]. */
  available: Currency[];
  /** Seçili para TRY dışı mı? (≈ ve TRY bildirimi bununla açılır.) */
  isForeign: boolean;
  source: string | null;
  ready: boolean;
  setCurrency: (c: Currency) => void;
  /** TRY kuruş → seçili parada metin. Vitrindeki TEK para yazımı. */
  money: (baseMinor: number | string | null | undefined, opts?: FormatOpts) => string;
  /** Sepet/checkout toplamı için "≈" ekli kısa yol. */
  approx: (baseMinor: number | string | null | undefined) => string;
  /** TRY tutarını DAİMA TRY olarak yazar — tahsilat bildirimi için. */
  moneyTRY: (baseMinor: number | string | null | undefined) => string;
  price: (lines: PriceLine[], discountBaseMinor?: number, deliveryFeeBaseMinor?: number) => PricedTotals;
}

const CurrencyContext = createContext<Ctx | null>(null);

/** Para birimi bu tarayıcıda görünür olmalı mı? (bayrak veya kanarya) */
function isCurrencyVisible(): boolean {
  if (CURRENCY_ENABLED) return true;
  try {
    const param = new URLSearchParams(window.location.search).get(CURRENCY_PREVIEW_PARAM);
    if (param === "1") {
      document.cookie = `${CURRENCY_PREVIEW_COOKIE}=1; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
      return true;
    }
    if (param === "0") {
      document.cookie = `${CURRENCY_PREVIEW_COOKIE}=; path=/; max-age=0`;
      return false;
    }
    return hasPreviewCookie(document.cookie);
  } catch {
    return false;
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { locale, intl } = useI18n();

  // Sunucu + ilk istemci render'ı DAİMA TRY (hydration güvenliği).
  const [currency, setCurrencyState] = useState<Currency>(BASE_CURRENCY);
  const [fx, setFx] = useState<FxPayload | null>(null);
  const [ready, setReady] = useState(false);
  const [userPicked, setUserPicked] = useState(false);

  useEffect(() => {
    let alive = true;

    // YAYIN KAPISI — bayrak kapalı ve kanarya yoksa kur ucu HİÇ çağrılmaz.
    if (!isCurrencyVisible()) { setReady(true); return; }

    // TR ANA SİTE: para birimi seçimi geçerli değil → kur ucu HİÇ çağrılmaz.
    // (İkinci kat koruma aşağıdaki useMemo'da: locale 'tr' ise TRY'ye sabitlenir.)
    if (!isForeignLocaleContext(window.location.pathname, document.cookie)) { setReady(true); return; }

    const cookieChoice = parseCurrencyCookie(document.cookie);
    if (cookieChoice) setUserPicked(true);

    fetch("/api/fx/rates")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!alive) return;
        const data = body?.data as FxPayload | undefined;
        if (!data || !Array.isArray(data.available)) { setReady(true); return; }
        setFx(data);
        // Öncelik: kullanıcı cookie'si > dile göre varsayılan. Gösterilemeyecek
        // bir parada fiyat ASLA gösterilmez → TRY'ye düşülür.
        const wanted = cookieChoice ?? defaultCurrencyForLocale(locale);
        setCurrencyState(data.available.includes(wanted) ? wanted : BASE_CURRENCY);
        setReady(true);
      })
      .catch(() => { if (alive) setReady(true); });

    return () => { alive = false; };
    // locale yalnız İLK varsayılanı belirler; dil değişimini aşağıdaki effect yönetir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dil değişimi: kullanıcı para birimini KENDİ seçtiyse KORUNUR.
  useEffect(() => {
    if (!ready || userPicked || !fx) return;
    const wanted = defaultCurrencyForLocale(locale);
    setCurrencyState(fx.available.includes(wanted) ? wanted : BASE_CURRENCY);
  }, [locale, ready, userPicked, fx]);

  const setCurrency = useCallback((c: Currency) => {
    if (!isCurrency(c)) return;
    try {
      document.cookie = `${CURRENCY_COOKIE}=${c}; path=/; max-age=${CURRENCY_COOKIE_MAX_AGE}; samesite=lax`;
    } catch { /* cookie kapalıysa oturum içi devam */ }
    setUserPicked(true);
    setCurrencyState(c);
  }, []);

  const value = useMemo<Ctx>(() => {
    // TR'de para birimi TRY'ye SABİTLENİR: available tek elemanlı kalır →
    // CurrencySelector zaten `options.length < 2` iken kendini gizler, ve eski
    // bir `cy_currency=USD` cookie'si olan ziyaretçi Türkçe sayfada USD'de
    // KİLİTLİ KALMAZ. Yabancı dile geçtiğinde seçimi yine korunur (cookie durur).
    const trContext = locale === "tr";
    const available = !trContext && fx?.available?.length ? fx.available : [BASE_CURRENCY];
    const active: Currency = available.includes(currency) ? currency : BASE_CURRENCY;
    const rate = active === BASE_CURRENCY ? 1 : (rateFor(fx?.rates ?? null, active) ?? 1);

    const money = (baseMinor: number | string | null | undefined, opts?: FormatOpts) => {
      if (baseMinor == null) return "";
      const n = Number(baseMinor);
      if (!Number.isFinite(n)) return "";
      return formatMoney(active === BASE_CURRENCY ? n : convertMinor(n, rate), active, intl, opts);
    };

    return {
      currency: active,
      available,
      isForeign: active !== BASE_CURRENCY,
      source: fx?.source ?? null,
      ready,
      setCurrency,
      money,
      approx: (m) => money(m, { approx: true }),
      moneyTRY: (m) => formatMoney(m, BASE_CURRENCY, "tr-TR"),
      price: (lines, d = 0, f = 0) => priceInCurrency(lines, d, f, rate),
    };
    // `locale` AÇIKÇA bağımlılıkta: TR ↔ yabancı dil geçişinde para birimi
    // sabitlemesi anında yeniden hesaplanmalı. (`intl` de locale ile değişiyor
    // ama ona dolaylı güvenmek kırılgan olurdu.)
  }, [currency, fx, ready, intl, locale, setCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): Ctx {
  const ctx = useContext(CurrencyContext);
  if (ctx) return ctx;
  // Provider dışı (test / izole render) → TRY sabit, kırılmaz.
  const money = (m: number | string | null | undefined) => formatMoney(m, BASE_CURRENCY, "tr-TR");
  return {
    currency: BASE_CURRENCY,
    available: [BASE_CURRENCY],
    isForeign: false,
    source: null,
    ready: true,
    setCurrency: () => {},
    money,
    approx: money,
    moneyTRY: money,
    price: (lines, d = 0, f = 0) => priceInCurrency(lines, d, f, 1),
  };
}

export function useMoney() {
  return useCurrency().money;
}
