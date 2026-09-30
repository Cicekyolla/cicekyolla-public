"use client";

/**
 * HESABIM — üyenin kendi verisini gördüğü tek ekran.
 *
 * DEĞİŞMEZ KURAL: buradaki her rakam ve her durum cümlesi `GET /api/account`
 * (→ API `GET /api/auth/account`) gövdesinden gelir. Admin üye detayı AYNI
 * `accountOrders` sorgusunu okur; bu yüzden istemci hiçbir iş kuralını yeniden
 * hesaplamaz. "Kaç sipariş ödenmiş", "hangi kupon kullanılabilir", "geçmiş
 * gizli mi" kararları sunucuda verilir (orderTruth.ts, couponLifecycle.ts,
 * memberAccountController.ts). Yeniden hesaplarsak iki ekran birbirini yalanlar.
 *
 * DÜZELTİLEN KÖK NEDENLER
 *  1. Ekran `order.items` ve `order.timeline` bekliyordu; üye projeksiyonunda
 *     (accountOrders.MEMBER_ORDER_COLUMNS) bu alanlar YOK — zaman çizelgesi
 *     bölümü her siparişte "henüz durum hareketi yok" yazıyordu, ürün listesi
 *     hiç çizilmiyordu ve `order.items.length` tanımsıza erişme riski taşıyordu.
 *  2. Aktif/geçmiş sipariş ve "aktif kupon" sayıları İSTEMCİDE sayılıyordu;
 *     artık sunucunun `order_summary` bloğu basılır (admin ile aynı rakam).
 *  3. Bilinmeyen `status`/`payment_status` değeri ham enum olarak ekrana
 *     düşüyordu ("courier" yerine "Kuryeye verildi"); artık nötr Türkçe cümle.
 *  4. Sahiplik (`ownership`) bloğu hiç okunmuyordu: telefonu doğrulanmamış üye
 *     geçmişinin neden görünmediğini öğrenemiyordu (DECISIONS #9).
 *  5. Hoş geldin avantajı Hesabım'da hiç görünmüyordu; artık SALT OKUNUR ve
 *     kuralı sunucunun alanlarından kurulur (uydurma tutar/koşul yok).
 *
 * MÜŞTERİYE MESAJ GİDEN EYLEM ÖNCE ONAY İSTER (UI sözleşmesi): WhatsApp
 * doğrulama bağlantısı ve "tüm cihazlarda çıkış" iki adımlıdır ve sonrasında
 * SUNUCUNUN kendi cümlesi (read-back) gösterilir.
 */

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays, ChevronDown, Clock3, Gift, LogOut, Mail, MapPin, MessageCircle,
  Package, Route, ShieldAlert, Sparkles, Star, Ticket, Truck,
} from "lucide-react";
import { FormAlert } from "@/components/auth/FormAlert";
import {
  fetchMarketingConfig,
  fetchMarketingConsent,
  fetchWelcomeCoupon,
  marketingToggleView,
  setMarketingConsent,
  type MarketingConfig,
  type MarketingConsentState,
  type WelcomeCoupon,
} from "@/lib/consent";
import { normalizeTrMobile, formatTrMobile, viewForResponse, viewForThrown } from "@/lib/authErrors";
// Üst bardaki hesap girişi bu sayfanın YANITINDAN öğrenir (yalnız "üye mi"
// bilgisi; kişisel hiçbir alan yazılmaz) → giriş/çıkış sonrası header bayat
// kalmaz. Hesabım'ın kendi davranışı değişmez.
import { forgetMemberSession, noteMemberSession } from "@/lib/memberSessionHint";
import {
  LOGOUT_ALL_CONFIRM_TEXT,
  couponStatusLabel,
  couponValueText,
  displayPhone,
  formatDateTime,
  formatDeliveryDate,
  formatMinorTry,
  memberInitials,
  orderStatusLabel,
  ownershipNotice,
  partitionCoupons,
  paymentStatusLabel,
  phoneVerifyConfirmText,
  splitOrdersByPhase,
  summaryTiles,
  tierLabel,
  welcomeOfferView,
  welcomeSectionVisible,
  emailReviewView,
  type MemberAccount,
  type MemberCoupon,
  type MemberLoyalty,
  type MemberOrder,
} from "@/lib/memberAccountView";

