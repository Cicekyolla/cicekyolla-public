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
  type ConsentConfig,
  type WelcomeCoupon,
} from "@/lib/consent";

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

/** Çerez kararı verildi mi? Verilmeden pazarlama popup'ı bindirilmez (sıralı gösterim). */
function cookieDecided() {
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
  const [error, setError] = useState("");
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

  /**
   * GERÇEK zincir: mevcut üyelik akışı (/api/auth/register) → oturum çerezi →
   * Kupon Merkezi'ndeki gerçek hoş geldin kuponunun KODU.
   * Kayıt başarısız olursa başarı ekranına GEÇİLMEZ; kupon uydurulmaz.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }
    if (password.trim().length < 6) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }
    setError("");
    setLoading(true);

    const reg = await registerMember({ email: email.trim(), password });
    if (!reg.ok) {
      setLoading(false);
      setError(reg.message);
      return;
    }

    /* Üye artık gerçekten kayıtlı ve oturumu açık. Kuponu backend belirler. */
    const c = await fetchWelcomeCoupon();
    setLoading(false);
    if (!c.available || !c.code) {
      /* Üyelik oldu ama kampanya uygun değil → YALAN "kazandınız" gösterme. */
      setError("Üyeliğiniz oluşturuldu, ancak hoş geldin avantajı şu anda uygulanamıyor.");
      return;
    }
    setCoupon(c);
    setJoined();
    setPhase("success");
  }

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
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setError("");
                            }}
                            placeholder="E-posta adresiniz"
                            className="w-full text-sm text-white placeholder:text-white/30 focus:outline-none transition-all"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: error
                                ? "1.5px solid rgba(239,68,68,0.5)"
                                : "1.5px solid rgba(196,181,253,0.14)",
                              borderRadius: "14px",
                              padding: "13px 16px",
                            }}
                            onFocus={(e) => {
                              (e.target as HTMLElement).style.border = "1.5px solid rgba(196,181,253,0.45)";
                              (e.target as HTMLElement).style.background = "rgba(255,255,255,0.09)";
                            }}
                            onBlur={(e) => {
                              (e.target as HTMLElement).style.border = error
                                ? "1.5px solid rgba(239,68,68,0.5)"
                                : "1.5px solid rgba(196,181,253,0.14)";
                              (e.target as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                            }}
                          />
                        </div>

                        <div className="mb-3">
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setError("");
                            }}
                            placeholder="Şifre belirleyin (en az 6 karakter)"
                            className="w-full text-sm text-white placeholder:text-white/30 focus:outline-none transition-all"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: error
                                ? "1.5px solid rgba(239,68,68,0.5)"
                                : "1.5px solid rgba(196,181,253,0.14)",
                              borderRadius: "14px",
                              padding: "13px 16px",
                            }}
                          />
                          {error && (
                            <p className="mt-1.5 text-xs" style={{ color: "#F87171" }}>
                              {error}
                            </p>
                          )}
                        </div>

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

                      {/* KVKK — e-posta toplandığı için zorunlu; tek satır, tasarımı bozmaz */}
                      <p className="mt-3 text-center text-white/20" style={{ fontSize: "10px" }}>
                        E-postanız{" "}
                        <a href="/kvkk" className="underline underline-offset-2 hover:text-white/40 transition-colors">
                          Aydınlatma Metni
                        </a>{" "}
                        kapsamında işlenir.
                      </p>
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

                      <p className="text-white/42 text-sm leading-relaxed mb-6">
                        {formatMinor(coupon?.amount_minor ?? cfg.amount_minor)} hoş geldin ayrıcalığınız
                        üyeliğinize tanımlandı.
                        {coupon?.min_cart_total_minor
                          ? ` ${formatMinor(coupon.min_cart_total_minor)} ve üzeri siparişlerde geçerlidir.`
                          : ""}
                        {coupon?.first_order_only ? " Yalnızca ilk siparişinizde kullanılabilir." : ""}
                      </p>

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
