"use client";

/**
 * YENİ ÜYE — "150 TL Hoş Geldin" TEKLİF ALANI + KOMPAKT ÜYELİK PANELİ
 *
 * ESKİSİ: Figma Make V100 kaynaklı tam ekran pencere; süre/kaydırma sonrası
 * KENDİLİĞİNDEN açılıyor, mobilde ürün kartına dokunmak isteyen müşterinin
 * önüne çıkıp alışverişi kesiyordu.
 *
 * ŞİMDİ (müşteriyi engellemeyen düzen):
 *  1. Sayfada yalnız küçük bir teklif alanı durur (sol alt; WhatsApp düğmesi
 *     sağ altta, ürün sayfasında mobil satın alma çubuğunun ÜSTÜNDE).
 *     Kendiliğinden hiçbir panel açılmaz; ürün kartı tıklaması ürün detayına gider.
 *  2. Panel YALNIZ müşteri teklif alanına dokununca açılır:
 *     masaüstünde sağdan kompakt yan panel, mobilde ekran yüksekliğine sığan,
 *     kendi içinde kayan alt panel. Büyük kahraman görseli yok.
 *  3. Üyelik, KVKK onayı (zorunlu, işaretsiz başlar), isteğe bağlı pazarlama
 *     izni (işaretsiz, tam metin, 16px) ve kupon kodu AYNI akışla çalışır:
 *     /api/auth/register → (işaretliyse) izin → /api/auth/welcome-coupon.
 *  4. Tasarım: Version 72 marka dili (Fraunces + Manrope, #8B5CF6 mor,
 *     koyu #0B0418 panel) — eski pencerenin renk/radius/gölge değerleri korunur.
 *
 * Tutar ve koşullar Admin + Kupon Merkezi'ndeki GERÇEK kupondan gelir
 * (GET /api/consent/config → welcome); bu dosyada indirim değeri TUTULMAZ.
 * localStorage yalnız gösterim hafızasıdır — indirim hakkının güvenlik
 * kaynağı DEĞİLDİR, checkout fiyatına etkisi yoktur.
 */

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowRight, Check, Gift } from "lucide-react";
import { acquireOverlay, releaseOverlay, MARKETING_BLOCKED_PATHS } from "./ConsentManager";
import {
  fetchConsentConfig,
  registerMember,
  fetchWelcomeCoupon,
  formatMinor,
  fetchMarketingConfig,
  marketingCheckboxVisible,
  setMarketingConsent,
  MARKETING_NOT_RECORDED_NOTICE,
  type ConsentConfig,
  type MarketingConfig,
  type WelcomeCoupon,
} from "@/lib/consent";
import {
  PASSWORD_MIN,
  validateRegister,
  viewForResponse,
  viewForThrown,
  type AuthErrorView,
} from "@/lib/authErrors";
import { welcomeOfferView, welcomeRuleText } from "@/lib/memberAccountView";
import {
  MEMBER_SESSION_EVENT,
  noteMemberSession,
  readSessionHint,
  sessionHintStorage,
  type MemberSessionState,
} from "@/lib/memberSessionHint";
import { isGlobalLocalePath } from "@/lib/global/config";
import {
  WELCOME_MEMBER_KEY,
  memberFlagState,
  snoozeValue,
  teaserSitsAboveBuyBar,
  welcomeTeaserCopy,
  welcomeTeaserVisible,
  type MemberFlagState,
} from "@/lib/welcomeTeaser";

/* ── localStorage yardımcıları (anahtar eski pencereyle aynı) ── */
function readMemberFlag(): MemberFlagState {
  try {
    return memberFlagState(localStorage.getItem(WELCOME_MEMBER_KEY), Date.now());
  } catch {
    return "none";
  }
}
function setJoined() {
  try { localStorage.setItem(WELCOME_MEMBER_KEY, "joined"); } catch { /* */ }
}
function snoozeTeaser() {
  try { localStorage.setItem(WELCOME_MEMBER_KEY, snoozeValue(Date.now())); } catch { /* */ }
}

/** Alan çerçevesi — eski pencerenin değerleri; hata durumunda kırmızı. */
function fieldBorder(invalid: boolean): string {
  return invalid ? "1.5px solid rgba(239,68,68,0.5)" : "1.5px solid rgba(196,181,253,0.14)";
}

/** Çerez kararı verildi mi? Verilmeden teklif alanı alt bantla üst üste binmez. */
export function cookieDecided() {
  try {
    const v = localStorage.getItem("cy_cookie");
    return v === "accepted" || v === "declined";
  } catch {
    return false;
  }
}

