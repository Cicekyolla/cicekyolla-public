"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, X, Loader2, MessageCircle, Clock, CreditCard } from "lucide-react";
import { paytrStatus, initProviderRetry, CheckoutApiError, SUPPORT_WHATSAPP, type PaytrStatus } from "@/lib/payment";
import { trackPaidPurchase } from "@/lib/purchaseAnalytics";
import { useCart } from "@/lib/cart";
import { clearPendingDelivery } from "@/lib/pendingDelivery";
import { clearPendingCoupon } from "@/lib/pendingCoupon";
import { dropCardCheckout, readCardCheckout, settleCardCheckout, stashCardCheckout, tabStorage } from "@/lib/cardCheckoutSettle";
import { resolveResultView, retryErrorView, retryErrorMessageKey, providerBrand, readRetryInfo, saveRetryInfo, isEmailLike, type ResultView } from "@/lib/paymentRetry";
import { useI18n } from "@/lib/i18n";
import type { DictKey } from "@/lib/i18n/dict/tr";

/* /checkout/sonuc — kart ödemesi dönüş sayfası (PayTR ana, iyzico yedek).
   Durum YALNIZ sunucudan okunur (imzalı/doğrulanmış bildirim); adres çubuğundaki
   ?fail=1 karar vermez. Ödeme onaylanınca sipariş numarası GÖSTERİLİR.
   • Kesin başarısız + yedek açık → "Diğer ödeme altyapımızla tekrar deneyin" (müşteri tıklar).
   • Sonuç belirsiz → "kontrol ediliyor"; yedek altyapı ASLA sunulmaz (çift çekim kalkanı). */

const FAST_POLLS = 14;          // ~40 sn hızlı kontrol (3 sn aralık)
const SLOW_POLL_MS = 15000;     // sonra 15 sn aralık
const MAX_POLL_MS = 15 * 60000; // en fazla 15 dk

