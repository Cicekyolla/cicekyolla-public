"use client";

// ---------------------------------------------------------------------------
// CHECKOUT WIZARD (FAZ A + Ek Ürünler) — Premium sipariş hazırlama deneyimi.
// Checkout DEVAM EDİYOR: ürün+teslimat seçildi; tek merkezi state ile
// Alıcı → Kart Mesajı → Gönderen → (Ek Ürünler) → Ödeme(Özet) yolculuğu.
// Sipariş POST'u YALNIZ son adımda; items[] dizisine ek ürünler eklenir
// (contract değişmez — items zaten dizi). Order Flow DEĞİŞMEZ.
// Yaşayan sipariş fişi sağda; her seçimde canlı güncellenir.
// FIX (422): Ek ürün (addon) satırlarında product_id / quantity /
// unit_price_minor artık ana üründeki gibi güvenli sayıya çevrilir —
// API'den string gelen değerler Zod validasyonunu düşürüyordu.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Check, ArrowRight, ArrowLeft, MapPin, Calendar, Clock, Package, User,
  Heart, MessageSquareText, ShieldCheck, Truck, Pencil, Plus, Minus, ShoppingBag, Gift,
  Sparkles, Star, RefreshCw, TicketPercent, CreditCard, Landmark, MessageCircle,
} from "lucide-react";
import { ProductImage } from "@/components/product/ProductImage";
import { readPendingDelivery, clearPendingDelivery, savePendingDelivery, type PendingDelivery } from "@/lib/pendingDelivery";
import DeliveryPlanner, { type SelectedDelivery } from "@/components/product/DeliveryPlanner";
import { OCCASIONS, DELIVERY_NOTES, occasionLabel } from "@/lib/checkoutConfig";
import { suggestMessages, TONES, type Tone, type Lang } from "@/lib/cardMessages";
import type { CheckoutAddon } from "./CheckoutFlow";
import { fetchBankAccounts, createHavaleOrder, initPaytr, ibanPretty, SUPPORT_WHATSAPP, type BankAccountPublic } from "@/lib/payment";
import { trackHavaleOrderPurchase } from "@/lib/purchaseAnalytics";
import { useI18n, Num } from "@/lib/i18n";
import { formatMinorTRY } from "@/lib/api";
import { CheckoutProgress } from "./CheckoutProgress";

const SLOTS = ["09:00–12:00", "12:00–15:00", "15:00–18:00", "18:00–21:00"];
// Tek para formatı (PDP/sepet ile aynı): formatMinorTRY — kuruş gösterilmez (hesap değişmez, yalnız görüntü).
const money = (m: number) => formatMinorTRY(m);
// Kart (PayTR) yalnız açık anahtar varken gösterilir. PayTR production anahtarı
// gelince public Vercel'de NEXT_PUBLIC_PAYTR_ENABLED=true → kart görünür. Şimdilik
// (sandbox) kapalı → müşteriye yalnız Havale/EFT gösterilir.
const CARD_ENABLED = process.env.NEXT_PUBLIC_PAYTR_ENABLED === "true";

// --- Doğrulama (API sözleşmesiyle uyumlu) ---
// E-posta: backend Zod .email() ile birebir (Response "Invalid email" = Zod default).
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
// Telefon: TR formatı. Rakamları al; 10 hane (5xx...) veya 11 hane (05xx) veya +90'lı 12 hane kabul.
const phoneDigits = (v: string) => v.replace(/\D/g, "");
const isValidTRPhone = (v: string) => {
  const d = phoneDigits(v);
  // 5xxxxxxxxx (10) | 05xxxxxxxxx (11) | 905xxxxxxxxx (12)
  if (d.length === 10) return d.startsWith("5");
  if (d.length === 11) return d.startsWith("05");
  if (d.length === 12) return d.startsWith("905");
  return false;
};
function fmtDate(d?: string, intl = "tr-TR"): string | null {
  if (!d) return null;
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(intl, { day: "numeric", month: "long", weekday: "long" });
}
function mapToSlot(start?: string, label?: string): string {
  if (label && SLOTS.includes(label)) return label;
  const h = start ? parseInt(start.slice(0, 2), 10) : NaN;
  if (h >= 9 && h < 12) return SLOTS[0];
  if (h >= 12 && h < 15) return SLOTS[1];
  if (h >= 15 && h < 18) return SLOTS[2];
  if (h >= 18 && h < 21) return SLOTS[3];
  return SLOTS[0];
}

type Props = { productName: string; productId: number | null; variantId?: number | null; priceMinor: number; productSlug?: string; coverUrl?: string | null; addons?: CheckoutAddon[]; quantity?: number; initialAddonQty?: Record<number, number>; delivery?: PendingDelivery; onComplete?: () => void;
  /** Teslimat checkout içinde düzenlenince sepete geri yazar (tek kaynak sepettir). */
  onDeliveryChange?: (delivery: PendingDelivery) => void;
  /** Hesap adımındaki "Düzenle" ile gelindiyse panel açık başlar. */
  initialEditDelivery?: boolean };

