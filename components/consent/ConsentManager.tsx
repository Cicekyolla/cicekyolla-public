"use client";

/**
 * CONSENT MANAGER — Figma Make "Next-Gen Ecommerce Website Design" Version 100
 * Kaynak: src/app/components/ConsentManager.tsx (V100 export'u)
 *
 * Görsel değerler (renk, radius, gölge, spacing, tipografi, animasyon easing/süre)
 * V100'den BİREBİR alınmıştır. Aşağıdaki 4 nokta bilinçli sapmadır:
 *
 *  1. "use client" eklendi (Next.js App Router; V100 Vite SPA idi).
 *  2. /gizlilik -> /kvkk  — V100'ün link hedefi production'da yok, /kvkk var.
 *  3. Tercih kaydı GERÇEKTEN saklanıyor (bkz. persist()). V100'de "Seçimi Kaydet"
 *     toggle'ları hiç yazmıyordu ve üstelik onClose zinciri yüzünden kaydı
 *     "declined" ile eziyordu — o hata burada düzeltildi.
 *  4. NotificationConsent varsayılan KAPALI: "Haberdar Ol" için abonelik backend'i
 *     yok; sahte kayıt üretmemek için müşteriye gösterilmiyor.
 *  5. Google Consent Mode v2 bağlandı (V100'de yoktu) + tek overlay kilidi eklendi.
 *
 * GTM: container (GTM-54FJNMT2) ve mevcut dataLayer event'leri DEĞİŞMEDİ. Bu dosya
 * yalnızca 'consent update' gönderir; hiçbir event'i durdurmaz veya tetiklemez.
 * Varsayılan consent state layout.tsx'teki beforeInteractive script'te kurulur.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check } from "lucide-react";

/* ── "Haberdar Ol" — ADMIN'E BAĞLANACAK TEK CONFIG NOKTASI ── */
const NOTIFICATION = {
  /* Operatör anahtarı. Tek başına AÇMAK YETMEZ — altta gerçek adapter şart. */
  enabled: false,
  timingMs: 13500, // çerez kararından sonra bekleme
};

/**
 * Gerçek abonelik/marketing kaydı buraya bağlanacak.
 * null olduğu sürece popup HİÇ AÇILMAZ ve hiçbir şey kaydedilmez —
 * sahte abonelik üretilemez.
 */
const subscribeToUpdates: ((source: string) => Promise<void>) | null = null;

/** Backend adapter'ı olmadan bu deneyim etkinleştirilemez. */
const NOTIFICATION_READY: boolean = NOTIFICATION.enabled && subscribeToUpdates !== null;

/* ── Pazarlama popup'larının ASLA gösterilmeyeceği kritik yollar ──
   Çerez katmanı yasal/consent olduğu için bu listeden etkilenmez; her yolda çıkar.
     /checkout      -> checkout + /checkout/sonuc
     /siparis       -> /siparis-takibi + /siparis-takip
     /hizli-siparis -> hızlı sipariş hunisi
     /odeme         -> ileride açılabilecek ödeme rotası için koruma
   TEK KAYNAK: NewMemberPopup da bunu import eder. */
export const MARKETING_BLOCKED_PATHS = [
  "/checkout",
  "/sepet",
  "/odeme",
  "/siparis",
  "/hizli-siparis",
];

/** Bulunulan yol kritik alışveriş/ödeme akışı mı? */
export function isMarketingBlockedPath() {
  if (typeof window === "undefined") return true;
  const p = window.location.pathname;
  return MARKETING_BLOCKED_PATHS.some((b) => p.startsWith(b));
}

/* ── Storage ──
   cy_cookie       : "accepted" | "declined"  — V100 ile aynı anahtar/değerler.
                     Tekrar gösterim kararı YALNIZ buna bakar.
   cy_cookie_prefs : {"analytics":bool,"marketing":bool,"ts":number} — granüler seçim. */
const COOKIE_KEY = "cy_cookie";
const PREFS_KEY = "cy_cookie_prefs";

export type CookiePrefs = { analytics: boolean; marketing: boolean };

function safeGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch { /* */ }
}

/** Kullanıcının kayıtlı çerez tercihi. Karar verilmemişse null. */
export function getCookiePrefs(): CookiePrefs | null {
  const raw = safeGet(PREFS_KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<CookiePrefs>;
    return { analytics: p.analytics === true, marketing: p.marketing === true };
  } catch {
    return null;
  }
}