const FIELD_STYLE = {
  background: "rgba(255,255,255,0.06)",
  borderRadius: "14px",
  padding: "13px 16px",
  fontSize: "16px", // iOS: 16px altı odakta sayfayı yakınlaştırır
} as const;

const PRIMARY_BUTTON = {
  background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)",
  boxShadow: "0 8px 24px rgba(139,92,246,0.45)",
} as const;

/* ══════════════════════════════════════
   TEKLİF ALANI + ÜYELİK PANELİ
══════════════════════════════════════ */
export function NewMemberPopup() {
  const pathname = usePathname();
  /** Üyelik paneli açık mı? YALNIZ openPanel açar. */
  const [visible, setVisible] = useState(false);
  /* entry: form · registered: üyelik oldu ama kupon şu an uygulanamıyor · success: kod hazır */
  const [phase, setPhase] = useState<"entry" | "registered" | "success">("entry");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  /* Aydınlatma onayı: BAŞLANGIÇ DEĞERİ false (DECISIONS D6 · DESIGN §3.A.10).
     Ön-işaretli kutu, onay alınmamış bir onayı alınmış gibi kaydeder. */
  const [kvkkOnay, setKvkkOnay] = useState(false);
  /* Pazarlama e-posta izni (DESIGN §3.G.2): KVKK onayından AYRI, zorunlu
     DEĞİL, İŞARETSİZ başlar ve yalnız API "yakalama açık" derse çizilir. */
  const [marketingConfig, setMarketingConfig] = useState<MarketingConfig | null>(null);
  const [marketingTicked, setMarketingTicked] = useState(false);
  /* Kutu işaretlendi ama izin kaydedilemediyse sonuç ekranında dürüst not. */
  const [marketingNotice, setMarketingNotice] = useState<string | null>(null);
  const [error, setError] = useState("");
  /* Hangi alan vurgulanacak? (kırmızı çerçeve + aria-invalid) */
  const [errorField, setErrorField] = useState<AuthErrorView["field"]>(null);
  const [loading, setLoading] = useState(false);
  const [cfg, setCfg] = useState<ConsentConfig["welcome"] | null>(null);
  const [coupon, setCoupon] = useState<WelcomeCoupon | null>(null);
  /* Üyelik oluştu ama kupon uygulanamıyorsa sunucunun cümlesi (ör. telefon doğrulama). */
  const [registeredMessage, setRegisteredMessage] = useState("");
  /* Teklif alanı kararının istemci girdileri (SSR'da hepsi "gösterme"). */
  const [memberFlag, setMemberFlag] = useState<MemberFlagState>("joined");
  const [sessionState, setSessionState] = useState<MemberSessionState>("unknown");
  const [cookieOk, setCookieOk] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const heldOverlay = useRef(false);

  /* Admin içeriği + GERÇEK kampanya durumu. active=false ise teklif alanı çizilmez. */
  useEffect(() => {
    let alive = true;
    fetchConsentConfig().then((c) => {
      if (alive) setCfg(c?.welcome ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  /* Pazarlama izni kutucuğunun durumu YALNIZ panel gerçekten açıldığında
     okunur: bileşen kök layout'ta her sayfada bağlıdır; açılışta okumak her
     sayfa görüntülemesinde API'ye fazladan bir istek demekti. */
  useEffect(() => {
    if (!visible || marketingConfig) return;
    let alive = true;
    fetchMarketingConfig().then((m) => {
      if (alive) setMarketingConfig(m);
    });
    return () => {
      alive = false;
    };
  }, [visible, marketingConfig]);

  /* Teklif alanı girdileri: katılım/erteleme hafızası, üst barın oturum ipucu,
     çerez kararı. Ağ isteği YOK — Header'ın /api/account yanıtı ipucuna yazılır. */
  useEffect(() => {
    const refresh = () => {
      setMemberFlag(readMemberFlag());
      setSessionState(readSessionHint(sessionHintStorage(), Date.now()));
      setCookieOk(cookieDecided());
    };
    refresh();
    const timer = window.setInterval(refresh, 3000);
    window.addEventListener(MEMBER_SESSION_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(MEMBER_SESSION_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  /* Panel açıkken: arka plan kaymaz, Esc kapatır, odak panelde döner. */
  useEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus({ preventScroll: true }), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePanel();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const nodes = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
    };
    // closePanel yalnız state setter'ları kullanır; her render'da yeniden bağlamaya gerek yok.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const copy = welcomeTeaserCopy(cfg, formatMinor);
  const teaserVisible =
    !visible &&
    copy !== null &&
    welcomeTeaserVisible({
      pathname,
      campaignActive: cfg?.active === true,
      memberFlag,
      sessionState,
      cookieDecided: cookieOk,
      isLocalePath: !!pathname && isGlobalLocalePath(pathname),
      blockedPrefixes: MARKETING_BLOCKED_PATHS,
    });
  const aboveBuyBar = teaserSitsAboveBuyBar(pathname);

  /** Tek açılış yolu: müşterinin teklif alanına dokunması. */
  function openPanel() {
    setIsDesktop(window.matchMedia("(min-width: 640px)").matches);
    /* Diğer otomatik pencereler (Haberdar Ol, teslimat adresi) üstüne binmesin. */
    heldOverlay.current = acquireOverlay("member");
    setVisible(true);
  }

  function closePanel() {
    setVisible(false);
  }

  function dismissTeaser() {
    snoozeTeaser();
    setMemberFlag("snoozed");
  }

  function fail(view: AuthErrorView) {
    setError(view.message);
    setErrorField(view.field);
  }

  /**
   * GERÇEK zincir: mevcut üyelik akışı (/api/auth/register) → oturum çerezi →
   * Kupon Merkezi'ndeki gerçek hoş geldin kuponunun KODU.
   * Kayıt başarısız olursa sonuç ekranına GEÇİLMEZ; kupon uydurulmaz.
   *
   * Ön denetim `lib/authErrors.validateRegister` ile yapılır — giriş sayfasıyla
   * AYNI kural ve AYNI metin. Burada ikinci bir şifre/e-posta kuralı yazılmaz.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const preflight = validateRegister({ email, password, kvkkOnay });
    if (preflight) return fail(preflight);
    setError("");
    setErrorField(null);
    setLoading(true);

    const reg = await registerMember({ email: email.trim(), password, kvkkOnay });
    if (!reg.ok) {
      setLoading(false);
      return fail(reg.status === 0 ? viewForThrown(reg.body) : viewForResponse(reg.status, reg.body));
    }
    /* Üye artık gerçekten kayıtlı ve oturumu açık: üst bar da "Hesabım" göstersin,
       teklif alanı bir daha çizilmesin. */
    setJoined();
    noteMemberSession("member");

    /* Pazarlama izni: YALNIZ kutu gerçekten işaretlendiyse ve kutu gösterildiyse,
       üyenin KENDİ oturumuyla (kaynak: welcome_popup). Kayıt zaten başarılı;
       izin yazılamazsa üyelik bozulmaz, kullanıcıya söylenir. */
    let consentNotice: string | null = null;
    if (marketingCheckboxVisible(marketingConfig) && marketingTicked) {
      const consent = await setMarketingConsent(true, "welcome_popup");
      if (!consent.ok || consent.state.status !== "granted") consentNotice = MARKETING_NOT_RECORDED_NOTICE;
    }
    setMarketingNotice(consentNotice);

    /* Kuponu backend belirler. Uygunluk kararı (telefon kanıtı / ilk sipariş /
       kontenjan) SUNUCUDA verilir; burada yeniden hesaplanmaz. */
    const c = await fetchWelcomeCoupon();
    const view = welcomeOfferView(c);
    setLoading(false);
    if (view.state !== "usable" || !view.code) {
      /* Üyelik oldu ama kampanya şu an uygulanamıyor → YALAN "kazandınız" yok;
         sebep sunucunun kendi cümlesidir (ör. "telefonunuzu doğrulayın"). */
      setRegisteredMessage(view.message ?? "Hoş geldin avantajı şu anda uygulanamıyor.");
      setPhase("registered");
      return;
    }
    setCoupon(c);
    setPhase("success");
  }

  /** Başarı ekranındaki kural cümlesi — yalnız sunucunun alanlarından. */
  const welcomeRule = welcomeRuleText(coupon);

  const hiddenOffset = isDesktop ? { x: "100%" } : { y: "100%" };

  return (
    <>
      {/* ── Teklif alanı: küçük, sabit, kendiliğinden hiçbir şey açmaz ── */}
      <AnimatePresence>
        {teaserVisible && copy && (
          <motion.div
            key="welcome-teaser"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.35, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed left-4 z-50 flex items-center sm:left-6 ${
              aboveBuyBar
                ? "bottom-[calc(92px+env(safe-area-inset-bottom))] lg:bottom-6"
                : "bottom-[calc(16px+env(safe-area-inset-bottom))] sm:bottom-6"
            }`}
          >
            <button
              type="button"
              onClick={openPanel}
              aria-haspopup="dialog"
              aria-label={`${copy.amount} hoş geldin ayrıcalığı — ${copy.condition}. Üye ol`}
              className="flex items-center gap-2.5 rounded-full py-2 pl-2 pr-4 text-left transition-transform active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD] focus-visible:ring-offset-2"
              style={{
                background: "#0B0418",
                border: "1px solid rgba(196,181,253,0.22)",
                boxShadow: "0 12px 32px rgba(11,4,24,0.35), 0 2px 8px rgba(139,92,246,0.25)",
              }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={PRIMARY_BUTTON}
                aria-hidden="true"
              >
                <Gift className="h-4 w-4 text-white" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-bold" style={{ fontFamily: "var(--font-display)", fontSize: "17px", color: "#DDD6FE" }}>
                  {copy.amount} Hoş Geldin
                </span>
                <span className="text-white/60" style={{ fontSize: "11px" }}>
                  {copy.condition}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={dismissTeaser}
              aria-label="Hoş geldin teklifini gizle"
              className="-ml-2 flex h-7 w-7 items-center justify-center self-start rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]"
              style={{ background: "#1E1233", border: "1px solid rgba(196,181,253,0.22)" }}
            >
              <X className="h-3 w-3 text-white/70" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Kompakt üyelik paneli: YALNIZ teklif alanına dokununca ── */}
      <AnimatePresence
        onExitComplete={() => {
          if (heldOverlay.current) {
            heldOverlay.current = false;
            releaseOverlay("member");
          }
        }}
      >
        {visible && cfg && (
          <motion.div
            key="welcome-panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[10000]"
            style={{ background: "rgba(4,0,14,0.55)", backdropFilter: "blur(2px)" }}
            onClick={closePanel}
            aria-hidden="true"
          />
        )}
        {/* Panel arka planın KARDEŞİDİR: arka planın saydamlık animasyonunu devralmaz. */}
        {visible && cfg && (
            <motion.div
              key="welcome-panel"
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="hosgeldin-panel-baslik"
              tabIndex={-1}
              initial={hiddenOffset}
              animate={{ x: 0, y: 0 }}
              exit={hiddenOffset}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-0 bottom-0 z-[10001] flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[24px] outline-none sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:h-[100dvh] sm:max-h-none sm:w-[420px] sm:rounded-none sm:rounded-l-[28px]"
              style={{
                background: "#0B0418",
                border: "1px solid rgba(196,181,253,0.10)",
                boxShadow: "0 -24px 80px rgba(0,0,0,0.55), 0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              {/* Mobil tutamaç */}
              <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
                <span className="h-1 w-10 rounded-full bg-white/20" />
              </div>

              {/* ── Üst şerit: tutar + koşul + kapat (büyük görsel YOK) ── */}
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 pb-3 pt-2 sm:px-7 sm:pb-4 sm:pt-6">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={PRIMARY_BUTTON}
                    aria-hidden="true"
                  >
                    <Gift className="h-4 w-4 text-white" />
                  </span>
                  <div className="leading-tight">
                    <p
                      className="font-bold"
                      style={{ fontFamily: "var(--font-display)", fontSize: "24px", color: "#DDD6FE", letterSpacing: "-0.02em" }}
                    >
                      {formatMinor(cfg.amount_minor)}
                    </p>
                    <p className="font-semibold uppercase text-white/55" style={{ fontSize: "10px", letterSpacing: "0.18em" }}>
                      Hoş geldin ayrıcalığı
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closePanel}
                  aria-label="Paneli kapat"
                  className="flex h-11 w-11 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <X className="h-4 w-4 text-white/70" />
                </button>
              </div>

              {/* ── Gövde: kendi içinde kayar ── */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 sm:px-7 sm:pt-6">
                {phase === "entry" && (
                  <div>
                    <h2
                      id="hosgeldin-panel-baslik"
                      className="mb-2 font-semibold text-white"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(20px, 5.4vw, 24px)",
                        lineHeight: 1.15,
                        letterSpacing: "-0.015em",
                        whiteSpace: "pre-line",
                      }}
                    >
                      {cfg.title}
                    </h2>
                    <p className="mb-2 text-sm leading-relaxed text-white/60">{cfg.description}</p>
                    <p className="mb-4 flex items-center gap-1.5 text-xs text-white/50">
                      <span style={{ color: "#A78BFA", fontSize: "8px" }} aria-hidden="true">◇</span>
                      {copy?.condition ?? "İlk siparişinize özel"}
                    </p>

                    <form onSubmit={handleSubmit} noValidate>
                      <label className="mb-1 block text-xs font-semibold text-white/70" htmlFor="hosgeldin-eposta">
                        E-posta
                      </label>
                      <input
                        id="hosgeldin-eposta"
                        type="email"
                        inputMode="email"
                        value={email}
                        autoComplete="email"
                        aria-invalid={errorField === "email" || undefined}
                        aria-describedby={error ? "uyelik-popup-hata" : undefined}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                          setErrorField(null);
                        }}
                        placeholder="E-posta adresiniz"
                        className="mb-3 w-full text-white placeholder:text-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]/60"
                        style={{ ...FIELD_STYLE, border: fieldBorder(errorField === "email") }}
                      />

                      <label className="mb-1 block text-xs font-semibold text-white/70" htmlFor="hosgeldin-sifre">
                        Şifre
                      </label>
                      <input
                        id="hosgeldin-sifre"
                        type="password"
                        value={password}
                        autoComplete="new-password"
                        aria-invalid={errorField === "password" || undefined}
                        aria-describedby={error ? "uyelik-popup-hata" : undefined}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError("");
                          setErrorField(null);
                        }}
                        /* Kural SUNUCUYLA aynı: 8-200 (memberAuthValidation). */
                        placeholder={`En az ${PASSWORD_MIN} karakter`}
                        className="mb-4 w-full text-white placeholder:text-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]/60"
                        style={{ ...FIELD_STYLE, border: fieldBorder(errorField === "password") }}
                      />

                      {/* ── AYDINLATMA ONAYI — İŞARETSİZ BAŞLAR, ZORUNLUDUR ──
                          Kutu işaretlenmeden istek atılmaz; gövdeye de yalnız
                          bu değer yazılır (lib/consent.registerRequestBody).
                          Sunucu da `kvkk_onay !== true` ise 400 döner. */}
                      <label
                        className="mb-4 flex cursor-pointer items-start gap-3 text-white/75"
                        style={{ fontSize: "13px", lineHeight: 1.55 }}
                      >
                        <input
                          type="checkbox"
                          checked={kvkkOnay}
                          aria-invalid={errorField === "kvkk" || undefined}
                          aria-describedby={error ? "uyelik-popup-hata" : undefined}
                          onChange={(e) => {
                            setKvkkOnay(e.target.checked);
                            setError("");
                            setErrorField(null);
                          }}
                          className="mt-0.5 h-5 w-5 shrink-0 accent-[#8B5CF6]"
                          style={
                            errorField === "kvkk"
                              ? { outline: "1.5px solid rgba(239,68,68,0.6)", outlineOffset: "2px" }
                              : undefined
                          }
                        />
                        <span>
                          <a
                            href="/kvkk"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 transition-colors hover:text-white"
                          >
                            Üyelik Aydınlatma Metni
                          </a>
                          &apos;ni okudum, kişisel verilerimin üyelik kapsamında işlenmesini kabul ediyorum.
                        </span>
                      </label>

                      {/* PAZARLAMA E-POSTA İZNİ — isteğe bağlı, işaretsiz başlar.
                          Metin API'den gelir (saklanan metin sürümüyle aynı), TAMAMI gösterilir. */}
                      {marketingCheckboxVisible(marketingConfig) && (
                        <fieldset className="mb-4 rounded-[14px] p-3.5" style={{ border: "1px solid rgba(196,181,253,0.14)", background: "rgba(255,255,255,0.03)" }}>
                          {/* Yönetmelik m.7/5: kenar başlığı + en az 12 punto (16px). */}
                          {marketingConfig.text.heading && (
                            <legend className="px-1 font-bold text-white/90" style={{ fontSize: "16px", lineHeight: 1.4 }}>
                              {marketingConfig.text.heading}
                            </legend>
                          )}
                          <label
                            className="flex cursor-pointer items-start gap-3 text-white/75"
                            style={{ fontSize: "16px", lineHeight: 1.55 }}
                          >
                            <input
                              type="checkbox"
                              checked={marketingTicked}
                              onChange={(e) => setMarketingTicked(e.target.checked)}
                              className="mt-1 h-5 w-5 shrink-0 accent-[#8B5CF6]"
                            />
                            <span>
                              <span className="font-semibold text-white/90">{marketingConfig.text.label}</span>
                              {marketingConfig.text.body && (
                                <span className="mt-1 block text-white/70">{marketingConfig.text.body}</span>
                              )}
                            </span>
                          </label>
                        </fieldset>
                      )}

                      {error && (
                        <p
                          id="uyelik-popup-hata"
                          role="alert"
                          aria-live="assertive"
                          className="mb-3 text-sm"
                          style={{ color: "#F87171" }}
                        >
                          {error}
                        </p>
                      )}

                      {/* Kayıt düğmesi panelin altında SABİT: uzun izin metni kaydırılırken de erişilebilir. */}
                      <div
                        className="sticky bottom-0 -mx-5 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:-mx-7 sm:px-7"
                        style={{ background: "linear-gradient(to top, #0B0418 70%, rgba(11,4,24,0))" }}
                      >
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0418]"
                          style={
                            loading
                              ? { background: "rgba(139,92,246,0.5)", boxShadow: "none", cursor: "not-allowed" }
                              : { ...PRIMARY_BUTTON, cursor: "pointer" }
                          }
                        >
                          {loading ? (
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-label="Gönderiliyor">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <>
                              {cfg.cta_text}
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={closePanel}
                          className="mt-2 w-full py-1.5 text-center text-xs text-white/45 transition-colors hover:text-white/70"
                        >
                          {cfg.dismiss_text || "Şimdi değil"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Üyelik oluştu ama kupon şu an uygulanamıyor (ör. telefon doğrulama gerekiyor) */}
                {phase === "registered" && (
                  <div className="pb-6">
                    <h2
                      id="hosgeldin-panel-baslik"
                      className="mb-2 font-semibold text-white"
                      style={{ fontFamily: "var(--font-display)", fontSize: "22px", lineHeight: 1.2 }}
                    >
                      Üyeliğiniz oluşturuldu.
                    </h2>
                    <p role="status" className="mb-3 text-sm leading-relaxed text-white/70">
                      {registeredMessage}
                    </p>
                    {marketingNotice && (
                      <p role="status" className="mb-4 text-xs leading-relaxed text-white/55">
                        {marketingNotice}
                      </p>
                    )}
                    <a
                      href="/hesabim"
                      className="mb-2 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-white"
                      style={PRIMARY_BUTTON}
                    >
                      Hesabım&apos;a git
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={closePanel}
                      className="w-full py-2 text-center text-sm text-white/60 transition-colors hover:text-white/80"
                    >
                      Alışverişe devam et
                    </button>
                  </div>
                )}

                {/* Başarı — yalnız gerçek kayıt + gerçek kupon kodu */}
                {phase === "success" && (
                  <div className="pb-6">
                    <div
                      className="mb-4 flex h-11 w-11 items-center justify-center rounded-full"
                      style={PRIMARY_BUTTON}
                      aria-hidden="true"
                    >
                      <Check className="h-5 w-5 text-white" />
                    </div>
                    <h2
                      id="hosgeldin-panel-baslik"
                      className="mb-2 font-semibold text-white"
                      style={{ fontFamily: "var(--font-display)", fontSize: "22px", lineHeight: 1.2 }}
                    >
                      İlk sipariş ayrıcalığınız hazır.
                    </h2>
                    {/* Kuralın metni SUNUCUDAN gelen alanlardan kurulur (welcomeRuleText). */}
                    <p className="mb-4 text-sm leading-relaxed text-white/65">
                      Hoş geldin ayrıcalığınız üyeliğinize tanımlandı.
                      {welcomeRule ? ` ${welcomeRule}` : ""}
                    </p>
                    {marketingNotice && (
                      <p role="status" className="mb-4 text-xs leading-relaxed text-white/55">
                        {marketingNotice}
                      </p>
                    )}
                    {/* GERÇEK kupon kodu — Kupon Merkezi'ndeki kampanyadan gelir. */}
                    {coupon?.code && (
                      <div
                        className="mb-5 flex items-center justify-between rounded-[12px] px-4 py-3"
                        style={{ background: "rgba(139,92,246,0.12)", border: "1.5px dashed rgba(196,181,253,0.3)" }}
                      >
                        <span className="text-xs font-semibold uppercase tracking-wider text-white/55">Kupon Kodu</span>
                        <span
                          className="font-bold text-white"
                          style={{ fontFamily: "var(--font-display)", fontSize: "15px", letterSpacing: "0.12em" }}
                        >
                          {coupon.code}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={closePanel}
                      className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-white"
                      style={PRIMARY_BUTTON}
                    >
                      Alışverişe devam et
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