export default function CheckoutWizard({ productName, productId, variantId, priceMinor, productSlug, coverUrl, addons = [], quantity = 1, initialAddonQty, delivery, onComplete, onDeliveryChange, initialEditDelivery = false }: Props) {
  const { t, intl } = useI18n();
  const steps = useMemo(() => {
    const base = [
      { key: "urun", label: t("common.product") },
      { key: "teslimat", label: t("co.steps.delivery") },
      { key: "alici", label: t("co.recipient") },
      { key: "kart", label: t("co.cardMessage") },
      { key: "gonderen", label: t("co.sender") },
      { key: "odeme", label: t("co.steps.confirm") },
    ];
    if (addons.length > 0) base.splice(4, 0, { key: "ekurun", label: t("co.addons") });
    return base;
  }, [addons, t]);

  const [stepIdx, setStepIdx] = useState(2);
  const [done, setDone] = useState<{ order_number: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pd, setPd] = useState<PendingDelivery | null>(delivery ?? null);
  // TESLİMAT DÜZENLEME — checkout'tan ÇIKMADAN. Panel açıkken sihirbaz mount kalır,
  // bu yüzden alıcı/kart mesajı/gönderen/fatura gibi doldurulmuş alanlar korunur.
  const [editingDelivery, setEditingDelivery] = useState(initialEditDelivery);
  // Panelde seçilen YENİ teslimat. null = adres/tarih değişti, geçerli seçim yok.
  const [draftDelivery, setDraftDelivery] = useState<PendingDelivery | null>(null);
  // Ödeme yöntemi (Kart = PayTR iframe · Havale = IBAN, "ödeme bekliyor").
  const [paymentMethod, setPaymentMethod] = useState<"card" | "havale">(CARD_ENABLED ? "card" : "havale");
  const [bankAccounts, setBankAccounts] = useState<BankAccountPublic[]>([]);
  useEffect(() => { fetchBankAccounts().then(setBankAccounts).catch(() => { /* yok say */ }); }, []);

  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [occasion, setOccasion] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [specialNote, setSpecialNote] = useState("");
  const [address, setAddress] = useState("");
  const [cardMessage, setCardMessage] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [visibility, setVisibility] = useState<"show" | "anonymous" | "hidden">("show");
  const [surprise, setSurprise] = useState(false);
  const [addonQty, setAddonQty] = useState<Record<number, number>>(initialAddonQty ?? {});
  // Kupon (indirim daima backend /api/public/coupon motorundan gelir; frontend hesap yapmaz)
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount_minor: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const qty = Math.max(1, Math.round(quantity));

  // --- Checkout taslağı (sessionStorage): yenilemede ödeme-dışı bilgiler korunur ---
  const DRAFT_KEY = `cy_checkout_draft_${productSlug ?? "default"}`;
  const draftLoaded = useMemo(() => ({ v: false }), []);
  useEffect(() => {
    if (typeof window === "undefined" || draftLoaded.v) return;
    try {
      const raw = window.sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.recipientName != null) setRecipientName(d.recipientName);
        if (d.recipientPhone != null) setRecipientPhone(d.recipientPhone);
        if (d.occasion != null) setOccasion(d.occasion);
        if (Array.isArray(d.notes)) setNotes(d.notes);
        if (d.specialNote != null) setSpecialNote(d.specialNote);
        if (d.address != null) setAddress(d.address);
        if (d.cardMessage != null) setCardMessage(d.cardMessage);
        if (d.senderName != null) setSenderName(d.senderName);
        if (d.senderPhone != null) setSenderPhone(d.senderPhone);
        if (d.senderEmail != null) setSenderEmail(d.senderEmail);
        if (d.visibility != null) setVisibility(d.visibility);
        if (typeof d.surprise === "boolean") setSurprise(d.surprise);
        if (d.addonQty != null) setAddonQty(d.addonQty);
      }
    } catch { /* taslak bozuksa yok say */ }
    draftLoaded.v = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const p = delivery ?? readPendingDelivery();
    if (!p) return;
    if (productSlug && p.productSlug && p.productSlug !== productSlug) return;
    setPd(p);
    if (p.address && !address) setAddress(p.address);
    if (p.occasion && !occasion) setOccasion(p.occasion as string);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery, productSlug]);

  // Gerçek üye oturumu varsa gönderen alanlarını hesaptan doldur; misafir akışı değişmez.
  useEffect(() => {
    fetch("/api/account", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((account) => {
        if (!account?.customer) return;
        setSenderName((current) => current || account.customer.name || "");
        setSenderPhone((current) => current || account.customer.phone || "");
        setSenderEmail((current) => current || account.customer.email || "");
      })
      .catch(() => undefined);
  }, []);

  // Taslağı otomatik kaydet (ödeme-dışı bilgiler). Sipariş tamamlanınca temizlenir.
  useEffect(() => {
    if (typeof window === "undefined" || !draftLoaded.v || done) return;
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        recipientName, recipientPhone, occasion, notes, specialNote, address,
        cardMessage, senderName, senderPhone, senderEmail, visibility, surprise, addonQty,
      }));
    } catch { /* kota dolabilir, yok say */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientName, recipientPhone, occasion, notes, specialNote, address, cardMessage, senderName, senderPhone, senderEmail, visibility, surprise, addonQty]);

  const addonsTotal = useMemo(
    () => addons.reduce((s, a) => s + (addonQty[a.id] || 0) * a.priceMinor, 0),
    [addons, addonQty]
  );
  const subtotal = priceMinor * qty + addonsTotal;
  const discountMinor = coupon?.discount_minor ?? 0;
  const total = Math.max(0, subtotal - discountMinor);

  // Sepet değişince uygulanmış kupon geçersiz olabilir → temizle (yeniden uygulanır).
  useEffect(() => { if (coupon) { setCoupon(null); setCouponMsg(null); } /* eslint-disable-next-line */ }, [addonQty]);

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponBusy(true); setCouponMsg(null);
    try {
      const items = [
        { product_id: productId != null ? Number(productId) : null, quantity: qty },
        ...addons.filter((a) => (addonQty[a.id] || 0) > 0).map((a) => ({ product_id: Number(a.productId ?? a.id), quantity: addonQty[a.id] })),
      ].filter((it) => it.product_id != null);
      // Not: bölgesel kupon için ileride pd'ye sayısal city_id/district_id eklenince
      // buraya geçirilecek. Şu an bölge gönderilmez → backend bölgesiz kuponu her yerde geçerli sayar.
      const res = await fetch("/api/coupon", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, items }),
      });
      const json = await res.json().catch(() => null);
      const d = json?.data;
      if (d?.valid && d.discount_minor > 0) {
        setCoupon({ code: d.code, discount_minor: d.discount_minor });
        setCouponMsg(null);
      } else {
        setCoupon(null);
        setCouponMsg(d?.message ?? t("co.couponFail"));
      }
    } catch {
      setCoupon(null); setCouponMsg(t("co.couponErr"));
    } finally { setCouponBusy(false); }
  };
  const removeCoupon = () => { setCoupon(null); setCouponInput(""); setCouponMsg(null); };

  const dateStr = fmtDate(pd?.date, intl);
  const slotStr = pd?.slotLabel ?? (pd?.slotStart ? mapToSlot(pd.slotStart) : null);
  // Teslimat kararı PDP'den (pending.mode) taşınır; burada yeniden TAHMİN edilmez. Tek kargo dili: 1-3 iş günü.
  const typeStr = pd?.mode === "cargo" ? t("co.deliveryCargoLine") : pd?.mode === "sameday" ? t("co.deliverySameDayLine") : null;

  const toggleNote = (id: string) => setNotes((n) => (n.includes(id) ? n.filter((x) => x !== id) : [...n, id]));
  const setAddon = (id: number, q: number) => setAddonQty((m) => ({ ...m, [id]: Math.max(0, q) }));

  const stepKey = steps[stepIdx].key;
  const canNext = useMemo(() => {
    if (stepKey === "alici") return recipientName.trim().length > 0;
    if (stepKey === "gonderen")
      return senderName.trim().length > 0
        && isValidTRPhone(senderPhone)
        && isValidEmail(senderEmail);
    return true;
  }, [stepKey, recipientName, senderName, senderPhone, senderEmail]);

  const go = (dir: 1 | -1) => {
    setError(null);
    setStepIdx((i) => Math.min(steps.length - 1, Math.max(2, i + dir)));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    setError(null);
    if (!pd?.date || !address.trim() || (pd.mode === "sameday" && !pd.slotId && !pd.slotLabel && !pd.slotStart)) {
      setError(t("co.err.noDelivery")); return;
    }
    if (!senderName.trim() || !recipientName.trim()) {
      setError(t("co.err.names")); return;
    }
    if (!isValidTRPhone(senderPhone)) {
      setError(t("co.err.phone")); return;
    }
    if (!isValidEmail(senderEmail)) {
      setError(t("co.err.email")); return;
    }
    setLoading(true);
    try {
      const noteLabels = notes.map((id) => DELIVERY_NOTES.find((d) => d.id === id)?.label).filter(Boolean) as string[];
      if (surprise) noteLabels.push("Sürpriz gönderim");
      if (visibility === "hidden") noteLabels.push("Gönderen bilgisi gizli");
      else if (visibility === "anonymous") noteLabels.push("İsimsiz gönderim");
      const deliveryNotes = [noteLabels.join(", "), specialNote.trim()].filter(Boolean).join(" — ") || null;

      // İmza yalnız "Adımı Kartta Göster" seçiliyse eklenir (isimsiz/gizli → imza yok).
      const composedCard = cardMessage
        ? cardMessage + (visibility === "show" && senderName.trim() ? `\n— ${senderName.trim()}` : "")
        : null;

      // FIX (422): Ek ürün satırları da ana ürün gibi güvenli sayıya çevrilir.
      // API'den string gelen id/priceMinor, Zod (z.number().int()) tarafından
      // reddediliyordu. Geçersiz/pozitif olmayan id → null (şema nullable kabul eder).
      const items = [
        { product_id: productId != null ? Number(productId) : null, variant_id: variantId != null ? Number(variantId) : null, product_name: productName, quantity: qty, unit_price_minor: Math.round(Number(priceMinor)) },
        ...addons.filter((a) => (addonQty[a.id] || 0) > 0).map((a) => {
          const pid = Math.round(Number(a.productId ?? a.id));
          const q = Math.max(1, Math.round(Number(addonQty[a.id]) || 1));
          const price = Math.max(0, Math.round(Number(a.priceMinor) || 0));
          return {
            product_id: Number.isFinite(pid) && pid > 0 ? pid : null,
            variant_id: a.variantId != null ? Number(a.variantId) : null,
            product_name: a.name,
            quantity: q,
            unit_price_minor: price,
          };
        }),
      ];

      const orderBody = {
        customer_name: senderName, customer_phone: senderPhone,
        customer_email: senderEmail || null,
        recipient_name: recipientName, recipient_phone: recipientPhone || null,
        delivery_address: address || null, delivery_district: pd?.district || null,
        delivery_city: pd?.city || null,
        // KARGO = kurye slotu KESİNLİKLE yok (backend de siler; burada hiç gönderilmez).
        delivery_date: pd?.date || null,
        delivery_time_slot: pd?.mode === "cargo" ? null : (pd?.mode === "sameday" ? mapToSlot(pd?.slotStart, pd?.slotLabel) : (slotStr || null)),
        delivery_slot_id: pd?.mode === "cargo" ? null : (pd?.slotId ?? null),
        delivery_method: pd?.mode === "cargo" ? "cargo" : pd?.mode === "sameday" ? "courier" : null,
        card_message: composedCard, source: "web",
        occasion: occasion || null,
        sender_visibility: visibility,
        is_surprise: surprise,
        coupon_code: coupon?.code ?? null,
        delivery_notes: deliveryNotes,
        place_id: pd?.placeId || null,
        place_name: pd?.placeName || null,
        formatted_address: pd?.address || null,
        lat: pd?.lat ?? null,
        lng: pd?.lng ?? null,
        delivery_neighborhood: pd?.neighborhood || null,
        items,
      };

      if (paymentMethod === "havale") {
        // Havale: sipariş 'ödeme bekliyor' oluşur; dönen numara = havale referansı.
        const r = await createHavaleOrder(orderBody);
        // GA4 purchase — YALNIZ backend gerçek order_number döndürdükten sonra.
        // Hata olsaydı createHavaleOrder throw ederdi ve buraya hiç gelinmezdi.
        // Tutar backend'in yetkili toplamı (kupon/fiyat sunucuda yeniden hesaplanır).
        // Mükerrer koruması purchaseAnalytics içinde (memory + localStorage).
        trackHavaleOrderPurchase({
          order_number: r.order_number,
          total_amount_minor: typeof r.total_amount_minor === "number" ? r.total_amount_minor : total,
          items,
        });
        setDone({ order_number: r.order_number });
        clearPendingDelivery();
        try { window.sessionStorage.removeItem(DRAFT_KEY); } catch { /* yok say */ }
        onComplete?.();
      } else {
        // Kart: PayTR güvenli sayfasına yönlendir. Ödeme TAMAMLANMADAN sepet/taslak
        // TEMİZLENMEZ — kart reddinde müşteri bilgileriyle geri dönebilsin.
        const r = await initPaytr(orderBody);
        window.location.href = r.iframe_url;
        return;
      }
    } catch (failure) {
      const reason = failure instanceof Error ? failure.message : "";
      setError(reason === "delivery slot is no longer available"
        ? t("co.err.slotGone")
        : reason === "product_not_deliverable_to_address"
          ? t("co.err.notDeliverable")
          : t("co.err.generic"));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        {/* Anlatı burada kapanır: 4/4 Tamamlandı */}
        <div className="mb-10">
          <CheckoutProgress current={4} />
        </div>
        {/* V85 başarı — koyu editorial hero, ürün fotoğrafı tekrar güçlü.
            Konfeti/animasyon yok; sakin premium dil. Sipariş numarası davranışı
            DEĞİŞMEDİ, yalnız sunumu. */}
        <div
          className="overflow-hidden rounded-[22px] p-7 shadow-[0_28px_70px_-34px_rgba(76,29,149,0.85)]"
          style={{ background: "linear-gradient(175deg, #0F0224 0%, #1A0638 60%, #120328 100%)" }}
        >
          <div className="relative mx-auto w-[132px] overflow-hidden rounded-[16px] bg-white" style={{ aspectRatio: "4/5" }}>
            <ProductImage src={coverUrl ?? undefined} alt={productName} padding="8px" protect={false} sizes="132px" />
          </div>
          <p className="mt-5 text-[9px] tracking-[0.32em] uppercase font-bold" style={{ color: "#C4B5FD" }}>{t("co.done")}</p>
          <h1 className="mt-2 text-white font-semibold leading-snug" style={{ fontFamily: "var(--font-display)", fontSize: "26px", letterSpacing: "-0.02em" }}>
            {t("co.doneTitle")}
          </h1>
          <p className="mt-2 text-white/45 text-[13.5px] leading-relaxed">{productName}</p>

          <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(196,181,253,0.13)" }}>
            <p className="text-white/40 text-[12px]">{t("co.orderNo")}</p>
            <p className="mt-1 text-white font-semibold tracking-wide" style={{ fontFamily: "var(--font-display)", fontSize: "24px" }}><Num>{done.order_number}</Num></p>
          </div>
        </div>

        {/* Havale ödemesi: numara referans; ödeme onaylanınca hazırlanır */}
        <div className="mt-6 text-left rounded-2xl border border-[#EDE9FE] bg-[#FBFAFF] p-5">
          <div className="text-[13px] font-bold text-[#6D28D9] mb-1">{t("co.bankTitle")}</div>
          <div className="text-[12.5px] text-[#6B7280] mb-3">
            {t("co.bankInstrAmount", { amount: money(total), no: done.order_number })}
          </div>
          {bankAccounts.length === 0 ? (
            <div className="text-[12px] text-[#9CA3AF]">{t("co.bankContact")}</div>
          ) : (
            <div className="space-y-2.5">
              {bankAccounts.map((b) => (
                <div key={b.public_id} className="rounded-xl bg-white border border-[#EDE9FE] px-3.5 py-2.5">
                  <div className="text-[12.5px] font-bold text-[#1F2937]">{b.bank_name}{b.branch_name ? ` · ${b.branch_name}` : ""}</div>
                  <div className="text-[13px] font-mono text-[#4B5563] tracking-wide mt-0.5">{ibanPretty(b.iban)}</div>
                  <div className="text-[11.5px] text-[#9CA3AF] mt-0.5">{b.account_holder}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          <Link href={`/siparis-takip?order=${encodeURIComponent(done.order_number)}`} className="rounded-2xl bg-[#7C3AED] text-white font-bold px-7 py-3.5 hover:bg-[#6D28D9] transition-colors">
            {t("track.button")}
          </Link>
          <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-[#25D366] text-[#128C7E] font-bold px-7 py-3.5 hover:bg-[#F0FFF4] transition-colors">
            <MessageCircle className="w-4 h-4" /> {t("co.whatsappSupport")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* MOBİL ürün hafızası (V85): ürün ekranı boğmadan sürekli görünür kalır.
          Masaüstünde koyu sol panel bu görevi üstlenir. */}
      <div
        className="lg:hidden sticky top-0 z-30 -mx-5 mb-5 flex items-center gap-3 px-5 py-3"
        style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid rgba(139,92,246,0.10)" }}
      >
        <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-white ring-1 ring-[#EDE9FE]">
          <ProductImage src={coverUrl ?? undefined} alt={productName} padding="2px" protect={false} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[#111827] truncate">{productName}</p>
          {qty > 1 && <p className="text-[10px]" style={{ color: "#8B5CF6" }}>×{qty}</p>}
        </div>
        <span className="shrink-0 font-semibold text-[#111827]" style={{ fontFamily: "var(--font-display)", fontSize: "17px" }}>{money(total)}</span>
      </div>

      {/* Tek anlatı. İçerideki adım makinesi (steps/stepIdx) DEĞİŞMEDİ — yalnız
          müşteriye gösterilen faz haritası ortak bileşene devredildi. */}
      <CheckoutProgress current={stepKey === "odeme" ? 3 : 2} />

      {/* V85 kompozisyon: SOL ürün görsel hafızası · SAĞ o anki tek görev.
          Yalnız yerleşim/sıra değişti; adım mantığı ve state aynı. */}
      <div className="grid lg:grid-cols-[360px_1fr] gap-6 lg:gap-8 items-start mt-8">
        <div className="order-2 lg:order-1">
          <LivingReceipt
            productName={productName} coverUrl={coverUrl} productPrice={priceMinor} productQty={qty} total={total} subtotal={subtotal} productSlug={productSlug}
            addons={addons} addonQty={addonQty} coupon={coupon}
            regionLabel={`${pd?.neighborhood ? pd.neighborhood + ", " : ""}${pd?.district ?? ""}${pd?.city ? " / " + pd.city : ""}`}
            placeName={pd?.placeName ?? null} dateStr={dateStr} slotStr={slotStr} typeStr={typeStr}
            recipientName={recipientName} occasion={occasion} cardMessage={cardMessage} senderName={senderName}
            visibility={visibility} surprise={surprise}
            onEditDelivery={editingDelivery ? undefined : () => setEditingDelivery(true)}
            onEditStep={(key) => {
              // Checkout'tan ÇIKMADAN ilgili adıma atla. Adım makinesi değişmedi;
              // yalnız stepIdx taşınır, tüm doldurulmuş state yerinde kalır.
              const idx = steps.findIndex((s) => s.key === key);
              if (idx < 0) return;
              setEditingDelivery(false);
              setDraftDelivery(null);
              setError(null);
              setStepIdx(Math.max(2, idx));
              if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>

        <div className="order-1 lg:order-2 min-h-[320px]">
          {editingDelivery ? (
            <StepTeslimatDuzenle
              current={pd}
              productId={productId}
              draft={draftDelivery}
              onPlannerSelect={(sel) => {
                // null → adres/tarih değişti: ESKİ SLOT GEÇERSİZ, kaydetme kilitli.
                if (!sel) { setDraftDelivery(null); return; }
                setDraftDelivery({
                  productSlug, productName,
                  categoryId: pd?.categoryId ?? null,
                  date: sel.date,
                  mode: sel.mode,
                  slotId: sel.slot?.id ?? null,
                  slotLabel: sel.slot?.label,
                  slotStart: sel.slot?.start_time,
                  slotEnd: sel.slot?.end_time,
                  slotFeeMinor: sel.slot?.extra_fee_minor ?? null,
                  address: sel.address.formattedAddress,
                  placeName: sel.address.placeName ?? null,
                  neighborhood: sel.address.mahalle ?? null,
                  district: sel.address.ilce ?? undefined,
                  city: sel.address.il ?? undefined,
                  placeId: sel.address.placeId ?? null,
                  lat: sel.address.lat ?? null,
                  lng: sel.address.lng ?? null,
                  band: sel.band ?? null,
                  occasion: pd?.occasion,
                });
              }}
              onCancel={() => { setDraftDelivery(null); setEditingDelivery(false); }}
              onSave={() => {
                if (!draftDelivery) return;
                setPd(draftDelivery);                 // sipariş gövdesi bunu kullanır
                // Açık adres (cadde/bina/daire) YALNIZ konum gerçekten değiştiyse tazelenir.
                // Sadece saat/tarih değiştirildiğinde müşterinin yazdığı tarif korunur.
                const konumDegisti = (draftDelivery.placeId ?? draftDelivery.address) !== (pd?.placeId ?? pd?.address);
                if (konumDegisti) setAddress(draftDelivery.address ?? "");
                savePendingDelivery(draftDelivery);   // köprü tazelenir
                onDeliveryChange?.(draftDelivery);    // SEPET tek kaynak olarak güncellenir
                setDraftDelivery(null);
                setEditingDelivery(false);
              }}
            />
          ) : (
          <AnimatePresence mode="wait">
            <motion.div key={stepKey} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              {stepKey === "alici" && (
                <StepAlici
                  recipientName={recipientName} setRecipientName={setRecipientName}
                  recipientPhone={recipientPhone} setRecipientPhone={setRecipientPhone}
                  occasion={occasion} setOccasion={setOccasion}
                  notes={notes} toggleNote={toggleNote}
                  specialNote={specialNote} setSpecialNote={setSpecialNote}
                  address={address} setAddress={setAddress}
                  regionLabel={`${pd?.neighborhood ? pd.neighborhood + ", " : ""}${pd?.district ?? ""}${pd?.city ? " / " + pd.city : ""}`}
                />
              )}
              {stepKey === "kart" && <StepKart occasion={occasion} recipientName={recipientName} cardMessage={cardMessage} setCardMessage={setCardMessage} />}
              {stepKey === "gonderen" && (
                <StepGonderen
                  name={senderName} setName={setSenderName} phone={senderPhone} setPhone={setSenderPhone} email={senderEmail} setEmail={setSenderEmail}
                  visibility={visibility} setVisibility={setVisibility} surprise={surprise} setSurprise={setSurprise}
                />
              )}
              {stepKey === "ekurun" && <StepAddons addons={addons} addonQty={addonQty} setAddon={setAddon} />}
              {stepKey === "odeme" && (
                <StepOdeme
                  productName={productName} productPrice={priceMinor} productQty={qty} total={total} subtotal={subtotal}
                  addons={addons} addonQty={addonQty}
                  recipientName={recipientName} occasion={occasion}
                  address={address} region={`${pd?.district ?? ""}${pd?.city ? " / " + pd.city : ""}`}
                  dateStr={dateStr} slotStr={slotStr} typeStr={typeStr} cardMessage={cardMessage}
                  couponInput={couponInput} setCouponInput={setCouponInput}
                  coupon={coupon} couponMsg={couponMsg} couponBusy={couponBusy}
                  applyCoupon={applyCoupon} removeCoupon={removeCoupon}
                  paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} bankAccounts={bankAccounts} cardEnabled={CARD_ENABLED}
                />
              )}
            </motion.div>
          </AnimatePresence>
          )}

          {error && <div className="mt-5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-[13px] font-medium px-4 py-3">{error}</div>}

          {/* Teslimat düzenlenirken adım navigasyonu gizlenir; panelin kendi
              Kaydet / Vazgeç düğmeleri var. Sihirbaz mount kalır. */}
          <div className={`items-center gap-3 mt-7 ${editingDelivery ? "hidden" : "flex"}`}>
            {stepIdx > 2 && (
              <button onClick={() => go(-1)} className="flex items-center gap-2 rounded-2xl border border-[#E5E7EB] text-[#4B5563] font-semibold px-5 py-3.5 hover:bg-[#FAFAFB] transition-colors">
                <ArrowLeft className="w-4 h-4" /> Geri
              </button>
            )}
            {stepKey !== "odeme" ? (
              <button onClick={() => go(1)} disabled={!canNext}
                className={`group flex-1 flex items-center justify-center gap-2 rounded-2xl text-white text-[15px] font-bold py-4 transition-all shadow-[0_12px_30px_-10px_rgba(124,58,237,0.6)] ${canNext ? "bg-[#7C3AED] hover:bg-[#6D28D9] active:scale-[0.99]" : "bg-[#C4B5FD] cursor-not-allowed"}`}>
                {stepKey === "ekurun" ? "Bunlarla Devam Et" : "Devam Et"} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <button onClick={submit} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] active:scale-[0.99] text-white text-[15px] font-bold py-4 transition-all shadow-[0_12px_30px_-10px_rgba(124,58,237,0.6)] disabled:opacity-70">
                <ShieldCheck className="w-4 h-4" />
                {loading
                  ? (paymentMethod === "card" ? t("co.redirecting") : t("co.submitting"))
                  : (paymentMethod === "card" ? t("co.goSecurePay") : t("co.completeOrder"))}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ---------------------------- Ortak ------------------------------------- */
function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-[#F1F0F5] bg-white p-6 lg:p-7 mb-5 shadow-[0_10px_40px_-24px_rgba(124,58,237,0.25)]">
      <h2 className="text-[20px] lg:text-[22px] font-bold text-[#111827]" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>{title}</h2>
      {subtitle && <p className="text-[13.5px] text-[#6B7280] mt-1.5 leading-relaxed">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
const inputCls = "w-full px-4 py-3.5 rounded-2xl border border-[#E9E7F0] bg-[#FCFCFD] text-[15px] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#C4B5FD] focus:bg-white focus:ring-4 focus:ring-[#F5F3FF] transition-all";
const labelCls = "block text-[12px] font-semibold text-[#6B7280] mb-1.5";

/* ------------------- Teslimat Düzenle (checkout içi) --------------------- */
// Mevcut DeliveryPlanner + delivery-check altyapısını AYNEN kullanır; yeni
// teslimat sistemi/haritası/API'si yoktur. Checkout'tan çıkılmaz, sihirbaz
// mount kalır, doldurulmuş diğer alanlar korunur.
function StepTeslimatDuzenle(p: {
  current: PendingDelivery | null;
  productId: number | null;
  draft: PendingDelivery | null;
  onPlannerSelect: (sel: SelectedDelivery | null) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { t, intl } = useI18n();
  const line = (d: PendingDelivery | null) => {
    if (!d) return null;
    const yer = [d.placeName, d.neighborhood, d.district, d.city].filter(Boolean).join(", ");
    const gun = fmtDate(d.date, intl);
    const saat = d.mode === "cargo" ? t("co.cargoShort") : d.slotLabel ?? (d.slotStart ? mapToSlot(d.slotStart) : null);
    return [yer, gun, saat].filter(Boolean).join(" · ");
  };
  return (
    <div>
      <Card title={t("co.editDelivery")} subtitle={t("co.editDeliveryDesc")}>
        {/* Mevcut seçim */}
        <div className="rounded-2xl border border-[#EDE9FE] bg-[#FBFAFF] p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B5CF6]">{t("co.currentDelivery")}</div>
          <p className="mt-1.5 text-[13.5px] text-[#374151] leading-relaxed">{line(p.current) ?? t("co.noDeliveryYet")}</p>
        </div>

        {/* Yeni seçim — mevcut planlayıcı */}
        {p.productId != null ? (
          <div className="mt-4">
            <DeliveryPlanner
              product={{ id: p.productId, categoryId: p.current?.categoryId ?? null }}
              onSelect={p.onPlannerSelect}
            />
          </div>
        ) : (
          <p className="mt-4 text-[13px] text-[#B91C1C] font-semibold">{t("co.productUnreadable")}</p>
        )}

        {/* Yeni seçim özeti — yalnız geçerli seçim varken */}
        {p.draft && (
          <div className="mt-4 rounded-2xl border border-[#A7F3D0] bg-[#F0FDF4] p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#059669]">Yeni teslimat</div>
            <p className="mt-1.5 text-[13.5px] text-[#065F46] font-semibold leading-relaxed">{line(p.draft)}</p>
          </div>
        )}
      </Card>

      <div className="flex items-center gap-3">
        <button onClick={p.onCancel} className="flex items-center gap-2 rounded-2xl border border-[#E5E7EB] text-[#4B5563] font-semibold px-5 py-3.5 hover:bg-[#FAFAFB] transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t("co.cancel")}
        </button>
        <button
          onClick={p.onSave}
          disabled={!p.draft}
          className={`flex-1 flex items-center justify-center gap-2 rounded-2xl text-white text-[15px] font-bold py-4 transition-all ${p.draft ? "bg-[#7C3AED] hover:bg-[#6D28D9] active:scale-[0.99] shadow-[0_12px_30px_-10px_rgba(124,58,237,0.6)]" : "bg-[#C4B5FD] cursor-not-allowed"}`}
        >
          <Check className="w-4 h-4" /> {t("co.updateDelivery")}
        </button>
      </div>
      {!p.draft && (
        <p className="mt-3 text-[12.5px] font-semibold text-[#7C3AED]">{t("co.saveDeliveryHint")}</p>
      )}
    </div>
  );
}

/* ---------------------------- Adım: Alıcı ------------------------------- */
function StepAlici(p: {
  recipientName: string; setRecipientName: (v: string) => void;
  recipientPhone: string; setRecipientPhone: (v: string) => void;
  occasion: string | null; setOccasion: (v: string) => void;
  notes: string[]; toggleNote: (id: string) => void;
  specialNote: string; setSpecialNote: (v: string) => void;
  address: string; setAddress: (v: string) => void;
  regionLabel: string;
}) {
  const { t } = useI18n();
  return (
    <div>
      <Card title={t("co.recipientTitle")} subtitle={t("co.recipientDesc")}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>{t("co.recipientName")}</label><input className={inputCls} value={p.recipientName} onChange={(e) => p.setRecipientName(e.target.value)} placeholder={t("co.recipientNamePh")} /></div>
          <div><label className={labelCls}>{t("co.recipientPhone")}</label><input className={inputCls} value={p.recipientPhone} onChange={(e) => p.setRecipientPhone(e.target.value)} placeholder="+90 5xx xxx xx xx" /></div>
        </div>
      </Card>

      <Card title={t("co.forWhom")} subtitle={t("co.forWhomDesc")}>
        <div className="flex flex-wrap gap-2.5">
          {OCCASIONS.map((o) => {
            const on = p.occasion === o.id;
            return (
              <button key={o.id} onClick={() => p.setOccasion(o.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13.5px] font-semibold transition-all ${on ? "bg-[#7C3AED] text-white scale-[1.03] shadow-[0_8px_20px_-8px_rgba(124,58,237,0.7)]" : "bg-[#F7F6FB] text-[#4B5563] hover:bg-[#F0EEF9]"}`}>
                <span>{o.emoji}</span> {o.label}
              </button>
            );
          })}
        </div>
      </Card>

      <Card title={t("co.deliveryNoteTitle")} subtitle={t("co.courierNotes")}>
        <div className="flex flex-wrap gap-2.5">
          {DELIVERY_NOTES.map((d) => {
            const on = p.notes.includes(d.id);
            return (
              <button key={d.id} onClick={() => p.toggleNote(d.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-semibold transition-all border ${on ? "bg-[#F5F3FF] border-[#C4B5FD] text-[#6D28D9]" : "bg-white border-[#E9E7F0] text-[#6B7280] hover:border-[#DDD6FE]"}`}>
                {on && <Check className="w-3.5 h-3.5" />} {d.label}
              </button>
            );
          })}
        </div>
        <textarea className={`${inputCls} mt-4 min-h-[76px] resize-y`} value={p.specialNote} onChange={(e) => p.setSpecialNote(e.target.value)} placeholder={t("co.notePh")} />
      </Card>

      <Card title={t("co.openAddress")} subtitle={t("co.openAddressSub")}>
        {p.regionLabel.trim() && (
          <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-full bg-[#F5F3FF] text-[#6D28D9] text-[12.5px] font-semibold">
            <MapPin className="w-3.5 h-3.5" /> {p.regionLabel}
          </div>
        )}
        <textarea className={`${inputCls} min-h-[120px] resize-y`} value={p.address} onChange={(e) => p.setAddress(e.target.value)} placeholder={t("co.openAddressPh")} />
      </Card>
    </div>
  );
}

/* ---------------------------- Adım: Kart Mesajı (premium, AI-hazır) ------ */
const FAV_KEY = "cy_card_favorites";
const RECENT_KEY = "cy_card_recent";
function lsRead(key: string): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(key) || "[]"); } catch { return []; }
}
function lsWrite(key: string, arr: string[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(arr.slice(0, 8))); } catch { /* geç */ }
}

function StepKart(p: { occasion: string | null; recipientName: string; cardMessage: string; setCardMessage: (v: string) => void }) {
  const { t } = useI18n();
  const [tone, setTone] = useState<Tone>("samimi");
  const [lang, setLang] = useState<Lang>("tr");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  useEffect(() => { setFavorites(lsRead(FAV_KEY)); setRecent(lsRead(RECENT_KEY)); }, []);

  const curated = useMemo(() => suggestMessages(p.occasion, tone, lang), [p.occasion, tone, lang]);
  const suggestions = aiSuggestions.length ? aiSuggestions : curated;

  const choose = (text: string) => {
    p.setCardMessage(text);
    const next = [text, ...recent.filter((r) => r !== text)];
    setRecent(next); lsWrite(RECENT_KEY, next);
  };

  const toggleFav = () => {
    const msg = p.cardMessage.trim();
    if (!msg) return;
    const exists = favorites.includes(msg);
    const next = exists ? favorites.filter((f) => f !== msg) : [msg, ...favorites];
    setFavorites(next); lsWrite(FAV_KEY, next);
  };

  // "AI ile Yaz" — gerçek AI (Claude Haiku) çağrısı; hata/boşsa küratörlü havuza düşer.
  const aiWrite = async () => {
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/card-message", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion: p.occasion, tone, language: lang, recipientName: p.recipientName || null }),
      });
      const json = await res.json().catch(() => null);
      const msgs: string[] = json?.data?.messages ?? [];
      if (msgs.length) { setAiSuggestions(msgs); choose(msgs[0]); return; }
      throw new Error("empty");
    } catch {
      const pool = curated.filter((s) => s !== p.cardMessage);
      const pick = (pool.length ? pool : curated)[Math.floor(Math.random() * (pool.length ? pool.length : curated.length))];
      if (pick) choose(pick);
    } finally { setAiBusy(false); }
  };

  const isFav = favorites.includes(p.cardMessage.trim());

  useEffect(() => { setAiSuggestions([]); }, [tone, lang, p.occasion]);

  return (
    <Card title={t("co.cardTitle")} subtitle={t("co.cardDesc")}>
      {/* Canlı önizleme */}
      <div className="rounded-[18px] p-5 mb-5 bg-gradient-to-br from-[#FBFAFF] to-[#F5F3FF] border border-[#EDE9FE]">
        <p className="text-[10px] tracking-[0.16em] text-[#8B5CF6] uppercase font-bold mb-2">{t("co.preview")}</p>
        <p className="text-[15px] text-[#3B3357] leading-relaxed italic min-h-[48px] whitespace-pre-wrap" style={{ fontFamily: "var(--font-display)" }}>
          {p.cardMessage ? `“${p.cardMessage}”` : t("co.previewPh")}
        </p>
      </div>

      {/* Ton + Dil */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {TONES.map((t) => (
          <button key={t.id} onClick={() => setTone(t.id)}
            className={`px-3.5 py-2 rounded-full text-[12.5px] font-semibold transition-all ${tone === t.id ? "bg-[#7C3AED] text-white" : "bg-[#F7F6FB] text-[#4B5563] hover:bg-[#F0EEF9]"}`}>
            {t.label}
          </button>
        ))}
        <div className="ml-auto inline-flex rounded-full bg-[#F1F0F5] p-0.5">
          {(["tr", "en"] as Lang[]).map((l) => (
            <button key={l} onClick={() => setLang(l)}
              className={`px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-all ${lang === l ? "bg-white text-[#7C3AED] shadow-sm" : "text-[#9CA3AF]"}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Öneri chip'leri + Akıllı Öneri */}
      <div className="flex flex-wrap gap-2 mb-3">
        {suggestions.map((m) => (
          <button key={m} onClick={() => choose(m)}
            className="px-3.5 py-2 rounded-xl bg-[#F7F6FB] text-[#4B5563] text-[12.5px] font-medium hover:bg-[#F0EEF9] transition-colors text-left max-w-full">
            <span className="line-clamp-1">“{m}”</span>
          </button>
        ))}
        <button onClick={aiWrite} disabled={aiBusy}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#7C3AED] text-white text-[12.5px] font-bold hover:bg-[#6D28D9] transition-colors disabled:opacity-70">
          {aiBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} {aiBusy ? t("co.typing") : t("co.aiWrite")}
        </button>
      </div>

      {/* Metin + araçlar */}
      <textarea className={`${inputCls} min-h-[120px] resize-y`} value={p.cardMessage} onChange={(e) => p.setCardMessage(e.target.value)} maxLength={300} placeholder={t("co.writeOwn")} />
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <button onClick={toggleFav} disabled={!p.cardMessage.trim()}
            className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-40 ${isFav ? "text-[#7C3AED]" : "text-[#9CA3AF] hover:text-[#7C3AED]"}`}>
            <Star className={`w-4 h-4 ${isFav ? "fill-[#7C3AED]" : ""}`} /> {isFav ? "Favorilerde" : "Favorilere ekle"}
          </button>
          {p.cardMessage && (
            <button onClick={() => p.setCardMessage("")} className="text-[12.5px] font-medium text-[#9CA3AF] hover:text-[#6B7280]">{t("co.noCard")}</button>
          )}
        </div>
        <span className="text-[12px] text-[#9CA3AF]">{p.cardMessage.length}/300</span>
      </div>

      {/* Favoriler */}
      {favorites.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] tracking-[0.14em] text-[#8B5CF6] uppercase font-bold mb-2">Favorileriniz</p>
          <div className="flex flex-wrap gap-2">
            {favorites.map((m) => (
              <button key={m} onClick={() => choose(m)} className="px-3 py-1.5 rounded-lg bg-[#F5F3FF] text-[#6D28D9] text-[12px] font-medium hover:bg-[#EDE9FE] transition-colors max-w-[240px]">
                <span className="line-clamp-1">“{m}”</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Son kullanılanlar */}
      {recent.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] tracking-[0.14em] text-[#9CA3AF] uppercase font-bold mb-2">{t("co.recent")}</p>
          <div className="flex flex-wrap gap-2">
            {recent.filter((r) => !favorites.includes(r)).slice(0, 5).map((m) => (
              <button key={m} onClick={() => choose(m)} className="px-3 py-1.5 rounded-lg bg-[#FAFAFB] text-[#6B7280] text-[12px] font-medium hover:bg-[#F1F0F5] transition-colors max-w-[240px]">
                <span className="line-clamp-1">“{m}”</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11.5px] text-[#9CA3AF] mt-4 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-[#C4B5FD]" /> {t("co.aiHint")}
      </p>
    </Card>
  );
}

/* ---------------------------- Adım: Gönderen ---------------------------- */
function StepGonderen(p: {
  name: string; setName: (v: string) => void; phone: string; setPhone: (v: string) => void; email: string; setEmail: (v: string) => void;
  visibility: "show" | "anonymous" | "hidden"; setVisibility: (v: "show" | "anonymous" | "hidden") => void;
  surprise: boolean; setSurprise: (v: boolean) => void;
}) {
  const { t } = useI18n();
  // Hata yalnız alan ilk kez terk edilince (blur) gösterilir; düzeltilince anında kalkar.
  const [touched, setTouched] = useState<{ phone?: boolean; email?: boolean }>({});
  const phoneErr = touched.phone && !isValidTRPhone(p.phone);
  const emailErr = touched.email && !isValidEmail(p.email);
  const errInput = "w-full px-4 py-3.5 rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] text-[15px] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#F87171] focus:bg-white focus:ring-4 focus:ring-[#FEE2E2] transition-all";
  const opts: { id: "show" | "anonymous" | "hidden"; title: string; desc: string }[] = [
    { id: "show", title: t("co.showName"), desc: t("co.showNameDesc") },
    { id: "anonymous", title: t("co.sendAnon"), desc: t("co.sendAnonDesc") },
    { id: "hidden", title: t("co.sendHidden"), desc: t("co.sendHiddenDesc") },
  ];
  return (
    <div>
      <Card title={t("co.senderTitle")} subtitle={t("co.senderDesc")}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>{t("co.fullName")}</label><input className={inputCls} value={p.name} onChange={(e) => p.setName(e.target.value)} placeholder={t("co.fullNamePh")} /></div>
          <div>
            <label className={labelCls}>Telefon *</label>
            <input
              className={phoneErr ? errInput : inputCls}
              value={p.phone}
              inputMode="tel"
              onChange={(e) => p.setPhone(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              placeholder="05xx xxx xx xx"
            />
            {phoneErr && <p className="mt-1.5 text-[12px] font-medium text-[#DC2626]">{t("co.phoneErr")}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>E-posta *</label>
            <input
              className={emailErr ? errInput : inputCls}
              value={p.email}
              inputMode="email"
              onChange={(e) => p.setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="ornek@eposta.com"
            />
            {emailErr && <p className="mt-1.5 text-[12px] font-medium text-[#DC2626]">{t("co.emailErr")}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-5 text-[12.5px] text-[#6B7280]">
          <ShieldCheck className="w-4 h-4 text-[#22C55E]" /> {t("co.kvkkNote")}
        </div>
      </Card>

      <Card title={t("co.shareSender")} subtitle={t("co.shareSenderDesc")}>
        <div className="space-y-2.5">
          {opts.map((o) => {
            const on = p.visibility === o.id;
            return (
              <button key={o.id} onClick={() => p.setVisibility(o.id)}
                className={`w-full flex items-start gap-3 text-left p-4 rounded-2xl border transition-all ${on ? "border-[#C4B5FD] bg-[#FBFAFF] shadow-[0_10px_28px_-18px_rgba(124,58,237,0.5)]" : "border-[#E9E7F0] bg-white hover:border-[#DDD6FE]"}`}>
                <span className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${on ? "border-[#7C3AED]" : "border-[#D1D5DB]"}`}>
                  {on && <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold text-[#1F2937]">{o.title}</span>
                  <span className="block text-[12.5px] text-[#6B7280] mt-0.5 leading-snug">{o.desc}</span>
                </span>
              </button>
            );
          })}
        </div>

        <button onClick={() => p.setSurprise(!p.surprise)}
          className={`w-full flex items-center gap-3 mt-3 p-4 rounded-2xl border transition-all ${p.surprise ? "border-[#C4B5FD] bg-[#F5F3FF]" : "border-[#E9E7F0] bg-white hover:border-[#DDD6FE]"}`}>
          <span className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-all ${p.surprise ? "bg-[#7C3AED] justify-end" : "bg-[#E5E7EB] justify-start"}`}>
            <span className="w-5 h-5 rounded-full bg-white shadow" />
          </span>
          <span className="text-left">
            <span className="block text-[14px] font-bold text-[#1F2937]">{t("co.surprise")}</span>
            <span className="block text-[12.5px] text-[#6B7280] mt-0.5">{t("co.surpriseDesc")}</span>
          </span>
        </button>
      </Card>
    </div>
  );
}

/* ---------------------------- Adım: Ek Ürünler -------------------------- */
function StepAddons(p: { addons: CheckoutAddon[]; addonQty: Record<number, number>; setAddon: (id: number, q: number) => void }) {
  const { t } = useI18n();
  const count = p.addons.reduce((s, a) => s + (p.addonQty[a.id] || 0), 0);
  const cats = useMemo(() => {
    const set: string[] = [];
    p.addons.forEach((a) => { if (a.category && !set.includes(a.category)) set.push(a.category); });
    return set;
  }, [p.addons]);
  const [tab, setTab] = useState<string>("Tümü");
  const list = tab === "Tümü" ? p.addons : p.addons.filter((a) => a.category === tab);

  return (
    <section className="overflow-hidden rounded-[30px] border border-[#2E1857] bg-[linear-gradient(135deg,#0D031F_0%,#17062F_48%,#2B0D55_100%)] text-white shadow-[0_28px_70px_-34px_rgba(76,29,149,0.85)]">
      <div className="px-5 py-6 sm:px-8 sm:py-8 border-b border-white/10">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/25 ring-1 ring-[#A78BFA]/25">
            <Sparkles className="h-5 w-5 text-[#C4B5FD]" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#C4B5FD]">{t("co.completeYourOrder")}</p>
            <h2 className="mt-1 text-[20px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>{t("co.addonsTitle")}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#B9AECF]">{t("co.addonsDesc")}</p>
          </div>
        </div>

        {cats.length > 0 && (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {["Tümü", ...cats].map((cat) => (
              <button key={cat} onClick={() => setTab(cat)}
                className={`shrink-0 rounded-full border px-4 py-2 text-[12px] font-bold transition-all ${tab === cat ? "border-[#A855F7] bg-[#8B5CF6] text-white shadow-[0_8px_22px_-10px_rgba(168,85,247,0.95)]" : "border-white/15 bg-white/[0.06] text-[#D8CFF0] hover:border-[#8B5CF6]/70 hover:bg-[#7C3AED]/20"}`}>
                {cat === "Tümü" ? t("common.all") : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-7">
        {list.map((a, index) => {
          const q = p.addonQty[a.id] || 0;
          const on = q > 0;
          const badge = index === 0 ? t("co.mostPreferred") : index === 1 ? t("co.popular") : index === 2 ? t("co.badgeNew") : null;
          return (
            <article key={a.id} className={`group overflow-hidden rounded-[20px] border transition-all ${on ? "border-[#A855F7] bg-[#29104C] shadow-[0_18px_35px_-22px_rgba(168,85,247,0.95)]" : "border-white/10 bg-[#1C0A38] hover:-translate-y-0.5 hover:border-[#7C3AED]/70"}`}>
              <div className="relative aspect-[4/3] overflow-hidden bg-white/95">
                <ProductImage src={a.image ?? undefined} alt={a.name} padding="8px" protect={false} />
                {badge && <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold text-white ${index === 0 ? "bg-[#F59E0B]" : "bg-[#8B5CF6]"}`}>{badge}</span>}
              </div>
              <div className="p-3.5">
                <p className="min-h-[38px] text-[12.5px] font-bold leading-snug text-white line-clamp-2">{a.name}</p>
                <p className="mt-1 text-[11px] text-[#A99BBC]">{a.category || t("co.addonProduct")}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[16px] font-extrabold text-[#D8B4FE]">+{money(a.priceMinor)}</span>
                  {on ? (
                    <div className="flex items-center rounded-full border border-[#A855F7]/55 bg-[#7C3AED] p-0.5">
                      <button onClick={() => p.setAddon(a.id, q - 1)} aria-label="Azalt" className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/15"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="min-w-6 text-center text-[12px] font-bold">{q}</span>
                      <button onClick={() => p.setAddon(a.id, q + 1)} aria-label={t("common.increase")} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/15"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => p.setAddon(a.id, 1)} aria-label={`${a.name} ekle`} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/[0.07] text-white transition-colors hover:border-[#A855F7] hover:bg-[#7C3AED]">
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {list.length === 0 && <p className="px-7 pb-7 text-[13px] text-[#B9AECF]">{t("co.noAddons")}</p>}

      <div className="grid border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Sparkles, title: t("co.trust.fresh"), text: t("co.trust.freshDesc") },
          { icon: Truck, title: t("co.trust.sameDay"), text: t("co.trust.sameDayDesc") },
          { icon: ShieldCheck, title: t("co.trust.secure"), text: t("co.trust.secureDesc") },
          { icon: Package, title: t("co.trust.pack"), text: t("co.trust.packDesc") },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-3 border-white/10 px-5 py-4 sm:[&:nth-child(odd)]:border-r lg:border-r lg:last:border-r-0">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#C084FC]" />
            <div><p className="text-[12px] font-bold text-white">{title}</p><p className="mt-0.5 text-[10.5px] leading-relaxed text-[#9F91B6]">{text}</p></div>
          </div>
        ))}
      </div>

      {count > 0 && (
        <div className="flex items-center gap-2 border-t border-[#A855F7]/25 bg-[#7C3AED]/15 px-6 py-3 text-[12.5px] font-bold text-[#DDD6FE]">
          <ShoppingBag className="h-4 w-4" /> {t("co.addonsAdded", { n: count })}
        </div>
      )}
    </section>
  );
}

/* ---------------------------- Adım: Ödeme/Özet -------------------------- */
function StepOdeme(p: {
  productName: string; productPrice: number; productQty: number; total: number; subtotal: number;
  addons: CheckoutAddon[]; addonQty: Record<number, number>;
  recipientName: string; occasion: string | null;
  address: string; region: string; dateStr: string | null; slotStr: string | null; typeStr: string | null; cardMessage: string;
  couponInput: string; setCouponInput: (v: string) => void;
  coupon: { code: string; discount_minor: number } | null; couponMsg: string | null; couponBusy: boolean;
  applyCoupon: () => void; removeCoupon: () => void;
  paymentMethod: "card" | "havale"; setPaymentMethod: (m: "card" | "havale") => void; bankAccounts: BankAccountPublic[]; cardEnabled: boolean;
}) {
  const { t } = useI18n();
  const selected = p.addons.filter((a) => (p.addonQty[a.id] || 0) > 0);
  const methods = ([
    { key: "card" as const, icon: CreditCard, title: t("co.pay.card"), sub: "Visa, Mastercard · 3D Secure" },
    { key: "havale" as const, icon: Landmark, title: t("co.pay.bank"), sub: t("co.pay.bankDesc") },
  ]).filter((m) => m.key !== "card" || p.cardEnabled);
  const hasDiscount = !!p.coupon && p.coupon.discount_minor > 0;
  return (
    <Card title={t("co.pay.title")} subtitle={t("co.pay.desc")}>
      {/* Ödeme yöntemi seçici */}
      <div className="mb-5">
        <div className="text-[11px] font-semibold text-[#8B5CF6] uppercase tracking-wide mb-2.5">{t("co.pay.method")}</div>
        <div className={`grid ${methods.length > 1 ? "grid-cols-2" : "grid-cols-1"} gap-2.5`}>
          {methods.map((m) => {
            const on = p.paymentMethod === m.key;
            const Icon = m.icon;
            return (
              <button key={m.key} type="button" onClick={() => p.setPaymentMethod(m.key)}
                className={`flex items-start gap-3 text-left p-3.5 rounded-2xl border transition-all ${on ? "border-[#C4B5FD] bg-[#FBFAFF] shadow-[0_10px_28px_-18px_rgba(124,58,237,0.5)]" : "border-[#E9E7F0] bg-white hover:border-[#DDD6FE]"}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${on ? "bg-[#7C3AED] text-white" : "bg-[#F5F3FF] text-[#7C3AED]"}`}><Icon className="w-4 h-4" /></div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-bold text-[#1F2937]">{m.title}</div>
                  <div className="text-[11.5px] text-[#9CA3AF]">{m.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {p.paymentMethod === "card" && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-[#6B7280] bg-[#F9FAFB] border border-[#F1F0F5] rounded-xl px-3.5 py-2.5">
            <ShieldCheck className="w-4 h-4 text-[#22C55E] flex-shrink-0" />
            {t("co.cardSecureNote")}
          </div>
        )}

        {p.paymentMethod === "havale" && (
          <div className="mt-3 rounded-2xl border border-[#EDE9FE] bg-[#FBFAFF] p-4">
            {p.bankAccounts.length === 0 ? (
              <div className="text-[12.5px] text-[#6B7280]">{t("co.bankNotSet")}</div>
            ) : (
              <>
                <div className="text-[12px] font-semibold text-[#6D28D9] mb-2">{t("co.bankInstr")}</div>
                <div className="space-y-2.5">
                  {p.bankAccounts.map((b) => (
                    <div key={b.public_id} className="rounded-xl bg-white border border-[#EDE9FE] px-3.5 py-2.5">
                      <div className="text-[12.5px] font-bold text-[#1F2937]">{b.bank_name}{b.branch_name ? ` · ${b.branch_name}` : ""}</div>
                      <div className="text-[13px] font-mono text-[#4B5563] tracking-wide mt-0.5">{ibanPretty(b.iban)}</div>
                      <div className="text-[11.5px] text-[#9CA3AF] mt-0.5">{b.account_holder}{b.note ? ` · ${b.note}` : ""}</div>
                    </div>
                  ))}
                </div>
                <div className="text-[11.5px] text-[#9CA3AF] mt-2.5">{t("co.bankPendingNote")}</div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        <LineItem name={p.productName} qty={p.productQty} price={p.productPrice * p.productQty} />
        {selected.map((a) => <LineItem key={a.id} name={a.name} qty={p.addonQty[a.id]} price={a.priceMinor * p.addonQty[a.id]} addon />)}
      </div>

      {/* İndirim Kodu */}
      <div className="mt-4 pt-4 border-t border-[#F1F0F5]">
        <label className="block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">{t("common.couponCode")}</label>
        {hasDiscount ? (
          <div className="flex items-center justify-between rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] px-4 py-3">
            <span className="flex items-center gap-2 text-[13.5px] font-semibold text-[#15803D]">
              <TicketPercent className="w-4 h-4" /> {t("co.couponApplied", { code: p.coupon!.code })}
            </span>
            <button onClick={p.removeCoupon} className="text-[12.5px] font-semibold text-[#6B7280] hover:text-[#991B1B]">{t("common.remove")}</button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                value={p.couponInput}
                onChange={(e) => p.setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); p.applyCoupon(); } }}
                placeholder="Kupon kodunuz"
                className="flex-1 px-4 py-3 rounded-2xl border border-[#E9E7F0] bg-[#FCFCFD] text-[14px] tracking-wide uppercase text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#C4B5FD] focus:bg-white focus:ring-4 focus:ring-[#F5F3FF] transition-all"
              />
              <button onClick={p.applyCoupon} disabled={p.couponBusy || !p.couponInput.trim()}
                className={`px-5 rounded-2xl text-[14px] font-bold text-white transition-all ${p.couponBusy || !p.couponInput.trim() ? "bg-[#C4B5FD] cursor-not-allowed" : "bg-[#7C3AED] hover:bg-[#6D28D9] active:scale-[0.98]"}`}>
                {p.couponBusy ? "…" : "Uygula"}
              </button>
            </div>
            {p.couponMsg && <p className="mt-2 text-[12.5px] font-medium text-[#B91C1C]">{p.couponMsg}</p>}
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[#F1F0F5] space-y-3">
        <RevRow icon={User} label={t("co.recipient")} value={`${p.recipientName || "—"}${occasionLabel(p.occasion) ? " · " + occasionLabel(p.occasion) : ""}`} />
        <RevRow icon={MapPin} label="Teslimat" value={`${p.region ? p.region + " — " : ""}${p.address || "—"}`} />
        <RevRow icon={Calendar} label="Tarih & Saat" value={`${p.dateStr ?? "—"}${p.slotStr ? " · " + p.slotStr : ""}`} />
        {p.typeStr && <RevRow icon={Truck} label="Teslimat Tipi" value={p.typeStr} />}
        {p.cardMessage && <RevRow icon={MessageSquareText} label={t("co.cardMessage")} value={`“${p.cardMessage}”`} />}
      </div>

      <div className="mt-5 pt-4 border-t border-[#F1F0F5] space-y-2">
        {hasDiscount && (
          <>
            <div className="flex items-center justify-between text-[13.5px] text-[#6B7280]">
              <span>{t("common.subtotal")}</span><Num>{money(p.subtotal)}</Num>
            </div>
            <div className="flex items-center justify-between text-[13.5px] font-semibold text-[#15803D]">
              <span>{t("co.discountWith", { code: p.coupon!.code })}</span><Num>−{money(p.coupon!.discount_minor)}</Num>
            </div>
          </>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-[#6B7280]">{t("common.total")}</span>
          <Num className="text-[22px] font-bold text-[#111827]">{money(p.total)}</Num>
        </div>
      </div>
      <p className="text-[12px] text-[#9CA3AF] mt-4 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
        {p.paymentMethod === "card"
          ? t("co.pay.cardNote")
          : t("co.pay.bankNote")}
      </p>
    </Card>
  );
}
function LineItem({ name, qty, price, addon }: { name: string; qty: number; price: number; addon?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13.5px] text-[#374151] flex items-center gap-2 min-w-0">
        {addon && <Gift className="w-3.5 h-3.5 text-[#A78BDA] shrink-0" />}
        <span className="truncate">{name}</span>
        <span className="text-[#9CA3AF] shrink-0">×{qty}</span>
      </span>
      <span className="text-[13.5px] font-semibold text-[#111827] shrink-0 ml-3">{money(price)}</span>
    </div>
  );
}
function RevRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-[#8B5CF6] mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-[#9CA3AF] font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-[13.5px] text-[#374151] font-medium leading-snug break-words">{value}</p>
      </div>
    </div>
  );
}

/* ---------------------------- Yaşayan Fiş ------------------------------- */
function LivingReceipt(p: {
  productName: string; coverUrl?: string | null; productPrice: number; productQty: number; total: number; subtotal: number; productSlug?: string;
  addons: CheckoutAddon[]; addonQty: Record<number, number>;
  coupon: { code: string; discount_minor: number } | null;
  regionLabel: string; placeName: string | null; dateStr: string | null; slotStr: string | null; typeStr: string | null;
  recipientName: string; occasion: string | null; cardMessage: string; senderName: string;
  visibility: "show" | "anonymous" | "hidden"; surprise: boolean;
  onEditDelivery?: () => void;
  /** Fişteki bilgi grubundan ilgili adıma atla (checkout'tan çıkmadan). */
  onEditStep?: (key: "alici" | "kart" | "gonderen" | "ekurun") => void;
}) {
  const { t } = useI18n();
  const selected = p.addons.filter((a) => (p.addonQty[a.id] || 0) > 0);
  const senderLine = p.visibility === "show" ? (p.senderName || null) : p.visibility === "anonymous" ? t("co.anonymous") : t("co.fullyHidden");
  return (
    // V85 PREMIUM — koyu ürün paneli. Fotoğraf beyaz stüdyo çerçevesinde kalır:
    // katalog görsellerimiz beyaz zeminli kesme, V85'in object-cover full-bleed'i
    // bunlari kotu kirpar ve paneli agartir. V85'in kendi kurali da urunun gercek
    // renklerini korumayi ve wallpaper'a donusmemeyi soyluyor.
    <aside
      className="lg:sticky lg:top-6 overflow-hidden rounded-[22px] shadow-[0_28px_70px_-34px_rgba(76,29,149,0.85)]"
      style={{ background: "linear-gradient(175deg, #0F0224 0%, #1A0638 55%, #110328 100%)" }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[9px] tracking-[0.32em] uppercase font-bold" style={{ color: "#C4B5FD" }}>{t("co.yourOrder")}</h3>
          {/* Checkout'tan ÇIKMAZ: teslimat düzenleme panelini yerinde açar. */}
          {p.onEditDelivery && (
            <button type="button" onClick={p.onEditDelivery} className="flex items-center gap-1 text-[12px] font-semibold text-white/70 hover:text-white transition-colors"><Pencil className="w-3 h-3" /> {t("common.edit")}</button>
          )}
        </div>

        {/* Ürün — yolculuğun görsel çapası */}
        <div className="relative w-full overflow-hidden rounded-[16px] bg-white" style={{ aspectRatio: "4/5" }}>
          <ProductImage src={p.coverUrl ?? undefined} alt={p.productName} padding="10px" protect={false} sizes="(max-width:1024px) 100vw, 360px" />
        </div>
        <p className="mt-3.5 text-white font-semibold leading-snug" style={{ fontFamily: "var(--font-display)", fontSize: "19px", letterSpacing: "-0.01em" }}>{p.productName}</p>
        <div className="mt-1 flex items-baseline gap-2">
          {p.productQty > 1 && <span className="text-white/40 text-[12px]">×{p.productQty}</span>}
          <span className="text-white/70 text-[13.5px] font-medium">{money(p.productPrice * p.productQty)}</span>
        </div>
      </div>

      <div className="px-5 pb-5">

      {selected.length > 0 && (
        <ReceiptGroup label={t("co.addons")} onEdit={p.onEditStep ? () => p.onEditStep?.("ekurun") : undefined}>
          {selected.map((a) => (
            <div key={a.id} className="flex items-center justify-between">
              <span className="text-[12.5px] text-[#4B5563] flex items-center gap-1.5 min-w-0"><Gift className="w-3 h-3 text-[#A78BDA] shrink-0" /><span className="truncate">{a.name} ×{p.addonQty[a.id]}</span></span>
              <span className="text-[12.5px] font-semibold text-[#374151] shrink-0 ml-2">{money(a.priceMinor * p.addonQty[a.id])}</span>
            </div>
          ))}
        </ReceiptGroup>
      )}

      <ReceiptGroup label="Teslimat" onEdit={p.onEditDelivery}>
        {p.placeName && <RLine icon={MapPin} value={p.placeName} />}
        {p.regionLabel.trim() && <RLine icon={MapPin} value={p.regionLabel} />}
        {p.dateStr && <RLine icon={Calendar} value={p.dateStr} />}
        {p.slotStr && <RLine icon={Clock} value={p.slotStr} />}
        {p.typeStr && <RLine icon={Truck} value={p.typeStr} />}
      </ReceiptGroup>

      {(p.recipientName || p.occasion) && (
        <ReceiptGroup label={t("co.recipient")} onEdit={p.onEditStep ? () => p.onEditStep?.("alici") : undefined}>
          {p.recipientName && <RLine icon={User} value={p.recipientName} />}
          {occasionLabel(p.occasion) && <RLine icon={Heart} value={occasionLabel(p.occasion)!} />}
        </ReceiptGroup>
      )}

      {p.cardMessage && <ReceiptGroup label={t("co.cardMessage")} onEdit={p.onEditStep ? () => p.onEditStep?.("kart") : undefined}><RLine icon={MessageSquareText} value={`“${p.cardMessage}”`} /></ReceiptGroup>}
      {(senderLine || p.surprise) && (
        <ReceiptGroup label={t("co.sender")} onEdit={p.onEditStep ? () => p.onEditStep?.("gonderen") : undefined}>
          {senderLine && <RLine icon={User} value={senderLine} />}
          {p.surprise && <RLine icon={Gift} value={t("co.surpriseOrder")} />}
        </ReceiptGroup>
      )}

        <div className="mt-4 pt-4 space-y-1.5" style={{ borderTop: "1px solid rgba(196,181,253,0.13)" }}>
          {p.coupon && p.coupon.discount_minor > 0 && (
            <>
              <div className="flex items-center justify-between text-[12px] text-white/40">
                <span>{t("common.subtotal")}</span><Num>{money(p.subtotal)}</Num>
              </div>
              <div className="flex items-center justify-between text-[12px] font-semibold text-[#86EFAC]">
                <span className="flex items-center gap-1"><TicketPercent className="w-3 h-3" />{p.coupon.code}</span>
                <span>−{money(p.coupon.discount_minor)}</span>
              </div>
            </>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-white/40">Toplam</span>
            <span className="text-white font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "26px", letterSpacing: "-0.02em" }}>{money(p.total)}</span>
          </div>
        </div>
      </div>

      {/* Güven şeridi — V85; bağırmayan, kısa ve gerçek */}
      <div className="flex items-center gap-5 px-5 py-4" style={{ borderTop: "1px solid rgba(196,181,253,0.08)" }}>
        {[{ icon: Truck, text: t("common.sameDay") }, { icon: ShieldCheck, text: t("common.sslSecure") }].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-1.5">
            <Icon className="w-3 h-3 shrink-0" style={{ color: "#8B5CF6" }} />
            <span className="text-white/30 text-[10.5px]">{text}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
function ReceiptGroup({ label, children, onEdit }: { label: string; children: React.ReactNode; onEdit?: () => void }) {
  const { t } = useI18n();
  const arr = Array.isArray(children) ? children : [children];
  if (!arr.some(Boolean)) return null;
  return (
    <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(196,181,253,0.13)" }}>
      {/* Her bilgi grubunun KENDİ "Düzenle"si — müşteri checkout'tan çıkmadan
          ilgili adıma gider. Tek bir üst "Düzenle" yalnız teslimatı açıyordu. */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] tracking-[0.14em] uppercase font-bold" style={{ color: "#C4B5FD" }}>{label}</p>
        {onEdit && (
          <button type="button" onClick={onEdit} className="flex items-center gap-1 text-[11px] font-semibold text-white/55 hover:text-white transition-colors">
            <Pencil className="w-2.5 h-2.5" /> {t("common.edit")}
          </button>
        )}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function RLine({ icon: Icon, value }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3 h-3 mt-[3px] shrink-0" style={{ color: "#8B5CF6" }} />
      <span className="text-[12.5px] text-white/75 leading-snug break-words">{value}</span>
    </div>
  );
}