/* ══════════════════════════════════════
   GOOGLE CONSENT MODE v2
   Eşleme:
     Analiz Çerezleri    -> analytics_storage
     Pazarlama Çerezleri -> ad_storage / ad_user_data / ad_personalization
                            / personalization_storage
     Zorunlu Çerezler    -> functionality_storage / security_storage (hep granted)
══════════════════════════════════════ */
function consentPayload(prefs: CookiePrefs) {
  const m = prefs.marketing ? "granted" : "denied";
  const a = prefs.analytics ? "granted" : "denied";
  return {
    ad_storage: m,
    ad_user_data: m,
    ad_personalization: m,
    personalization_storage: m,
    analytics_storage: a,
  };
}

/** Seçimi GTM'e gerçek zamanlı bildirir (consent update). */
function applyConsent(prefs: CookiePrefs) {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
  const payload = consentPayload(prefs);
  if (typeof w.gtag === "function") {
    w.gtag("consent", "update", payload);
  } else {
    /* layout.tsx script'i engellenmişse bile sinyali kaybetme. */
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push(["consent", "update", payload]);
  }
}

/** Kararı kalıcı yazar VE consent sinyalini gönderir. Tek yol budur. */
function persist(prefs: CookiePrefs) {
  safeSet(COOKIE_KEY, prefs.analytics || prefs.marketing ? "accepted" : "declined");
  safeSet(PREFS_KEY, JSON.stringify({ ...prefs, ts: Date.now() }));
  applyConsent(prefs);
}

/* ══════════════════════════════════════
   TEK OVERLAY KİLİDİ
   Aynı anda en fazla 1 popup açık olabilir. Bir popup kapandıktan sonra
   diğeri OVERLAY_GAP_MS boyunca açılamaz — sakin, premium geçiş.
══════════════════════════════════════ */
const OVERLAY_GAP_MS = 700;
/* Kapanan popup çıkış animasyonu boyunca (en uzunu 0.45s) hâlâ DOM'da durur.
   Kilit bu süre dolmadan bırakılırsa sıradaki popup, kapanmakta olanın üstüne
   biner. Bu yüzden bırakma exit süresi kadar geciktirilir. */
const OVERLAY_EXIT_MS = 500;
let activeOverlay: string | null = null;
let freeAt = 0;
const waiters = new Set<() => void>();

/** Kilidi almayı dener. false dönerse çağıran tetikleyicisini harcamamalı. */
export function acquireOverlay(id: string): boolean {
  if (activeOverlay !== null && activeOverlay !== id) return false;
  if (activeOverlay === null && Date.now() < freeAt) return false;
  activeOverlay = id;
  return true;
}

export function releaseOverlay(id: string) {
  if (activeOverlay !== id) return;
  activeOverlay = null;
  freeAt = Date.now() + OVERLAY_GAP_MS;
  setTimeout(() => {
    waiters.forEach((fn) => fn());
  }, OVERLAY_GAP_MS);
}

/**
 * Güvenlik ağı: çıkış animasyonu herhangi bir sebeple tamamlanmazsa kilit sonsuza
 * kadar tutulu kalmasın. Asıl bırakma AnimatePresence.onExitComplete ile yapılır.
 * releaseOverlay idempotent olduğu için geç gelen bu çağrı zararsızdır.
 */
export function scheduleOverlayRelease(id: string) {
  setTimeout(() => releaseOverlay(id), OVERLAY_EXIT_MS + OVERLAY_GAP_MS);
}

/** Kilit boşaldığında haber verir; bekleyen popup tekrar deneyebilir. */
export function onOverlayFree(fn: () => void) {
  waiters.add(fn);
  return () => {
    waiters.delete(fn);
  };
}

/* ── Gizlilik Ayarları panelini dışarıdan açma ──
   CookieConsent mount olunca kendini buraya kaydeder. Footer'daki
   "Çerez Tercihleri" linki bunu çağırır. */
let prefsOpener: (() => void) | null = null;

/** Kullanıcının çerez tercihlerini sonradan değiştirmesi için panel açar. */
export function openCookiePreferences() {
  prefsOpener?.();
}

/** Panel açılabilir durumda mı? (ConsentManager mount olduysa true) */
export function canOpenCookiePreferences() {
  return prefsOpener !== null;
}

