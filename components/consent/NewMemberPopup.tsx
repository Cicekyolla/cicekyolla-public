"use client";

/**
 * NEW MEMBER POPUP — Figma Make "Next-Gen Ecommerce Website Design" Version 100
 * Kaynak: src/app/components/NewMemberPopup.tsx (V100 export'u)
 *
 * Görsel değerler (renk, radius, gölge, spacing, tipografi, gradient katmanları,
 * fotoğraf transform/objectPosition, animasyon easing/süre) V100'den BİREBİR.
 * Bilinçli sapmalar:
 *
 *  1. "use client" eklendi (Next.js App Router; V100 Vite SPA idi).
 *  2. CAMPAIGN.active = false — üyelik/kupon backend'i YOK. Müşteriye ölü bir form
 *     göstermemek için varsayılan kapalı. Uç bağlanınca true yapmak yeterli.
 *  3. V100'deki `/* Simulate API call *\/` + setTimeout ile SAHTE BAŞARI bilinçli
 *     olarak taşınmadı. Başarı ekranı yalnızca gerçek bir submitMembership()
 *     çağrısı başarılı dönerse açılır; o fonksiyon bağlanana kadar null.
 *     Mevcut /api/public/coupon yalnız kupon DOĞRULAR, kupon ÜRETMEZ.
 *  4. CAMPAIGN_READY kapısı: adapter yoksa `active: true` yapılsa bile popup açılmaz.
 *  5. Tek overlay kilidi (ConsentManager) + çerez kararı şartı — popup'lar bindirilmez.
 *  6. KVKK aydınlatma linki eklendi (e-posta toplanıyor); /hizli-siparis rota
 *     korumasına dahil edildi.
 *
 * localStorage burada YALNIZCA gösterim/dismiss hafızasıdır — indirim hakkının
 * güvenlik kaynağı DEĞİLDİR ve checkout fiyatına hiçbir etkisi yoktur.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowRight, Check } from "lucide-react";
import {
  acquireOverlay,
  releaseOverlay,
  scheduleOverlayRelease,
  onOverlayFree,
  isMarketingBlockedPath,
} from "./ConsentManager";
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

/* İçerik + kampanya ADMIN'den gelir (GET /api/consent/config).
   İndirim tutarı ve minimum sepet Kupon Merkezi'ndeki gerçek kupondan okunur;
   bu dosyada ikinci bir indirim değeri TUTULMAZ. */

/* ── localStorage helpers ── */
const KEY = "cy_member";
function hasJoined() {
  try { return localStorage.getItem(KEY) === "joined"; } catch { return false; }
}
function hasDismissed() {
  try {
    const v = localStorage.getItem(KEY);
    if (!v || v === "joined") return false;
    return parseInt(v) > Date.now();
  } catch { return false; }
}
function setJoined() {
  try { localStorage.setItem(KEY, "joined"); } catch { /* */ }
}
function setDismissed() {
  try {
    const until = Date.now() + 1000 * 60 * 60 * 24; // 24h
    localStorage.setItem(KEY, String(until));
  } catch { /* */ }
}

/* Kritik alışveriş/ödeme akışları — TEK KAYNAK ConsentManager'da (bildirim
   popup'ı da aynı listeyi kullanır). */

/** Alan çerçevesi — V100 değerleri; hata durumunda kırmızı. */
function fieldBorder(invalid: boolean): string {
  return invalid ? "1.5px solid rgba(239,68,68,0.5)" : "1.5px solid rgba(196,181,253,0.14)";
}

/** Çerez kararı verildi mi? Verilmeden pazarlama popup'ı bindirilmez (sıralı gösterim). */
export function cookieDecided() {
  try {
    const v = localStorage.getItem("cy_cookie");
    return v === "accepted" || v === "declined";
  } catch {
    return false;
  }
}