function Sonuc() {
  const params = useSearchParams();
  const oid = params.get("oid") ?? "";

  const [view, setView] = useState<ResultView>("checking");
  const [status, setStatus] = useState<PaytrStatus | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  // Sunucunun onayladığı ödeme (HMAC doğrulanmış callback → payments.status='paid').
  const [confirmed, setConfirmed] = useState<PaytrStatus | null>(null);
  const [retryBusy, setRetryBusy] = useState(false);
  // C7: mesaj sözlük ANAHTARI olarak tutulur → müşterinin dilinde gösterilir (TR metni aynı).
  const [retryMsg, setRetryMsg] = useState<DictKey | null>(null);
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [pollKey, setPollKey] = useState(0);
  const { items, hydrated, removeItem } = useCart();
  const settledRef = useRef(false);

  /* SEPET — yalnız DOĞRULANMIŞ ödemeden sonra ve yalnız bu sekmede ödemeye
     giden satırlar düşer (lib/cardCheckoutSettle.ts). Başarısız / bekleyen
     ödemede ve not yoksa (başka sekme, doğrudan ziyaret) sepete dokunulmaz;
     not silindiği için sayfa yenilemesi ikinci kez temizlemez. */
  useEffect(() => {
    if (!confirmed || !hydrated || settledRef.current) return;
    settledRef.current = true;
    const storage = tabStorage();
    const stash = readCardCheckout(storage, oid);
    const decision = settleCardCheckout({ oid, status: confirmed, stash, items });
    if (!decision.settle) return;
    for (const key of decision.removedKeys) removeItem(key);
    // Havale başarısıyla aynı: kupon/teslimat köprüsü ve form taslağı kapanır.
    clearPendingDelivery();
    clearPendingCoupon();
    if (stash?.draftKey) { try { storage?.removeItem(stash.draftKey); } catch { /* yok say */ } }
    dropCardCheckout(storage, oid);
  }, [confirmed, hydrated, items, oid, removeItem]);

  /* ÇERÇEVEDEN ÇIKIŞ — PayTR site içinde <iframe> ile gösterildiğinde
     merchant_ok_url / merchant_fail_url ÇERÇEVENİN İÇİNE yüklenir. O hâlde
     sipariş sonucu minik bir kutunun içinde kalır, üstelik sepet/analytics
     bağlamı da çerçevede sıkışır. Aynı origin olduğumuz için üst pencereyi
     bu adrese taşıyabiliyoruz. Yönlendirme akışında (çerçeve yokken) bu blok
     hiçbir şey yapmaz — davranış birebir aynı kalır. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.top && window.top !== window.self) {
      try { window.top.location.replace(window.location.href); } catch { /* farklı origin → yok say */ }
    }
  }, []);

  useEffect(() => {
    if (!oid) { setView("failed"); return; }
    let alive = true;
    let tries = 0;
    const startedAt = Date.now();
    const canRetryHere = readRetryInfo(tabStorage(), oid) !== null;
    const tick = async () => {
      let s: PaytrStatus | null = null;
      try {
        s = await paytrStatus(oid);
        if (!alive) return;
        if (s.paid && s.order_number) {
          trackPaidPurchase(s);
          setOrderNumber(s.order_number);
          setConfirmed(s);
          setView("paid");
          return;
        }
      } catch { /* ağ hatası → tekrar dene */ }
      if (!alive) return;
      tries += 1;
      const next = resolveResultView(s, tries >= FAST_POLLS, canRetryHere);
      setStatus(s);
      if (next === "retry" || next === "failed") { setView(next); return; } // sunucu kesin başarısız dedi
      // Zaman aşımı BAŞARISIZLIK DEĞİLDİR: belirsizse "kontrol ediliyor" + seyrek kontrol sürer.
      setView(next);
      if (Date.now() - startedAt > MAX_POLL_MS) return;
      window.setTimeout(tick, tries < FAST_POLLS ? 3000 : SLOW_POLL_MS);
    };
    tick();
    return () => { alive = false; };
  }, [oid, pollKey]);

  const provider = status?.retry_provider ?? null;
  const needsEmail = Boolean(status?.retry_needs_email);

  const startRetry = async () => {
    if (!provider || retryBusy) return;
    const storage = tabStorage();
    const info = readRetryInfo(storage, oid);
    if (!info) { setView("failed"); return; }
    if (needsEmail && !isEmailLike(email)) { setRetryMsg("payres.emailInvalid"); return; }
    setRetryBusy(true);
    setRetryMsg(null);
    try {
      const r = await initProviderRetry(provider, {
        order_id: info.order_id, retry_key: info.retry_key, payment_locale: "tr",
        ...(needsEmail ? { email: email.trim() } : {}),
      });
      // Yeni deneme referansı için bu sekmenin notları taşınır (sepet yalnız onaydan sonra düşer).
      saveRetryInfo(storage, { oid: r.merchant_oid, order_id: r.order_id, retry_key: r.retry_key });
      const stash = readCardCheckout(storage, oid);
      if (stash) stashCardCheckout(storage, { oid: r.merchant_oid, cartKeys: stash.cartKeys, draftKey: stash.draftKey });
      const target = r.payment_page_url || r.iframe_url;
      if (!target) throw new CheckoutApiError(502, "unavailable");
      window.location.href = target;
    } catch (failure) {
      const apiError = failure instanceof CheckoutApiError ? failure.apiError : null;
      const code = failure instanceof CheckoutApiError ? failure.status : 0;
      const next = retryErrorView(apiError, code);
      setRetryMsg(retryErrorMessageKey(apiError, code));
      setRetryBusy(false);
      if (next.view === "checking" || next.view === "uncertain") { setView(next.view); setPollKey((k) => k + 1); return; }
      setView(next.view);
    }
  };

  return (
    <main className="max-w-lg mx-auto px-5 py-20 text-center">
      {view === "checking" && (
        <>
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-6" />
          <h1 className="font-display text-2xl font-bold text-foreground">{t("payres.checkingTitle")}</h1>
          <p className="text-muted-foreground mt-2">{t("payres.checkingText")}</p>
        </>
      )}

      {view === "uncertain" && (
        <>
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-5">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">{t("payres.uncertainTitle")}</h1>
          <p className="text-muted-foreground mt-2">{t("payres.uncertainText")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
            <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 rounded-2xl border border-border text-foreground font-bold px-7 py-3.5 hover:bg-secondary transition-colors">
              <MessageCircle className="w-4 h-4" /> {t("payres.support")}
            </a>
          </div>
        </>
      )}

      {view === "paid" && (
        <>
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-5">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">{t("payres.paidTitle")}</h1>
          <p className="text-muted-foreground mt-2">{t("payres.paidText")}</p>
          <p className="text-[22px] font-bold text-accent-foreground mt-1 tracking-wide">{orderNumber}</p>
          <Link href={`/siparis-takip?order=${encodeURIComponent(orderNumber ?? "")}`} className="inline-block mt-6 rounded-2xl bg-primary text-primary-foreground font-bold px-7 py-3.5 hover:bg-accent-foreground transition-colors">
            {t("payres.track")}
          </Link>
        </>
      )}

      {view === "retry" && provider && (
        <>
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-5">
            <CreditCard className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">{t("payres.failedTitle")}</h1>
          <p className="text-muted-foreground mt-2">{t("payres.retryText")}</p>
          {needsEmail && (
            <label className="block text-left mt-6">
              <span className="text-sm font-semibold text-foreground">{t("payres.emailLabel")}</span>
              <input
                type="email" inputMode="email" autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-border bg-input-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t("payres.emailPlaceholder")}
              />
            </label>
          )}
          {retryMsg && <p className="text-destructive text-sm mt-4" role="alert">{t(retryMsg)}</p>}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
            <button type="button" onClick={startRetry} disabled={retryBusy}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground font-bold px-7 py-3.5 hover:bg-accent-foreground transition-colors disabled:opacity-60">
              {retryBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {t("payres.payWith", { provider: providerBrand(provider) })}
            </button>
            <Link href="/checkout" className="rounded-2xl border border-border text-foreground font-bold px-7 py-3.5 hover:bg-secondary transition-colors">
              {t("payres.otherMethod")}
            </Link>
          </div>
        </>
      )}

      {view === "failed" && (
        <>
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-5">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">{t("payres.failedTitle")}</h1>
          <p className="text-muted-foreground mt-2">{t("payres.failedText")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
            <Link href="/checkout" className="rounded-2xl bg-primary text-primary-foreground font-bold px-7 py-3.5 hover:bg-accent-foreground transition-colors">
              {t("payres.otherMethod")}
            </Link>
            <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 rounded-2xl border border-border text-foreground font-bold px-7 py-3.5 hover:bg-secondary transition-colors">
              <MessageCircle className="w-4 h-4" /> {t("payres.whatsapp")}
            </a>
          </div>
        </>
      )}
    </main>
  );
}

export default function CheckoutSonucPage() {
  return (
    <Suspense fallback={<main className="max-w-lg mx-auto px-5 py-20 text-center"><Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" /></main>}>
      <Sonuc />
    </Suspense>
  );
}