/* ══════════════════════════════════════
   PREFERENCES PANEL
══════════════════════════════════════ */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 transition-all duration-300 focus:outline-none"
      style={{
        width: "38px",
        height: "22px",
        borderRadius: "11px",
        background: checked
          ? "linear-gradient(135deg, #8B5CF6, #A855F7)"
          : "rgba(0,0,0,0.15)",
        boxShadow: checked ? "0 2px 8px rgba(139,92,246,0.4)" : "none",
      }}
    >
      <span
        className="absolute top-[3px] transition-all duration-300"
        style={{
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: "#fff",
          left: checked ? "19px" : "3px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

function PreferencesPanel({
  onSave,
  onDismiss,
  onAcceptAll,
}: {
  onSave: (prefs: CookiePrefs) => void;
  onDismiss: () => void;
  onAcceptAll: () => void;
}) {
  /* Kayıtlı tercih varsa onu göster (panel sonradan da açılabiliyor);
     yoksa V100 varsayılanları: Analiz açık, Pazarlama kapalı. */
  const saved = getCookiePrefs();
  const [analytics, setAnalytics] = useState(saved ? saved.analytics : true);
  const [marketing, setMarketing] = useState(saved ? saved.marketing : false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(5,0,16,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onDismiss}
    >
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] rounded-[24px] overflow-hidden"
        style={{
          background: "#0F0824",
          border: "1px solid rgba(196,181,253,0.12)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-7 pt-6 pb-4"
          style={{ borderBottom: "1px solid rgba(196,181,253,0.08)" }}
        >
          <div>
            <p className="text-[9px] tracking-[0.32em] uppercase font-bold mb-1" style={{ color: "#8B5CF6" }}>
              Çerez Tercihleri
            </p>
            <h3
              className="text-white font-semibold"
              style={{ fontFamily: "var(--font-display)", fontSize: "17px", letterSpacing: "-0.01em" }}
            >
              Gizlilik Ayarları
            </h3>
          </div>
          <button
            onClick={onDismiss}
            aria-label="Kapat"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>

        {/* Cookie rows */}
        <div className="px-7 py-4 space-y-4">
          {/* Mandatory */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-white/80 text-sm font-semibold mb-0.5">Zorunlu Çerezler</p>
              <p className="text-white/35 text-xs leading-relaxed">
                Sitenin çalışması için gereklidir. Devre dışı bırakılamaz.
              </p>
            </div>
            <div className="flex-shrink-0 mt-0.5">
              <Toggle checked={true} onChange={() => {}} />
            </div>
          </div>

          <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />

          {/* Analytics */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-white/80 text-sm font-semibold mb-0.5">Analiz Çerezleri</p>
              <p className="text-white/35 text-xs leading-relaxed">
                Siteyi nasıl kullandığınızı anlamamıza yardımcı olur.
              </p>
            </div>
            <div className="flex-shrink-0 mt-0.5">
              <Toggle checked={analytics} onChange={setAnalytics} />
            </div>
          </div>

          <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />

          {/* Marketing */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-white/80 text-sm font-semibold mb-0.5">Pazarlama Çerezleri</p>
              <p className="text-white/35 text-xs leading-relaxed">
                Size özel teklifler ve içerikler sunmak için kullanılır.
              </p>
            </div>
            <div className="flex-shrink-0 mt-0.5">
              <Toggle checked={marketing} onChange={setMarketing} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-7 pb-6 pt-2 flex gap-3">
          <button
            onClick={() => onSave({ analytics, marketing })}
            className="flex-1 py-3 rounded-full text-sm font-semibold transition-all"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(196,181,253,0.15)",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            Seçimi Kaydet
          </button>
          <button
            onClick={onAcceptAll}
            className="flex-1 py-3 rounded-full text-white text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
              boxShadow: "0 6px 20px rgba(139,92,246,0.4)",
            }}
          >
            Tümünü Kabul Et
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════
   COOKIE CONSENT
══════════════════════════════════════ */
function CookieConsent({ onResolved }: { onResolved: () => void }) {
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  useEffect(() => {
    const s = safeGet(COOKIE_KEY);
    if (!s) {
      /* Çerez katmanı her zaman ilk sırada — kilidi o alır. */
      const t = setTimeout(() => {
        if (acquireOverlay("cookie")) setVisible(true);
      }, 800);
      return () => clearTimeout(t);
    }
  }, []);

  /* Karar verilmiş olsa bile tercihleri sonradan açabilmek için giriş noktası.
     Footer'daki "Çerez Tercihleri" linki openCookiePreferences() ile buraya bağlanır.
     window global'i ise React dışı çağıranlar (ör. GTM) için bırakıldı. */
  useEffect(() => {
    const open = () => {
      if (acquireOverlay("cookie")) setShowPrefs(true);
    };
    prefsOpener = open;
    const w = window as unknown as { cyOpenCookiePreferences?: () => void };
    w.cyOpenCookiePreferences = open;
    return () => {
      /* Yalnız hâlâ BU instance kayıtlıysa temizle. Aksi halde sonraki mount'un
         kaydını silip girişi ölü bırakırız. */
      if (prefsOpener === open) prefsOpener = null;
      if (w.cyOpenCookiePreferences === open) delete w.cyOpenCookiePreferences;
    };
  }, []);

  function resolve(prefs: CookiePrefs) {
    persist(prefs);
    setShowPrefs(false);
    setVisible(false);
    scheduleOverlayRelease("cookie");
    setTimeout(onResolved, 400);
  }

  const acceptAll = () => resolve({ analytics: true, marketing: true });
  const declineAll = () => resolve({ analytics: false, marketing: false });

  if (!visible && !showPrefs) return null;

  return (
    <>
      <AnimatePresence onExitComplete={() => releaseOverlay("cookie")}>
        {showPrefs && (
          <PreferencesPanel
            onSave={resolve}
            onDismiss={declineAll}
            onAcceptAll={acceptAll}
          />
        )}
      </AnimatePresence>

      <AnimatePresence onExitComplete={() => releaseOverlay("cookie")}>
        {visible && !showPrefs && (
          <>
            {/* ── Desktop bottom bar ── */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "110%", opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[9999] hidden sm:block"
              style={{
                background: "linear-gradient(180deg, #0E0620 0%, #0B041A 100%)",
                borderTop: "1px solid rgba(196,181,253,0.10)",
                boxShadow: "0 -12px 48px rgba(0,0,0,0.5)",
              }}
            >
              <div className="max-w-[1440px] mx-auto px-8 lg:px-14 py-4 flex items-center gap-8">
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-white font-semibold text-sm leading-snug mb-1"
                    style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.008em" }}
                  >
                    Deneyiminizi size özel hale getirelim.
                  </p>
                  <p className="text-white/40 text-xs leading-relaxed max-w-[600px]">
                    ÇiçekYolla deneyimini geliştirmek, tercihlerinizi hatırlamak ve size daha uygun
                    içerikler sunmak için çerezlerden yararlanıyoruz.{" "}
                    <a
                      href="/kvkk"
                      className="underline underline-offset-2 hover:text-white/70 transition-colors"
                    >
                      Çerez Politikası
                    </a>
                  </p>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => setShowPrefs(true)}
                    className="px-5 py-2.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(196,181,253,0.14)",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    Tercihleri Yönet
                  </button>
                  <button
                    onClick={acceptAll}
                    className="px-6 py-2.5 rounded-full text-white text-xs font-bold transition-all"
                    style={{
                      background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
                      boxShadow: "0 4px 16px rgba(139,92,246,0.45)",
                    }}
                  >
                    Tümünü Kabul Et
                  </button>
                </div>
              </div>
            </motion.div>

            {/* ── Mobile bottom-sheet ── */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "110%" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[9999] sm:hidden rounded-t-[24px] overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #0E0620 0%, #0B041A 100%)",
                borderTop: "1px solid rgba(196,181,253,0.12)",
                boxShadow: "0 -16px 56px rgba(0,0,0,0.55)",
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
              </div>
              <div className="px-6 pt-3 pb-8">
                <p
                  className="text-white font-semibold text-[17px] leading-snug mb-2"
                  style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
                >
                  Deneyiminizi size özel
                  <br />
                  hale getirelim.
                </p>
                <p className="text-white/40 text-xs leading-relaxed mb-5">
                  Tercihlerinizi hatırlamak ve size uygun içerikler sunmak için çerezlerden
                  yararlanıyoruz.{" "}
                  <a href="/kvkk" className="underline underline-offset-2">
                    Detaylar
                  </a>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPrefs(true)}
                    className="flex-1 py-3.5 rounded-full text-xs font-semibold"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(196,181,253,0.14)",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    Tercihleri Yönet
                  </button>
                  <button
                    onClick={acceptAll}
                    className="flex-1 py-3.5 rounded-full text-white text-sm font-bold"
                    style={{
                      background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
                      boxShadow: "0 4px 16px rgba(139,92,246,0.45)",
                    }}
                  >
                    Kabul Et
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ══════════════════════════════════════
   NOTIFICATION CONSENT
   Cookie kararı verildikten 13.5s sonra;
   cookie ile ASLA aynı anda gösterilmez.
══════════════════════════════════════ */
function NotificationConsent({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (safeGet("cy_notif")) return;

    let shown = false;
    let armed = false;
    const show = () => {
      if (shown || !armed) return;
      /* Kritik alışveriş/ödeme akışlarında müşteriyi rahatsız etme. */
      if (isMarketingBlockedPath()) return;
      /* Başka bir overlay açıksa tetikleyiciyi harcama — boşalınca tekrar dene. */
      if (!acquireOverlay("notif")) return;
      shown = true;
      setVisible(true);
    };

    const t = setTimeout(() => {
      armed = true;
      show();
    }, NOTIFICATION.timingMs);
    const unsub = onOverlayFree(show);
    return () => {
      clearTimeout(t);
      unsub();
    };
  }, [enabled]);

  function close(decision: "accepted" | "declined") {
    safeSet("cy_notif", decision);
    setVisible(false);
    scheduleOverlayRelease("notif");
  }

  function dismiss() {
    close("declined");
  }

  /** Gerçek abonelik ucu olmadan HİÇBİR ŞEY kaydedilmez, başarı gösterilmez. */
  async function subscribe() {
    if (!subscribeToUpdates) return;
    try {
      await subscribeToUpdates("notification-popup");
      close("accepted");
    } catch {
      /* Başarısızsa popup açık kalır — sahte başarı yok. */
    }
  }

  return (
    <AnimatePresence onExitComplete={() => releaseOverlay("notif")}>
      {visible && (
        <>
          {/* ── Desktop: tam yükseklik sağ kolon, kart dikey ortada (V100) ── */}
          <div
            className="fixed z-[9998] hidden sm:flex items-center"
            style={{ top: 0, right: "24px", bottom: 0, pointerEvents: "none" }}
          >
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 12, scale: 0.96 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: "320px", pointerEvents: "auto" }}
            >
              <div
                className="rounded-[22px] overflow-hidden"
                style={{
                  background: "linear-gradient(175deg, #0F0824 0%, #130A1E 100%)",
                  border: "1px solid rgba(196,181,253,0.13)",
                  boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.3)",
                }}
              >
                {/* Image strip */}
                <div className="relative h-[110px] overflow-hidden">
                  {!imgError && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="https://images.unsplash.com/photo-1782038522642-0d2dbeae5476?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=88&w=640"
                      alt="Çiçek koleksiyonu"
                      className="w-full h-full object-cover"
                      style={{
                        opacity: 0.84,
                        objectPosition: "center 38%",
                        transform: "scale(0.88)",
                        transformOrigin: "center 42%",
                      }}
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.onerror = () => setImgError(true);
                        img.src =
                          "https://images.unsplash.com/photo-1782038522691-7faf943aa95e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=88&w=640";
                      }}
                    />
                  )}
                  {imgError && (
                    <div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(160deg, #1A0B2E 0%, #0F0824 100%)" }}
                    />
                  )}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, #0F0824 0%, rgba(15,8,36,0.22) 48%, transparent 100%)",
                    }}
                  />
                  <button
                    onClick={dismiss}
                    aria-label="Kapat"
                    className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                    style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
                  >
                    <X className="w-3 h-3 text-white/70" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-5 pt-2 pb-5">
                  <p
                    className="text-[9px] tracking-[0.3em] uppercase font-bold mb-2"
                    style={{ color: "#8B5CF6" }}
                  >
                    ✦ Özel Fırsatlar
                  </p>
                  <h4
                    className="text-white font-semibold mb-1.5"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "16px",
                      lineHeight: 1.2,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    En güzel anları
                    <br />
                    kaçırmayın.
                  </h4>
                  <p className="text-white/38 text-xs leading-relaxed mb-4">
                    Yeni koleksiyonları, özel gün seçkilerini ve size özel fırsatları ilk siz keşfedin.{" "}
                    <a href="/kvkk" className="underline underline-offset-2 hover:text-white/60 transition-colors">
                      Aydınlatma Metni
                    </a>
                  </p>
                  <div className="flex gap-2.5">
                    <button
                      onClick={dismiss}
                      className="flex-1 py-2.5 rounded-full text-xs font-semibold transition-all"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(196,181,253,0.12)",
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      Şimdi Değil
                    </button>
                    <button
                      onClick={subscribe}
                      className="flex-1 py-2.5 rounded-full text-white text-xs font-bold flex items-center justify-center gap-1.5"
                      style={{
                        background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
                        boxShadow: "0 4px 14px rgba(139,92,246,0.45)",
                      }}
                    >
                      <Check className="w-3 h-3" />
                      Haberdar Ol
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ── Mobile: ortalanmış modal + backdrop (V100) ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9998] sm:hidden flex items-center justify-center p-5"
            style={{ background: "rgba(5,0,16,0.65)", backdropFilter: "blur(6px)" }}
            onClick={dismiss}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[360px] rounded-[24px] overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #0F0824 0%, #0B041A 100%)",
                border: "1px solid rgba(196,181,253,0.12)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image row */}
              <div className="relative h-[120px] overflow-hidden">
                {!imgError && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="https://images.unsplash.com/photo-1782038522642-0d2dbeae5476?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=88&w=640"
                    alt="Çiçek koleksiyonu"
                    className="w-full h-full object-cover"
                    style={{
                      opacity: 0.8,
                      objectPosition: "center 38%",
                      transform: "scale(0.88)",
                      transformOrigin: "center 42%",
                    }}
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.onerror = () => setImgError(true);
                      img.src =
                        "https://images.unsplash.com/photo-1782038522691-7faf943aa95e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=88&w=640";
                    }}
                  />
                )}
                {imgError && (
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(160deg, #1A0B2E 0%, #0F0824 100%)" }}
                  />
                )}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, #0F0824 0%, rgba(15,8,36,0.22) 52%, transparent 100%)",
                  }}
                />
                <button
                  onClick={dismiss}
                  aria-label="Kapat"
                  className="absolute top-3 right-4 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
                >
                  <X className="w-3.5 h-3.5 text-white/70" />
                </button>
              </div>

              <div className="px-6 pt-2 pb-8">
                <p
                  className="text-[9px] tracking-[0.3em] uppercase font-bold mb-2"
                  style={{ color: "#8B5CF6" }}
                >
                  ✦ Özel Fırsatlar
                </p>
                <h4
                  className="text-white font-semibold mb-2"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "19px",
                    lineHeight: 1.15,
                    letterSpacing: "-0.01em",
                  }}
                >
                  En güzel anları kaçırmayın.
                </h4>
                <p className="text-white/38 text-xs leading-relaxed mb-5">
                  Yeni koleksiyonları, özel gün seçkilerini ve size özel fırsatları ilk siz keşfedin.{" "}
                  <a href="/kvkk" className="underline underline-offset-2 hover:text-white/60 transition-colors">
                    Aydınlatma Metni
                  </a>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={dismiss}
                    className="flex-1 py-3.5 rounded-full text-sm font-semibold"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(196,181,253,0.14)",
                      color: "rgba(255,255,255,0.55)",
                    }}
                  >
                    Şimdi Değil
                  </button>
                  <button
                    onClick={subscribe}
                    className="flex-1 py-3.5 rounded-full text-white text-sm font-bold flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
                      boxShadow: "0 4px 16px rgba(139,92,246,0.45)",
                    }}
                  >
                    <Check className="w-4 h-4" />
                    Haberdar Ol
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════
   CONSENT MANAGER — sıralı akış:
   önce cookie, kararından 13.5s sonra bildirim.
══════════════════════════════════════ */
export function ConsentManager() {
  const [cookieResolved, setCookieResolved] = useState(false);

  /* SSR/CSR hydration uyuşmazlığını önlemek için localStorage okuması
     ilk render'dan sonra yapılır (V100 Vite SPA'da bu sorun yoktu). */
  useEffect(() => {
    const s = safeGet(COOKIE_KEY);
    if (s === "accepted" || s === "declined") setCookieResolved(true);
  }, []);

  return (
    <>
      <CookieConsent onResolved={() => setCookieResolved(true)} />
      {NOTIFICATION_READY && <NotificationConsent enabled={cookieResolved} />}
    </>
  );
}