/** Sipariş durumuna ikon; ETİKET sunucunun değerinden lib'de üretilir. */
const STATUS_ICON: Record<string, typeof Package> = {
  new: Package,
  confirmed: Sparkles,
  preparing: Gift,
  designing: Sparkles,
  ready: Package,
  courier: Truck,
  delivering: Route,
  delivered: Star,
  cancelled: Package,
};

/** Seviye eşiği — değerler sunucudan gelir, burada yalnız sıralanır. */
function nextTier(loyalty: MemberLoyalty) {
  const rules = [
    ["silver", loyalty.silver_threshold],
    ["gold", loyalty.gold_threshold],
    ["premium", loyalty.premium_threshold],
  ] as const;
  return rules.find(([, threshold]) => threshold > 0 && loyalty.lifetime_earned < threshold) ?? null;
}

type Pending = null | "phone" | "logoutAll" | "emailRemove";

export default function AccountPage() {
  const [account, setAccount] = useState<MemberAccount | null>(null);
  const [welcome, setWelcome] = useState<WelcomeCoupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* İki adımlı onay: hangi eylem onay bekliyor? */
  const [pending, setPending] = useState<Pending>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  /* Sunucunun read-back cümlesi (uydurulmuş "gönderildi" YOK). */
  const [actionNotice, setActionNotice] = useState<{ tone: "error" | "success"; message: string } | null>(null);

  /* Pazarlama e-posta izni (DESIGN §3.G.2 — Hesabım anahtarı). Durum API'nin
     üye ucundan okunur; admin Üye Merkezi AYNI satırı okur. */
  const [marketing, setMarketing] = useState<MarketingConsentState | null>(null);
  const [marketingConfig, setMarketingConfig] = useState<MarketingConfig | null>(null);
  const [marketingBusy, setMarketingBusy] = useState(false);
  const [marketingNotice, setMarketingNotice] = useState<{ tone: "error" | "success"; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let response: Response;
    try {
      response = await fetch("/api/account", { cache: "no-store", credentials: "include" });
    } catch (thrown) {
      setError(viewForThrown(thrown).message);
      setLoading(false);
      return;
    }
    if (response.status === 401) {
      noteMemberSession("guest");
      setError("Bu sayfayı görmek için giriş yapmanız gerekiyor.");
      setLoading(false);
      return;
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(viewForResponse(response.status, body).message);
      setLoading(false);
      return;
    }
    setAccount((await response.json()) as MemberAccount);
    noteMemberSession("member");
    setError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* Hoş geldin avantajı SALT OKUNUR gösterilir; uygunluk kararı sunucudadır. */
  useEffect(() => {
    if (!account) return;
    let alive = true;
    void fetchWelcomeCoupon().then((offer) => {
      if (alive) setWelcome(offer);
    });
    return () => {
      alive = false;
    };
  }, [account]);

  useEffect(() => {
    if (!account) return;
    let alive = true;
    void Promise.all([fetchMarketingConsent(), fetchMarketingConfig()]).then(([state, config]) => {
      if (!alive) return;
      setMarketing(state.ok ? state.state : null);
      setMarketingConfig(config);
    });
    return () => {
      alive = false;
    };
  }, [account]);

  /** Anahtar: izin ver / geri çek. Ekrana SUNUCUNUN read-back'i basılır. */
  async function toggleMarketing(granted: boolean) {
    setMarketingBusy(true);
    setMarketingNotice(null);
    const result = await setMarketingConsent(granted, "account_settings");
    setMarketingBusy(false);
    if (!result.ok) {
      setMarketingNotice({ tone: "error", message: result.message });
      return;
    }
    setMarketing(result.state);
    setMarketingNotice({
      tone: "success",
      message:
        result.state.status === "granted"
          ? "Kampanya e-postası izniniz kaydedildi."
          : "Kampanya e-postası izniniz geri çekildi. Sipariş ve üyelik bildirimleri gelmeye devam eder.",
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => null);
    forgetMemberSession();
    window.location.href = "/";
  }

  /** ONAYDAN SONRA çalışır. Yanıt gövdesindeki sunucu cümlesi basılır. */
  async function sendPhoneVerification() {
    const session = displayPhone(account?.customer.phone);
    const typed = normalizeTrMobile(phoneInput);
    if (!session && !typed) {
      setActionNotice({
        tone: "error",
        message: "Cep telefonu numaranızı 5xx xxx xx xx biçiminde girin. Sabit hat numarası kullanılamaz.",
      });
      return;
    }
    setActionBusy(true);
    let response: Response;
    try {
      response = await fetch("/api/auth/telefon-dogrula/talep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        // Numara GÖVDEDE gider; adres çubuğuna/sorgu dizesine yazılmaz.
        body: JSON.stringify(typed ? { phone: typed } : {}),
      });
    } catch (thrown) {
      setActionBusy(false);
      setActionNotice({ tone: "error", message: viewForThrown(thrown).message });
      return;
    }
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    setActionBusy(false);
    setPending(null);
    if (!response.ok) {
      setActionNotice({ tone: "error", message: viewForResponse(response.status, body).message });
      return;
    }
    // READ-BACK: sunucunun kendi cümlesi. Gönderim gerçekten yapıldı mı bilgisi
    // bilinçli olarak nötrdür (hedef numaranın başka bir hesapta doğrulanmış
    // olması gibi ayrıntılar sızmasın) — biz de metni değiştirmiyoruz.
    setActionNotice({
      tone: "success",
      message:
        typeof body?.message === "string" && body.message.trim()
          ? body.message
          : "Talebiniz alındı. Numaranız WhatsApp kullanıyorsa bağlantı birkaç dakika içinde ulaşır.",
    });
  }

  /** W4-2 — "bu e-posta benim" / "kaldır". Karar ve cümle sunucudadır; sonra hesap yeniden okunur. */
  async function resolveEmailReview(karar: "onayla" | "kaldir") {
    setActionBusy(true);
    let response: Response;
    try {
      response = await fetch("/api/auth/eposta-inceleme", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ karar }),
      });
    } catch (thrown) {
      setActionBusy(false);
      setActionNotice({ tone: "error", message: viewForThrown(thrown).message });
      return;
    }
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    setActionBusy(false);
    setPending(null);
    if (!response.ok) {
      setActionNotice({ tone: "error", message: viewForResponse(response.status, body).message });
      return;
    }
    setActionNotice({
      tone: "success",
      message: typeof body?.message === "string" && body.message.trim() ? body.message : "Tercihiniz kaydedildi.",
    });
    await load();
  }

  async function logoutEverywhere() {
    setActionBusy(true);
    let response: Response;
    try {
      response = await fetch("/api/auth/oturumlari-kapat", { method: "POST", credentials: "include" });
    } catch (thrown) {
      setActionBusy(false);
      setActionNotice({ tone: "error", message: viewForThrown(thrown).message });
      return;
    }
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    setActionBusy(false);
    setPending(null);
    if (!response.ok) {
      setActionNotice({ tone: "error", message: viewForResponse(response.status, body).message });
      return;
    }
    // Oturum kapandı: bu sekme de artık yetkisiz. Sunucunun cümlesi giriş
    // sayfasında değil BURADA gösterilemez (yönlendiriyoruz), bu yüzden
    // yönlendirme öncesi kısa bir an için basılır.
    setActionNotice({
      tone: "success",
      message:
        typeof body?.message === "string" && body.message.trim()
          ? body.message
          : "Tüm cihazlarda oturumunuz kapatıldı.",
    });
    forgetMemberSession();
    window.location.href = "/giris";
  }

  if (loading) {
    return (
      <main className="min-h-[60vh] bg-background px-6 py-16 text-center text-muted-foreground">
        Hesabınız yükleniyor…
      </main>
    );
  }

  if (error || !account) {
    return (
      <main className="min-h-[60vh] bg-background px-6 py-16 text-center">
        <p className="text-muted-foreground">{error || "Hesap bilgileri görüntülenemedi."}</p>
        <a
          href="/giris?next=/hesabim"
          className="mt-5 inline-block rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground"
        >
          Giriş Yap
        </a>
      </main>
    );
  }

  const shownPhone = formatTrMobile(account.customer.phone) ?? displayPhone(account.customer.phone);
  const ownership = ownershipNotice(account.ownership, account.customer.phone);
  const offer = welcomeOfferView(welcome);
  const emailReview = emailReviewView(account);
  /* Kupon telefon kanıtı bekliyorsa da aynı kart gösterilir (DECISIONS #9). */
  const showOwnershipCard = ownership.visible || offer.state === "needs_phone_verification";
  const tiles = summaryTiles(account.order_summary);
  const { active, past } = splitOrdersByPhase(account.orders);
  const coupons = partitionCoupons(account.coupons);
  const target = nextTier(account.loyalty);
  /* W4-2: e-posta sahipliği onay beklerken o adrese izin anahtarı gösterilmez
     (API de GET'te adresi yok sayar, POST'u 409 ile reddeder). */
  const marketingView = marketingToggleView(account.email_review?.required === true ? null : marketing, marketingConfig);
  const progress = target
    ? Math.min(100, Math.round((account.loyalty.lifetime_earned / target[1]) * 100))
    : 100;

  return (
    <main className="min-h-[70vh] bg-background px-4 py-8 text-foreground sm:px-6 lg:px-14 lg:py-14">
      <div className="mx-auto max-w-[1240px] space-y-6">
        {/* ── Kimlik + oturum ── */}
        <section className="flex flex-wrap items-center justify-between gap-5 rounded-[24px] border border-border bg-card p-6 shadow-[0_18px_55px_rgba(45,22,72,.05)] sm:p-8">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
              {memberInitials(account.customer.name)}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.28em] text-primary">Müşteri paneli</p>
              <h1 className="mt-2 font-display text-3xl font-semibold">Hoş geldiniz, {account.customer.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {account.customer.email ?? "E-posta adresi kayıtlı değil"}
                {shownPhone ? ` · ${shownPhone}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <LogOut className="h-4 w-4" /> Çıkış Yap
            </button>
            {/* Tüm cihazlarda çıkış — mutasyon, bu yüzden önce onay. */}
            {pending === "logoutAll" ? (
              <span className="flex flex-wrap items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2 text-sm">
                <span className="text-secondary-foreground">{LOGOUT_ALL_CONFIRM_TEXT}</span>
                <button
                  onClick={logoutEverywhere}
                  disabled={actionBusy}
                  className="rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-60"
                >
                  {actionBusy ? "Kapatılıyor…" : "Onaylıyorum"}
                </button>
                <button onClick={() => setPending(null)} className="px-2 font-semibold text-muted-foreground">
                  Vazgeç
                </button>
              </span>
            ) : (
              <button
                onClick={() => {
                  setActionNotice(null);
                  setPending("logoutAll");
                }}
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <ShieldAlert className="h-4 w-4" /> Tüm cihazlarda çıkış
              </button>
            )}
          </div>
        </section>

        {actionNotice && <FormAlert tone={actionNotice.tone} message={actionNotice.message} />}

        {/* ── W4-2: telefon kanıtından sonra hesaptaki e-posta sizin mi? ── */}
        {emailReview.visible && (
          <section className="rounded-[24px] border border-primary/30 bg-secondary/50 p-6 shadow-[0_18px_55px_rgba(45,22,72,.05)] sm:p-7">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold">Bu e-posta adresi size mi ait?</h2>
                <p className="mt-2 font-semibold">{emailReview.emailMasked}</p>
                <p className="mt-2 max-w-3xl leading-7 text-muted-foreground">{emailReview.message}</p>
                {pending === "emailRemove" ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[16px] border border-border bg-card p-4">
                    <span className="text-sm text-muted-foreground">
                      Adres hesabınızdan kaldırılacak. Girişte telefon numaranızı kullanabilirsiniz. Emin misiniz?
                    </span>
                    <button
                      onClick={() => void resolveEmailReview("kaldir")}
                      disabled={actionBusy}
                      className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
                    >
                      Evet, kaldır
                    </button>
                    <button
                      onClick={() => setPending(null)}
                      disabled={actionBusy}
                      className="rounded-full border border-border px-5 py-2.5 text-sm font-bold"
                    >
                      Vazgeç
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => void resolveEmailReview("onayla")}
                      disabled={actionBusy}
                      className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
                    >
                      Bu adres benim
                    </button>
                    <button
                      onClick={() => setPending("emailRemove")}
                      disabled={actionBusy}
                      className="rounded-full border border-border px-5 py-2.5 text-sm font-bold"
                    >
                      Benim değil, kaldır
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Sahiplik: telefon doğrulama (DECISIONS #9) ── */}
        {showOwnershipCard && (
          <section className="rounded-[24px] border border-primary/30 bg-secondary/50 p-6 shadow-[0_18px_55px_rgba(45,22,72,.05)] sm:p-7">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold">
                  {ownership.visible ? ownership.title : "Telefonunuzu doğrulayın"}
                </h2>
                {/* Metin SUNUCUDAN gelir; burada yeniden yazılmaz. */}
                <p className="mt-2 max-w-3xl leading-7 text-muted-foreground">
                  {ownership.visible ? ownership.body : offer.message}
                </p>
                {ownership.historyHidden && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Doğrulama tamamlanana kadar bu sayfada yalnız üyelik tarihinizden sonraki
                    siparişler, puanlar ve kuponlar görünür.
                  </p>
                )}

                {/* Numara oturumda yoksa kullanıcıdan istenir. */}
                {ownership.needsPhoneInput && (
                  <label className="mt-4 grid max-w-sm gap-2 text-sm font-semibold">
                    Cep telefonu numaranız
                    <input
                      value={phoneInput}
                      onChange={(event) => setPhoneInput(event.target.value)}
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="0507 441 34 74"
                      className="h-13 rounded-[var(--radius)] border border-border bg-input-background px-4 py-3 outline-none focus-visible:border-primary"
                    />
                  </label>
                )}

                {pending === "phone" ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[16px] border border-border bg-card p-4">
                    <span className="text-sm text-muted-foreground">
                      {phoneVerifyConfirmText(
                        ownership.needsPhoneInput ? formatTrMobile(phoneInput) ?? phoneInput : shownPhone,
                      )}
                    </span>
                    <button
                      onClick={sendPhoneVerification}
                      disabled={actionBusy}
                      className="rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground disabled:opacity-60"
                    >
                      {actionBusy ? "Gönderiliyor…" : "Onaylıyorum, gönder"}
                    </button>
                    <button onClick={() => setPending(null)} className="px-2 font-semibold text-muted-foreground">
                      Vazgeç
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setActionNotice(null);
                      setPending("phone");
                    }}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground shadow-[0_18px_45px_rgba(139,92,246,.28)]"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {ownership.visible ? ownership.ctaLabel : "WhatsApp ile doğrulama bağlantısı gönder"}
                  </button>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Bağlantı 30 dakika geçerlidir ve yalnız bir kez kullanılabilir. Doğrulamayı
                  tamamlamak için bir şifre belirlemeniz istenir.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── Hoş geldin avantajı (SALT OKUNUR) ──
            Kampanya hiç yoksa bölüm çizilmez; üyenin kendi durumu (kullandınız,
            ilk sipariş değil, telefon doğrulaması gerekli) gösterilir. */}
        {welcomeSectionVisible(welcome) && (
          <section className="rounded-[24px] border border-border bg-card p-6 shadow-[0_18px_55px_rgba(45,22,72,.05)] sm:p-7">
            <div className="flex items-center gap-3">
              <Gift className="h-6 w-6 text-primary" />
              <h2 className="font-display text-xl font-semibold">Hoş geldin avantajınız</h2>
            </div>
            {offer.state === "usable" ? (
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <span className="rounded-full bg-accent px-5 py-2 text-lg font-black tracking-[.12em] text-accent-foreground">
                  {offer.code}
                </span>
                {/* Kural SUNUCUNUN alanlarından kurulur; uydurulmaz. */}
                {offer.ruleText && <p className="text-sm text-muted-foreground">{offer.ruleText}</p>}
              </div>
            ) : (
              <p className="mt-5 rounded-[18px] bg-muted p-5 text-muted-foreground">
                {offer.message ?? "Şu anda tanımlı bir hoş geldin avantajı bulunmuyor."}
              </p>
            )}
          </section>
        )}

        {/* ── Özet kartları: rakamlar YALNIZ order_summary'den ── */}
        {tiles.length > 0 && (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {tiles.map((tile) => (
              <Metric
                key={tile.key}
                icon={tile.key === "paid" ? Star : tile.key === "awaiting" ? Ticket : Package}
                label={tile.label}
                value={tile.value}
                detail={tile.detail}
              />
            ))}
          </section>
        )}

        {/* ── Sadakat ── */}
        {account.loyalty.is_active && (
          <section className="rounded-[24px] border border-border bg-gradient-to-br from-secondary to-card p-6 shadow-[0_18px_55px_rgba(45,22,72,.05)] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">Sadakat ve puan</p>
                <h2 className="mt-2 font-display text-2xl font-semibold">
                  {account.loyalty.available_points} kullanılabilir puan
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Teslim edilen her 100 TL için {account.loyalty.points_per_100_try} puan kazanılır. İptal
                  edilen siparişin puanı otomatik geri alınır.
                </p>
              </div>
              <span className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                {tierLabel(account.loyalty.tier)}
              </span>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-accent">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {target
                ? `${tierLabel(target[0])} seviyesi için ${Math.max(0, target[1] - account.loyalty.lifetime_earned)} puan kaldı.`
                : "En yüksek üyelik seviyesindesiniz."}
            </p>
            {account.loyalty.ledger.length > 0 ? (
              <div className="mt-5 grid gap-2 md:grid-cols-2">
                {account.loyalty.ledger.slice(0, 6).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-[16px] border border-border bg-card/80 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">{entry.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
                    </div>
                    <strong className={entry.points > 0 ? "text-primary" : "text-destructive"}>
                      {entry.points > 0 ? "+" : ""}
                      {entry.points}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-[16px] bg-card/80 p-4 text-sm text-muted-foreground">
                Henüz puan hareketiniz bulunmuyor. Teslim edilen ilk siparişinizde puan kazanmaya
                başlarsınız.
              </p>
            )}
          </section>
        )}

        {/* ── Siparişler ── */}
        <OrderSection
          title="Aktif siparişler"
          orders={active}
          empty="Şu anda devam eden siparişiniz bulunmuyor."
        />
        <OrderSection
          title="Geçmiş siparişler"
          orders={past}
          empty="Henüz tamamlanmış siparişiniz bulunmuyor."
        />

        {/* ── Kuponlar: sunucunun status alanına göre ── */}
        <section className="rounded-[24px] border border-border bg-card p-6 shadow-[0_18px_55px_rgba(45,22,72,.05)] sm:p-7">
          <div className="flex items-center gap-3">
            <Ticket className="h-6 w-6 text-primary" />
            <h2 className="font-display text-xl font-semibold">Kuponlarım</h2>
          </div>
          {coupons.available.length === 0 && coupons.other.length === 0 ? (
            <p className="mt-6 rounded-[18px] bg-muted p-5 text-muted-foreground">
              Hesabınıza tanımlı kupon bulunmuyor.
            </p>
          ) : (
            <div className="mt-6 space-y-6">
              <CouponGroup
                title="Kullanılabilir"
                coupons={coupons.available}
                empty="Şu anda kullanılabilir kuponunuz yok."
              />
              <CouponGroup
                title="Kullanılmış ve süresi geçmiş"
                coupons={coupons.other}
                empty="Kullanılmış kuponunuz yok."
              />
            </div>
          )}
        </section>

        {/* ── İletişim izinleri: kampanya e-postası (isteğe bağlı) ──
            İzin yoksa ve yakalama kapalıysa bölüm çizilmez; izin VARSA geri
            çekme her zaman mümkündür. Durum/engel etiketi sunucudan gelir. */}
        {marketingView.visible && (
          <section className="rounded-[24px] border border-border bg-card p-6 shadow-[0_18px_55px_rgba(45,22,72,.05)] sm:p-7">
            <div className="flex items-center gap-3">
              <Mail className="h-6 w-6 text-primary" />
              <h2 className="font-display text-xl font-semibold">İletişim izinleri</h2>
            </div>
            <label
              className={`mt-5 flex items-start gap-3 rounded-[18px] border border-border p-5 ${marketingView.canToggle ? "cursor-pointer" : "opacity-80"}`}
            >
              <input
                type="checkbox"
                checked={marketingView.checked}
                disabled={marketingBusy || !marketingView.canToggle}
                onChange={(event) => void toggleMarketing(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-primary"
              />
              <span className="min-w-0">
                {/* Yönetmelik m.7/5: kenar başlığı + en az 12 punto (16px). */}
                {marketingView.text?.heading && (
                  <span className="mb-1 block text-base font-bold text-foreground">{marketingView.text.heading}</span>
                )}
                <span className="text-base font-semibold">
                  {marketingView.text?.label ?? "Kampanya ve indirim duyurularını e-posta ile almak istiyorum."}
                </span>
                {marketingView.text?.body && (
                  <span className="mt-2 block text-base leading-7 text-muted-foreground">{marketingView.text.body}</span>
                )}
                {marketingView.statusLabel && (
                  <span className="mt-3 block text-sm text-muted-foreground">
                    Durum: <strong className="text-foreground">{marketingView.statusLabel}</strong>
                    {marketingBusy ? " · Kaydediliyor…" : ""}
                  </span>
                )}
                {marketingView.suppressedLabel && (
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Gönderim engeli: {marketingView.suppressedLabel}
                  </span>
                )}
              </span>
            </label>
            {marketingNotice && (
              <div className="mt-4">
                <FormAlert tone={marketingNotice.tone} message={marketingNotice.message} />
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-[22px] border border-border bg-card p-5 shadow-[0_12px_35px_rgba(45,22,72,.04)]">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}

function CouponGroup({
  title,
  coupons,
  empty,
}: {
  title: string;
  coupons: MemberCoupon[];
  empty: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-[.16em] text-muted-foreground">{title}</h3>
      {coupons.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {coupons.map((coupon) => (
            <article key={coupon.id} className="rounded-[20px] border border-border bg-secondary/60 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{coupon.name}</p>
                  <p className="mt-2 inline-block rounded-full bg-accent px-3 py-1 text-sm font-black tracking-wide text-accent-foreground">
                    {coupon.code}
                  </p>
                </div>
                {couponValueText(coupon) && (
                  <strong className="shrink-0 text-3xl font-black text-primary">{couponValueText(coupon)}</strong>
                )}
              </div>
              {/* Durum SUNUCUNUN status alanından; ham enum basılmaz. */}
              <p className="mt-5 text-sm text-muted-foreground">
                {couponStatusLabel(coupon.status)}
                {coupon.used_at ? ` · ${formatDateTime(coupon.used_at)}` : ""}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderSection({
  title,
  orders,
  empty,
}: {
  title: string;
  orders: MemberOrder[];
  empty: string;
}) {
  return (
    <section className="rounded-[24px] border border-border bg-card p-6 shadow-[0_18px_55px_rgba(45,22,72,.05)] sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          <h2 className="font-display text-xl font-semibold">{title}</h2>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
          {orders.length}
        </span>
      </div>
      {orders.length === 0 ? (
        <p className="mt-6 rounded-[18px] bg-muted p-5 text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </section>
  );
}

function OrderCard({ order }: { order: MemberOrder }) {
  const CurrentIcon = STATUS_ICON[(order.status ?? "").trim().toLowerCase()] ?? Package;
  /* Üye projeksiyonunda `items` YOKTUR (accountOrders.MEMBER_ORDER_COLUMNS);
     sunucu bir gün eklerse çizilir, eklemediyse bölüm hiç görünmez — "ürün
     bulunamadı" gibi yanlış bir cümle yazılmaz. */
  const items = Array.isArray(order.items) ? order.items : [];
  return (
    <details className="group rounded-[20px] border border-border bg-card open:bg-secondary/30">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary">
            <CurrentIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-black text-primary">{order.order_number}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateTime(order.created_at)} · {order.recipient_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-bold">{orderStatusLabel(order.status)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatMinorTry(order.total_amount_minor, order.currency ?? "TRY")}
            </p>
          </div>
          <ChevronDown
            aria-hidden
            className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </div>
      </summary>
      <div className="border-t border-border px-5 pb-6 pt-5">
        <div className="grid gap-3 rounded-[16px] bg-card p-4 sm:grid-cols-3">
          <Info icon={CalendarDays} label="Teslimat tarihi" value={formatDeliveryDate(order.delivery_date)} />
          <Info icon={Clock3} label="Saat aralığı" value={order.delivery_time_slot || "Saat belirlenmedi"} />
          <Info
            icon={MapPin}
            label="Teslimat bölgesi"
            value={[order.delivery_district, order.delivery_city].filter(Boolean).join(", ") || "Bölge bilgisi yok"}
          />
        </div>

        {/* Ödeme ve tutar dökümü — hepsi sunucunun alanları. */}
        <div className="mt-4 grid gap-3 rounded-[16px] bg-card p-4 sm:grid-cols-3">
          <Info icon={Ticket} label="Ödeme durumu" value={paymentStatusLabel(order.payment_status)} />
          {order.discount_minor != null && order.discount_minor > 0 && (
            <Info
              icon={Gift}
              label={order.coupon_code ? `İndirim (${order.coupon_code})` : "İndirim"}
              value={formatMinorTry(order.discount_minor, order.currency ?? "TRY")}
            />
          )}
          {order.delivery_fee_minor != null && (
            <Info
              icon={Truck}
              label="Teslimat ücreti"
              value={formatMinorTry(order.delivery_fee_minor, order.currency ?? "TRY")}
            />
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-bold">Ürünler</h3>
            <div className="mt-2 divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                  <span>
                    {item.product_name}
                    {item.variant_label ? ` · ${item.variant_label}` : ""} × {item.quantity}
                  </span>
                  <strong>{formatMinorTry(item.total_price_minor, order.currency ?? "TRY")}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Durum geçmişi bu uçta DÖNMEZ; sipariş takip sayfası tek kaynaktır. */}
        <a
          href={`/siparis-takip?order=${encodeURIComponent(order.order_number)}`}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-secondary"
        >
          <Route className="h-4 w-4" /> Sipariş durumunu ve geçmişini görün
        </a>
      </div>
    </details>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="text-xs font-bold uppercase tracking-[.1em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