/* ══════════════════════════════════════
   NEW MEMBER POPUP
══════════════════════════════════════ */
export function NewMemberPopup() {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"entry" | "success">("entry");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  /* Aydınlatma onayı: BAŞLANGIÇ DEĞERİ false (DECISIONS D6 · DESIGN §3.A.10).
     Ön-işaretli kutu, onay alınmamış bir onayı alınmış gibi kaydeder. */
  const [kvkkOnay, setKvkkOnay] = useState(false);
  /* Pazarlama e-posta izni (DESIGN §3.G.2): KVKK onayından AYRI, zorunlu
     DEĞİL, İŞARETSİZ başlar ve yalnız API "yakalama açık" derse çizilir. */
  const [marketingConfig, setMarketingConfig] = useState<MarketingConfig | null>(null);
  const [marketingTicked, setMarketingTicked] = useState(false);
  /* Kutu işaretlendi ama izin kaydedilemediyse başarı ekranında dürüst not. */
  const [marketingNotice, setMarketingNotice] = useState<string | null>(null);
  const [error, setError] = useState("");
  /* Hangi alan vurgulanacak? (kırmızı çerçeve + aria-invalid) */
  const [errorField, setErrorField] = useState<AuthErrorView["field"]>(null);
  const [loading, setLoading] = useState(false);
  const triggered = useRef(false);
  const [imgError, setImgError] = useState(false);
  const [cfg, setCfg] = useState<ConsentConfig["welcome"] | null>(null);
  const [coupon, setCoupon] = useState<WelcomeCoupon | null>(null);

  /* Admin içeriği + GERÇEK kampanya durumu. active=false ise popup hiç açılmaz. */
  useEffect(() => {
    let alive = true;
    fetchConsentConfig().then((c) => {
      if (alive) setCfg(c?.welcome ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  /* Pazarlama izni kutucuğunun durumu YALNIZ pencere gerçekten açıldığında
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

  const getPathname = () => window.location.pathname;
  const isProductPage = () => getPathname().startsWith("/urun/");
  const isBlocked = isMarketingBlockedPath;

  useEffect(() => {
    /* Kampanya gerçekten aktif değilse (kupon yok/pasif/süresi dolmuş) popup açılmaz. */
    const c = cfg;
    if (!c?.active) return;
    /* Kapanış içinde daraltma kaybolmasın diye ilkel değerler burada sabitlenir. */
    const scrollRatio = c.scroll_ratio;
    const delayMs = c.delay_ms;
    if (hasJoined() || hasDismissed()) return;

    let armed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    function tryShow() {
      if (triggered.current || !armed) return;
      if (isBlocked()) return;
      /* Sıra: çerez kararı verilmeden pazarlama popup'ı açılmaz. */
      if (!cookieDecided()) {
        if (retry) clearTimeout(retry);
        retry = setTimeout(tryShow, 3000);
        return;
      }
      /* Başka bir overlay açıksa (ör. Haberdar Ol) tetikleyiciyi harcama. */
      if (!acquireOverlay("member")) return;
      triggered.current = true;
      setVisible(true);
    }

    function arm() {
      armed = true;
      tryShow();
    }

    function onScroll() {
      if (armed) return;
      const scrollPct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (scrollPct >= scrollRatio) arm();
    }

    const timer = setTimeout(arm, delayMs);
    window.addEventListener("scroll", onScroll, { passive: true });
    const unsub = onOverlayFree(tryShow);

    return () => {
      clearTimeout(timer);
      if (retry) clearTimeout(retry);
      window.removeEventListener("scroll", onScroll);
      unsub();
    };
  }, [cfg]);

  function dismiss() {
    setDismissed();
    setVisible(false);
    scheduleOverlayRelease("member");
  }

  function fail(view: AuthErrorView) {
    setError(view.message);
    setErrorField(view.field);
  }

  /**
   * GERÇEK zincir: mevcut üyelik akışı (/api/auth/register) → oturum çerezi →
   * Kupon Merkezi'ndeki gerçek hoş geldin kuponunun KODU.
   * Kayıt başarısız olursa başarı ekranına GEÇİLMEZ; kupon uydurulmaz.
   *
   * Ön denetim `lib/authErrors.validateRegister` ile yapılır — giriş sayfasıyla
   * AYNI kural ve AYNI metin. Burada ikinci bir şifre/e-posta kuralı yazılmaz
   * (eskiden 6 karakter deniyordu, sunucu 8 istiyordu: kullanıcı sebebini
   * göremeyen bir 400 alıyordu).
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

    /* Pazarlama izni: YALNIZ kutu gerçekten işaretlendiyse ve kutu gösterildiyse,
       üyenin KENDİ oturumuyla (kaynak: welcome_popup). Kayıt zaten başarılı;
       izin yazılamazsa üyelik bozulmaz, kullanıcıya söylenir. */
    let consentNotice: string | null = null;
    if (marketingCheckboxVisible(marketingConfig) && marketingTicked) {
      const consent = await setMarketingConsent(true, "welcome_popup");
      if (!consent.ok || consent.state.status !== "granted") consentNotice = MARKETING_NOT_RECORDED_NOTICE;
    }
    setMarketingNotice(consentNotice);

    /* Üye artık gerçekten kayıtlı ve oturumu açık. Kuponu backend belirler.
       Uygunluk kararı (telefon kanıtı / ilk sipariş / kontenjan) SUNUCUDA
       verilir; burada yeniden hesaplanmaz — yalnız sunucunun cümlesi basılır. */
    const c = await fetchWelcomeCoupon();
    const view = welcomeOfferView(c);
    setLoading(false);
    if (view.state !== "usable" || !view.code) {
      /* Üyelik oldu ama kampanya uygun değil → YALAN "kazandınız" gösterme.
         Sebep sunucunun kendi cümlesidir (ör. "telefonunuzu doğrulayın"). */
      setError(
        [
          view.message
            ? `Üyeliğiniz oluşturuldu. ${view.message}`
            : "Üyeliğiniz oluşturuldu, ancak hoş geldin avantajı şu anda uygulanamıyor.",
          consentNotice,
        ]
          .filter(Boolean)
          .join(" "),
      );
      setErrorField(null);
      return;
    }
    setCoupon(c);
    setJoined();
    setPhase("success");
  }

  /** Başarı ekranındaki kural cümlesi — yalnız sunucunun alanlarından. */
  const welcomeRule = welcomeRuleText(coupon);

  function handleContinue() {
    setVisible(false);
    scheduleOverlayRelease("member");
    if (!isProductPage()) {
      window.location.href = "/kategori/buketler";
    }
    /* Ürün sayfasındaysa sadece kapanır — kullanıcı ürününde kalır. */
  }

  return (
    <AnimatePresence onExitComplete={() => releaseOverlay("member")}>
      {visible && cfg && (
        /* Backdrop */
        <motion.div
          key="member-popup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4 sm:p-6"
          style={{ background: "rgba(4,0,14,0.72)", backdropFilter: "blur(8px)" }}
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.97 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full overflow-hidden"
            style={{
              maxWidth: "860px",
              borderRadius: "28px",
              /* Çok kısa ekranlarda (ör. 360x640) kart viewport'a sığmayabilir.
                 Sığdığı her boyutta görünüm V100 ile birebir aynı kalır; sığmadığında
                 kırpılmak yerine kaydırılır, böylece kapatma X'i ve CTA erişilebilir. */
              maxHeight: "calc(100dvh - 32px)",
              overflowY: "auto",
              background: "#0B0418",
              border: "1px solid rgba(196,181,253,0.10)",
              boxShadow: "0 48px 120px rgba(0,0,0,0.7), 0 8px 32px rgba(0,0,0,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Close button ── */}
            <button
              onClick={dismiss}
              aria-label="Kapat"
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-colors sm:top-5 sm:right-5"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <X className="w-3.5 h-3.5 text-white/60" />
            </button>

            <div className="flex flex-col sm:flex-row">
              {/* ── Left: photo ── */}
              <div
                className="relative sm:w-[42%] flex-shrink-0 overflow-hidden"
                style={{
                  minHeight: "200px",
                  background: imgError
                    ? "linear-gradient(160deg, #130A1D 0%, #1E0B34 40%, #0F0620 100%)"
                    : "#1A120A",
                }}
              >
                {!imgError && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cfg.image_url ?? "https://images.unsplash.com/photo-1753189198695-9cfa2b47e76b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=90&w=900"}
                    alt="Premium çiçek aranjmanı"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      objectPosition: "center 15%",
                      transform: "scale(1.28)",
                      transformOrigin: "center 18%",
                    }}
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.onerror = () => setImgError(true);
                      img.src =
                        "https://images.unsplash.com/photo-1678043639757-58ba93e9d6ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=90&w=900";
                    }}
                  />
                )}
                {/* Görsel gelmezse zarif floral iz */}
                {imgError && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <svg viewBox="0 0 120 160" className="w-32 h-40" fill="none">
                      <ellipse cx="60" cy="80" rx="32" ry="46" stroke="#C4B5FD" strokeWidth="0.8" />
                      <ellipse cx="60" cy="80" rx="18" ry="28" stroke="#A78BFA" strokeWidth="0.6" />
                      <line x1="60" y1="126" x2="60" y2="155" stroke="#8B5CF6" strokeWidth="1.2" strokeLinecap="round" />
                      <ellipse cx="38" cy="70" rx="14" ry="20" stroke="#C4B5FD" strokeWidth="0.6" transform="rotate(-28 38 70)" />
                      <ellipse cx="82" cy="70" rx="14" ry="20" stroke="#C4B5FD" strokeWidth="0.6" transform="rotate(28 82 70)" />
                      <ellipse cx="44" cy="48" rx="11" ry="16" stroke="#A78BFA" strokeWidth="0.5" transform="rotate(-48 44 48)" />
                      <ellipse cx="76" cy="48" rx="11" ry="16" stroke="#A78BFA" strokeWidth="0.5" transform="rotate(48 76 48)" />
                    </svg>
                  </div>
                )}
                {/* Sağ kenar gradyanı — açık fotoğrafın koyu panele geçişi */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: [
                      "linear-gradient(to right, transparent 25%, rgba(11,4,24,0.68) 62%, #0B0418 100%)",
                      "linear-gradient(to top, rgba(11,4,24,0.65) 0%, transparent 28%)",
                      "linear-gradient(to bottom, rgba(11,4,24,0.30) 0%, transparent 18%)",
                    ].join(", "),
                  }}
                />

                {/* Ayrıcalık rozeti — fotoğrafın üzerinde */}
                <div className="absolute bottom-5 left-5 right-5 sm:bottom-6 sm:left-6 sm:right-6">
                  <div
                    className="inline-flex flex-col px-4 py-3 rounded-[14px]"
                    style={{
                      background: "rgba(11,4,24,0.78)",
                      backdropFilter: "blur(16px)",
                      border: "1px solid rgba(196,181,253,0.15)",
                    }}
                  >
                    <span
                      className="font-bold leading-none mb-0.5"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(28px, 5vw, 36px)",
                        color: "#DDD6FE",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {formatMinor(cfg.amount_minor)}
                    </span>
                    <span
                      className="text-white/45 font-semibold uppercase tracking-[0.2em]"
                      style={{ fontSize: "9px" }}
                    >
                      Hoş Geldin Ayrıcalığı
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Right: content ── */}
              <div className="flex-1 px-7 py-7 sm:px-10 sm:py-10 flex flex-col justify-center min-h-0">
                <AnimatePresence mode="wait">
                  {/* Entry state */}
                  {phase === "entry" && (
                    <motion.div
                      key="entry"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {/* Eyebrow */}
                      <p
                        className="font-bold uppercase mb-4"
                        style={{ color: "#8B5CF6", fontSize: "9px", letterSpacing: "0.32em" }}
                      >
                        ✦ ÇiçekYolla&apos;ya Hoş Geldiniz
                      </p>

                      {/* Headline */}
                      <h2
                        className="text-white font-semibold mb-3"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "clamp(22px, 3.2vw, 30px)",
                          lineHeight: 1.1,
                          letterSpacing: "-0.018em",
                          whiteSpace: "pre-line",
                        }}
                      >
                        {cfg.title}
                      </h2>

                      {/* Subtitle */}
                      <p className="text-white/42 text-sm leading-relaxed mb-6 max-w-[340px]">
                        {cfg.description}
                      </p>

                      {/* Min cart note */}
                      <p className="text-white/25 text-xs mb-6 flex items-center gap-1.5">
                        <span style={{ color: "#A78BFA", fontSize: "8px" }}>◇</span>
                        {cfg.min_cart_total_minor
                          ? `${formatMinor(cfg.min_cart_total_minor)} ve üzeri siparişlerde`
                          : "İlk siparişinize özel"}
                      </p>

                      {/* Form */}
                      <form onSubmit={handleSubmit} noValidate>
                        <div className="mb-3">
                          <input
                            type="email"
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
                            className="w-full text-sm text-white placeholder:text-white/30 focus:outline-none transition-all"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: fieldBorder(errorField === "email"),
                              borderRadius: "14px",
                              padding: "13px 16px",
                            }}
                            onFocus={(e) => {
                              (e.target as HTMLElement).style.border = "1.5px solid rgba(196,181,253,0.45)";
                              (e.target as HTMLElement).style.background = "rgba(255,255,255,0.09)";
                            }}
                            onBlur={(e) => {
                              (e.target as HTMLElement).style.border = fieldBorder(errorField === "email");
                              (e.target as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                            }}
                          />
                        </div>

                        <div className="mb-3">
                          <input
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
                            placeholder={`Şifre belirleyin (en az ${PASSWORD_MIN} karakter)`}
                            className="w-full text-sm text-white placeholder:text-white/30 focus:outline-none transition-all"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: fieldBorder(errorField === "password"),
                              borderRadius: "14px",
                              padding: "13px 16px",
                            }}
                          />
                        </div>

                        {/* ── AYDINLATMA ONAYI — İŞARETSİZ BAŞLAR, ZORUNLUDUR ──
                            Kutu işaretlenmeden istek atılmaz; gövdeye de yalnız
                            bu değer yazılır (lib/consent.registerRequestBody).
                            Sunucu da `kvkk_onay !== true` ise 400 döner, yani
                            onay iki katmanda aynı kuralla korunur. */}
                        <label
                          className="mb-3 flex cursor-pointer items-start gap-2.5 text-white/45"
                          style={{ fontSize: "11px", lineHeight: 1.5 }}
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
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#8B5CF6]"
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
                              className="underline underline-offset-2 transition-colors hover:text-white/70"
                            >
                              Üyelik Aydınlatma Metni
                            </a>
                            &apos;ni okudum, kişisel verilerimin üyelik kapsamında işlenmesini kabul
                            ediyorum.
                          </span>
                        </label>

                        {/* PAZARLAMA E-POSTA İZNİ — isteğe bağlı, işaretsiz başlar.
                            Metin API'den gelir (saklanan metin sürümüyle aynı). */}
                        {marketingCheckboxVisible(marketingConfig) && (
                          <label
                            className="mb-3 flex cursor-pointer items-start gap-2.5 text-white/45"
                            style={{ fontSize: "11px", lineHeight: 1.5 }}
                          >
                            <input
                              type="checkbox"
                              checked={marketingTicked}
                              onChange={(e) => setMarketingTicked(e.target.checked)}
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#8B5CF6]"
                            />
                            <span>
                              <span className="text-white/70">{marketingConfig.text.label}</span>
                              {marketingConfig.text.body && (
                                <span className="mt-1 block text-white/35">{marketingConfig.text.body}</span>
                              )}
                            </span>
                          </label>
                        )}

                        {error && (
                          <p
                            id="uyelik-popup-hata"
                            role="alert"
                            aria-live="assertive"
                            className="mb-3 text-xs"
                            style={{ color: "#F87171" }}
                          >
                            {error}
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-3.5 rounded-full text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
                          style={{
                            background: loading
                              ? "rgba(139,92,246,0.5)"
                              : "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)",
                            boxShadow: loading ? "none" : "0 8px 24px rgba(139,92,246,0.45)",
                            cursor: loading ? "not-allowed" : "pointer",
                          }}
                        >
                          {loading ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <>
                              {cfg.cta_text}
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </form>

                      {/* Dismiss */}
                      <button
                        onClick={dismiss}
                        className="mt-4 w-full text-center text-xs text-white/28 hover:text-white/50 transition-colors"
                      >
                        Şimdi değil
                      </button>

                      {/* Aydınlatma metni artık formun İÇİNDE, işaretlenmesi ZORUNLU
                          bir onay kutusudur (yukarı bakın). Buradaki eski bilgi
                          satırı ("E-postanız … kapsamında işlenir") kaldırıldı:
                          onay, okunduğunu varsayan bir dipnot değil, kullanıcının
                          gerçekten verdiği bir karardır. Yerine ikinci bir vaat
                          KOYULMADI — tutamayacağımız bir cümle yazmıyoruz. */}
                    </motion.div>
                  )}

                  {/* Success state — yalnız gerçek kayıt başarılı olursa */}
                  {phase === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {/* Check mark */}
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 240, damping: 18 }}
                        className="w-12 h-12 rounded-full flex items-center justify-center mb-5"
                        style={{
                          background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
                          boxShadow: "0 8px 28px rgba(139,92,246,0.45)",
                        }}
                      >
                        <Check className="w-5 h-5 text-white" />
                      </motion.div>

                      <p
                        className="font-bold uppercase mb-4"
                        style={{ color: "#8B5CF6", fontSize: "9px", letterSpacing: "0.32em" }}
                      >
                        ✦ Hoş Geldiniz
                      </p>

                      <h2
                        className="text-white font-semibold mb-2"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "clamp(20px, 2.8vw, 26px)",
                          lineHeight: 1.15,
                          letterSpacing: "-0.015em",
                        }}
                      >
                        İlk sipariş ayrıcalığınız hazır.
                      </h2>

                      {/* Kuralın metni SUNUCUDAN gelen alanlardan kurulur
                          (welcomeRuleText); popup ikinci bir indirim kuralı
                          yazmaz. Kural boş dönerse cümle hiç çizilmez. */}
                      <p className="text-white/42 text-sm leading-relaxed mb-6">
                        Hoş geldin ayrıcalığınız üyeliğinize tanımlandı.
                        {welcomeRule ? ` ${welcomeRule}` : ""}
                      </p>
                      {marketingNotice && (
                        <p role="status" className="text-white/55 text-xs leading-relaxed mb-6">
                          {marketingNotice}
                        </p>
                      )}

                      {/* GERÇEK kupon kodu — Kupon Merkezi'ndeki kampanyadan gelir.
                          Kod yoksa bu blok hiç çizilmez (uydurma kod gösterilmez). */}
                      {coupon?.code && (
                        <div
                          className="flex items-center justify-between px-4 py-3 rounded-[12px] mb-6"
                          style={{ background: "rgba(139,92,246,0.12)", border: "1.5px dashed rgba(196,181,253,0.3)" }}
                        >
                          <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">
                            Kupon Kodu
                          </span>
                          <span
                            className="text-white font-bold tracking-widest"
                            style={{ fontFamily: "var(--font-display)", fontSize: "15px", letterSpacing: "0.12em" }}
                          >
                            {coupon.code}
                          </span>
                        </div>
                      )}

                      <button
                        onClick={handleContinue}
                        className="w-full py-3.5 rounded-full text-white font-bold text-sm flex items-center justify-center gap-2"
                        style={{
                          background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)",
                          boxShadow: "0 8px 24px rgba(139,92,246,0.45)",
                        }}
                      >
                        {isProductPage() ? "Ürünüme Devam Et" : "Çiçekleri Keşfet"}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
