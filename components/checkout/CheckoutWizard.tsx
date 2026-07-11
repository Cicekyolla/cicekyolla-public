"use client";

// ---------------------------------------------------------------------------
// CHECKOUT WIZARD (FAZ A + Ek Ürünler) — Premium sipariş hazırlama deneyimi.
// Checkout DEVAM EDİYOR: ürün+teslimat seçildi; tek merkezi state ile
// Alıcı → Kart Mesajı → Gönderen → (Ek Ürünler) → Ödeme(Özet) yolculuğu.
// Sipariş POST'u YALNIZ son adımda; items[] dizisine ek ürünler eklenir
// (contract değişmez — items zaten dizi). Order Flow DEĞİŞMEZ.
// Yaşayan sipariş fişi sağda; her seçimde canlı güncellenir.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Check, ArrowRight, ArrowLeft, MapPin, Calendar, Clock, Package, User,
  Heart, MessageSquareText, ShieldCheck, Truck, Pencil, Plus, Minus, ShoppingBag, Gift,
  Sparkles, Star, RefreshCw,
} from "lucide-react";
import { ProductImage } from "@/components/product/ProductImage";
import { readPendingDelivery, clearPendingDelivery, type PendingDelivery } from "@/lib/pendingDelivery";
import { OCCASIONS, DELIVERY_NOTES, occasionLabel } from "@/lib/checkoutConfig";
import { suggestMessages, TONES, type Tone, type Lang } from "@/lib/cardMessages";
import type { CheckoutAddon } from "./CheckoutFlow";

const SLOTS = ["09:00–12:00", "12:00–15:00", "15:00–18:00", "18:00–21:00"];
const money = (m: number) => `₺${(m / 100).toLocaleString("tr-TR")}`;
function fmtDate(d?: string): string | null {
  if (!d) return null;
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
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

type Props = { productName: string; productId: number | null; priceMinor: number; productSlug?: string; coverUrl?: string | null; addons?: CheckoutAddon[] };

export default function CheckoutWizard({ productName, productId, priceMinor, productSlug, coverUrl, addons = [] }: Props) {
  const steps = useMemo(() => {
    const base = [
      { key: "urun", label: "Ürün" },
      { key: "teslimat", label: "Teslimat" },
      { key: "alici", label: "Alıcı" },
      { key: "kart", label: "Kart Mesajı" },
      { key: "gonderen", label: "Gönderen" },
      { key: "odeme", label: "Ödeme" },
    ];
    if (addons.length > 0) base.splice(4, 0, { key: "ekurun", label: "Ek Ürünler" });
    return base;
  }, [addons]);

  const [stepIdx, setStepIdx] = useState(2);
  const [done, setDone] = useState<{ order_number: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pd, setPd] = useState<PendingDelivery | null>(null);

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
  const [addonQty, setAddonQty] = useState<Record<number, number>>({});
  const qty = 1;

  useEffect(() => {
    const p = readPendingDelivery();
    if (!p) return;
    if (productSlug && p.productSlug && p.productSlug !== productSlug) return;
    setPd(p);
    if (p.address) setAddress(p.address);
    if (p.occasion) setOccasion(p.occasion as string);
  }, [productSlug]);

  const addonsTotal = useMemo(
    () => addons.reduce((s, a) => s + (addonQty[a.id] || 0) * a.priceMinor, 0),
    [addons, addonQty]
  );
  const total = priceMinor * qty + addonsTotal;

  const dateStr = fmtDate(pd?.date);
  const slotStr = pd?.slotLabel ?? (pd?.slotStart ? mapToSlot(pd.slotStart) : null);
  const typeStr = pd?.mode === "cargo" ? "Ücretsiz Kargo" : pd?.mode === "sameday" ? "Aynı Gün Teslimat" : null;

  const toggleNote = (id: string) => setNotes((n) => (n.includes(id) ? n.filter((x) => x !== id) : [...n, id]));
  const setAddon = (id: number, q: number) => setAddonQty((m) => ({ ...m, [id]: Math.max(0, q) }));

  const stepKey = steps[stepIdx].key;
  const canNext = useMemo(() => {
    if (stepKey === "alici") return recipientName.trim().length > 0;
    if (stepKey === "gonderen") return senderName.trim().length > 0 && senderPhone.trim().length > 0;
    return true;
  }, [stepKey, recipientName, senderName, senderPhone]);

  const go = (dir: 1 | -1) => {
    setError(null);
    setStepIdx((i) => Math.min(steps.length - 1, Math.max(2, i + dir)));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    setError(null);
    if (!senderName || !senderPhone || !recipientName) {
      setError("Lütfen gönderen ve alıcı bilgilerini tamamlayın."); return;
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

      const items = [
        { product_id: productId != null ? Number(productId) : null, product_name: productName, quantity: qty, unit_price_minor: Math.round(Number(priceMinor)) },
        ...addons.filter((a) => (addonQty[a.id] || 0) > 0).map((a) => ({
          product_id: a.id, product_name: a.name, quantity: addonQty[a.id], unit_price_minor: a.priceMinor,
        })),
      ];

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: senderName, customer_phone: senderPhone,
          customer_email: senderEmail || null,
          recipient_name: recipientName, recipient_phone: recipientPhone || null,
          delivery_address: address || null, delivery_district: pd?.district || null,
          delivery_city: pd?.city || null,
          delivery_date: pd?.date || null, delivery_time_slot: pd?.mode === "sameday" ? mapToSlot(pd?.slotStart, pd?.slotLabel) : (slotStr || null),
          card_message: composedCard, source: "web",
          occasion: occasion || null,
          sender_visibility: visibility,
          is_surprise: surprise,
          delivery_notes: deliveryNotes,
          place_id: pd?.placeId || null,
          place_name: pd?.placeName || null,
          formatted_address: pd?.address || null,
          lat: pd?.lat ?? null,
          lng: pd?.lng ?? null,
          delivery_neighborhood: pd?.neighborhood || null,
          items,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setDone({ order_number: json.data.order_number });
      clearPendingDelivery();
    } catch {
      setError("Sipariş oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-5">
          <Check className="w-8 h-8 text-[#22C55E]" />
        </div>
        <h1 className="text-2xl font-bold text-[#111827]" style={{ fontFamily: "var(--font-display)" }}>Siparişiniz alındı!</h1>
        <p className="text-[#6B7280] mt-2">Sipariş numaranız</p>
        <p className="text-[22px] font-bold text-[#7C3AED] mt-1 tracking-wide">{done.order_number}</p>
        <Link href={`/siparis-takip?no=${encodeURIComponent(done.order_number)}`} className="inline-block mt-6 rounded-2xl bg-[#7C3AED] text-white font-bold px-7 py-3.5 hover:bg-[#6D28D9] transition-colors">
          Siparişi Takip Et
        </Link>
      </div>
    );
  }

  return (
    <div>
      <StepProgress steps={steps} activeIdx={stepIdx} />

      <div className="grid lg:grid-cols-[1fr_370px] gap-6 lg:gap-8 items-start mt-8">
        <div className="order-1 min-h-[320px]">
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
                  productName={productName} productPrice={priceMinor} total={total}
                  addons={addons} addonQty={addonQty}
                  recipientName={recipientName} occasion={occasion}
                  address={address} region={`${pd?.district ?? ""}${pd?.city ? " / " + pd.city : ""}`}
                  dateStr={dateStr} slotStr={slotStr} typeStr={typeStr} cardMessage={cardMessage}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {error && <div className="mt-5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-[13px] font-medium px-4 py-3">{error}</div>}

          <div className="flex items-center gap-3 mt-7">
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
                {loading ? "Gönderiliyor…" : "Siparişi Tamamla"}
              </button>
            )}
          </div>
        </div>

        <div className="order-2">
          <LivingReceipt
            productName={productName} coverUrl={coverUrl} productPrice={priceMinor} total={total} productSlug={productSlug}
            addons={addons} addonQty={addonQty}
            regionLabel={`${pd?.neighborhood ? pd.neighborhood + ", " : ""}${pd?.district ?? ""}${pd?.city ? " / " + pd.city : ""}`}
            placeName={pd?.placeName ?? null} dateStr={dateStr} slotStr={slotStr} typeStr={typeStr}
            recipientName={recipientName} occasion={occasion} cardMessage={cardMessage} senderName={senderName}
            visibility={visibility} surprise={surprise}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Progress ----------------------------------- */
function StepProgress({ steps, activeIdx }: { steps: { key: string; label: string }[]; activeIdx: number }) {
  return (
    <div className="flex items-center w-full max-w-3xl mx-auto overflow-x-auto">
      {steps.map((s, i) => {
        const doneStep = i < activeIdx;
        const cur = i === activeIdx;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none min-w-[52px]">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${doneStep ? "bg-[#7C3AED] text-white" : cur ? "bg-[#7C3AED] text-white ring-4 ring-[#EDE9FE]" : "bg-[#F1F0F5] text-[#9CA3AF]"}`}>
                {doneStep ? "✓" : i + 1}
              </div>
              <span className={`text-[9.5px] font-semibold whitespace-nowrap ${cur ? "text-[#7C3AED]" : doneStep ? "text-[#6B7280]" : "text-[#C4B5FD]"}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`h-[2px] flex-1 mx-1 mb-5 rounded-full ${i < activeIdx ? "bg-[#7C3AED]" : "bg-[#F1F0F5]"}`} />}
          </div>
        );
      })}
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
  return (
    <div>
      <Card title="Kime gönderiyoruz?" subtitle="Çiçeği teslim alacak kişi.">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Alıcı Adı Soyadı *</label><input className={inputCls} value={p.recipientName} onChange={(e) => p.setRecipientName(e.target.value)} placeholder="Örn. Ayşe Yılmaz" /></div>
          <div><label className={labelCls}>Alıcı Telefonu</label><input className={inputCls} value={p.recipientPhone} onChange={(e) => p.setRecipientPhone(e.target.value)} placeholder="+90 5xx xxx xx xx" /></div>
        </div>
      </Card>

      <Card title="Bu çiçek kimin için?" subtitle="Seçiminiz kart mesajı ve hediye önerilerini kişiselleştirir.">
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

      <Card title="Teslimat notu" subtitle="Kuryeye iletilmesini istediklerinizi seçin.">
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
        <textarea className={`${inputCls} mt-4 min-h-[76px] resize-y`} value={p.specialNote} onChange={(e) => p.setSpecialNote(e.target.value)} placeholder="Özel bir not eklemek isterseniz…" />
      </Card>

      <Card title="Açık adres" subtitle="Mahalle, cadde, bina, kat, daire ve tarif — kurye kolayca bulsun.">
        {p.regionLabel.trim() && (
          <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-full bg-[#F5F3FF] text-[#6D28D9] text-[12.5px] font-semibold">
            <MapPin className="w-3.5 h-3.5" /> {p.regionLabel}
          </div>
        )}
        <textarea className={`${inputCls} min-h-[120px] resize-y`} value={p.address} onChange={(e) => p.setAddress(e.target.value)} placeholder="Örn. Bağdat Cad. No:12 D:4, kapı kodu 1234, 2. kat…" />
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
    <Card title="Kart mesajı" subtitle="Çiçekle birlikte gidecek not. Tonu seçin, önerilerden ilham alın ya da kendiniz yazın.">
      {/* Canlı önizleme */}
      <div className="rounded-[18px] p-5 mb-5 bg-gradient-to-br from-[#FBFAFF] to-[#F5F3FF] border border-[#EDE9FE]">
        <p className="text-[10px] tracking-[0.16em] text-[#8B5CF6] uppercase font-bold mb-2">Önizleme</p>
        <p className="text-[15px] text-[#3B3357] leading-relaxed italic min-h-[48px] whitespace-pre-wrap" style={{ fontFamily: "var(--font-display)" }}>
          {p.cardMessage ? `“${p.cardMessage}”` : "Mesajınız burada canlı görünecek…"}
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
          {aiBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} {aiBusy ? "Yazıyor…" : "AI ile Yaz"}
        </button>
      </div>

      {/* Metin + araçlar */}
      <textarea className={`${inputCls} min-h-[120px] resize-y`} value={p.cardMessage} onChange={(e) => p.setCardMessage(e.target.value)} maxLength={300} placeholder="Kendi mesajınızı yazın…" />
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <button onClick={toggleFav} disabled={!p.cardMessage.trim()}
            className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-40 ${isFav ? "text-[#7C3AED]" : "text-[#9CA3AF] hover:text-[#7C3AED]"}`}>
            <Star className={`w-4 h-4 ${isFav ? "fill-[#7C3AED]" : ""}`} /> {isFav ? "Favorilerde" : "Favorilere ekle"}
          </button>
          {p.cardMessage && (
            <button onClick={() => p.setCardMessage("")} className="text-[12.5px] font-medium text-[#9CA3AF] hover:text-[#6B7280]">Kartsız gönder</button>
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
          <p className="text-[10px] tracking-[0.14em] text-[#9CA3AF] uppercase font-bold mb-2">Son kullanılanlar</p>
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
        <Sparkles className="w-3.5 h-3.5 text-[#C4B5FD]" /> “AI ile Yaz” alıcı, vesile ve seçtiğiniz tona göre size özel mesaj üretir.
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
  const opts: { id: "show" | "anonymous" | "hidden"; title: string; desc: string }[] = [
    { id: "show", title: "Adımı Kartta Göster", desc: "Kart mesajının altında adınız görünür. Örn. “Sevgiler, " + (p.name.trim() || "Adem") + "”." },
    { id: "anonymous", title: "İsimsiz Gönder", desc: "Kartta ve teslimatta gönderen adı görünmez." },
    { id: "hidden", title: "Tamamen Gizli Gönderim", desc: "Adınız, telefon ve e-postanız alıcıyla asla paylaşılmaz." },
  ];
  return (
    <div>
      <Card title="Gönderen bilgileri" subtitle="Sipariş onayı ve iletişim için gereklidir. Bu bilgiler alıcıyla paylaşılmaz.">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Ad Soyad *</label><input className={inputCls} value={p.name} onChange={(e) => p.setName(e.target.value)} placeholder="Adınız Soyadınız" /></div>
          <div><label className={labelCls}>Telefon *</label><input className={inputCls} value={p.phone} onChange={(e) => p.setPhone(e.target.value)} placeholder="+90 5xx xxx xx xx" /></div>
          <div className="sm:col-span-2"><label className={labelCls}>E-posta</label><input className={inputCls} value={p.email} onChange={(e) => p.setEmail(e.target.value)} placeholder="ornek@eposta.com" /></div>
        </div>
        <div className="flex items-center gap-2 mt-5 text-[12.5px] text-[#6B7280]">
          <ShieldCheck className="w-4 h-4 text-[#22C55E]" /> Telefon ve e-postanız hiçbir koşulda alıcıya gösterilmez (KVKK uyumlu).
        </div>
      </Card>

      <Card title="Gönderen bilgileriniz alıcıyla paylaşılsın mı?" subtitle="Siparişinizi isimsiz veya tamamen gizli gönderebilirsiniz.">
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
            <span className="block text-[14px] font-bold text-[#1F2937]">🎁 Sürpriz Olarak Gönder</span>
            <span className="block text-[12.5px] text-[#6B7280] mt-0.5">Teslimat öncesi alıcıya gönderen bilgisi verilmez.</span>
          </span>
        </button>
      </Card>
    </div>
  );
}

/* ---------------------------- Adım: Ek Ürünler -------------------------- */
function StepAddons(p: { addons: CheckoutAddon[]; addonQty: Record<number, number>; setAddon: (id: number, q: number) => void }) {
  const count = p.addons.reduce((s, a) => s + (p.addonQty[a.id] || 0), 0);
  const cats = useMemo(() => {
    const set: string[] = [];
    p.addons.forEach((a) => { if (!set.includes(a.category)) set.push(a.category); });
    return set;
  }, [p.addons]);
  const [tab, setTab] = useState<string>("Tümü");
  const list = tab === "Tümü" ? p.addons : p.addons.filter((a) => a.category === tab);

  return (
    <Card title="Siparişinizi tamamlayın" subtitle="Bu güzel anı daha da özel kılacak dokunuşlar. İsterseniz ekleyin, isterseniz atlayın.">
      {cats.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {["Tümü", ...cats].map((c) => (
            <button key={c} onClick={() => setTab(c)}
              className={`px-3.5 py-2 rounded-full text-[12.5px] font-semibold transition-all ${tab === c ? "bg-[#7C3AED] text-white" : "bg-[#F7F6FB] text-[#4B5563] hover:bg-[#F0EEF9]"}`}>
              {c}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        {list.map((a) => {
          const q = p.addonQty[a.id] || 0;
          const on = q > 0;
          return (
            <div key={a.id} className={`rounded-[18px] border p-2.5 transition-all ${on ? "border-[#C4B5FD] bg-[#FBFAFF] shadow-[0_10px_28px_-16px_rgba(124,58,237,0.5)]" : "border-[#F1F0F5] bg-white hover:border-[#E9E7F0]"}`}>
              <div className="relative w-full aspect-square rounded-[12px] overflow-hidden bg-white">
                <ProductImage src={a.image ?? undefined} alt={a.name} padding="0px" protect={false} />
              </div>
              <p className="text-[12.5px] font-semibold text-[#374151] mt-2 leading-snug line-clamp-2 min-h-[34px]">{a.name}</p>
              <p className="text-[13.5px] font-bold text-[#111827] mt-0.5">{money(a.priceMinor)}</p>
              {on ? (
                <div className="mt-2 flex items-center justify-between rounded-xl bg-[#7C3AED] text-white px-2 py-1.5">
                  <button onClick={() => p.setAddon(a.id, q - 1)} aria-label="Azalt" className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/15"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="text-[13px] font-bold tabular-nums">{q}</span>
                  <button onClick={() => p.setAddon(a.id, q + 1)} aria-label="Artır" className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/15"><Plus className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button onClick={() => p.setAddon(a.id, 1)} className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#DDD6FE] text-[#7C3AED] text-[12.5px] font-bold py-1.5 hover:bg-[#F5F3FF] transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Ekle
                </button>
              )}
            </div>
          );
        })}
      </div>
      {count > 0 && (
        <div className="mt-4 flex items-center gap-2 text-[13px] text-[#6D28D9] font-semibold">
          <ShoppingBag className="w-4 h-4" /> {count} ek ürün eklendi
        </div>
      )}
    </Card>
  );
}

/* ---------------------------- Adım: Ödeme/Özet -------------------------- */
function StepOdeme(p: {
  productName: string; productPrice: number; total: number;
  addons: CheckoutAddon[]; addonQty: Record<number, number>;
  recipientName: string; occasion: string | null;
  address: string; region: string; dateStr: string | null; slotStr: string | null; typeStr: string | null; cardMessage: string;
}) {
  const selected = p.addons.filter((a) => (p.addonQty[a.id] || 0) > 0);
  return (
    <Card title="Siparişinizi onaylayın" subtitle="Her şey hazır. Onayladığınızda siparişiniz oluşturulur.">
      <div className="space-y-2.5">
        <LineItem name={p.productName} qty={1} price={p.productPrice} />
        {selected.map((a) => <LineItem key={a.id} name={a.name} qty={p.addonQty[a.id]} price={a.priceMinor * p.addonQty[a.id]} addon />)}
      </div>
      <div className="mt-4 pt-4 border-t border-[#F1F0F5] space-y-3">
        <RevRow icon={User} label="Alıcı" value={`${p.recipientName || "—"}${occasionLabel(p.occasion) ? " · " + occasionLabel(p.occasion) : ""}`} />
        <RevRow icon={MapPin} label="Teslimat" value={`${p.region ? p.region + " — " : ""}${p.address || "—"}`} />
        <RevRow icon={Calendar} label="Tarih & Saat" value={`${p.dateStr ?? "—"}${p.slotStr ? " · " + p.slotStr : ""}`} />
        {p.typeStr && <RevRow icon={Truck} label="Teslimat Tipi" value={p.typeStr} />}
        {p.cardMessage && <RevRow icon={MessageSquareText} label="Kart Mesajı" value={`“${p.cardMessage}”`} />}
      </div>
      <div className="mt-5 pt-4 border-t border-[#F1F0F5] flex items-center justify-between">
        <span className="text-[14px] font-semibold text-[#6B7280]">Toplam</span>
        <span className="text-[22px] font-bold text-[#111827]">{money(p.total)}</span>
      </div>
      <p className="text-[12px] text-[#9CA3AF] mt-4 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" /> Güvenli ödeme adımı yakında entegre edilecektir.</p>
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
  productName: string; coverUrl?: string | null; productPrice: number; total: number; productSlug?: string;
  addons: CheckoutAddon[]; addonQty: Record<number, number>;
  regionLabel: string; placeName: string | null; dateStr: string | null; slotStr: string | null; typeStr: string | null;
  recipientName: string; occasion: string | null; cardMessage: string; senderName: string;
  visibility: "show" | "anonymous" | "hidden"; surprise: boolean;
}) {
  const selected = p.addons.filter((a) => (p.addonQty[a.id] || 0) > 0);
  const senderLine = p.visibility === "show" ? (p.senderName || null) : p.visibility === "anonymous" ? "İsimsiz gönderim" : "Tamamen gizli gönderim";
  return (
    <aside className="lg:sticky lg:top-6 rounded-[22px] border border-[#F1F0F5] bg-white p-5 shadow-[0_10px_40px_-18px_rgba(124,58,237,0.28)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] tracking-[0.18em] text-[#8B5CF6] uppercase font-bold">Sipariş Fişi</h3>
        {p.productSlug && (
          <Link href={`/urun/${p.productSlug}`} className="flex items-center gap-1 text-[12px] font-semibold text-[#7C3AED] hover:underline"><Pencil className="w-3 h-3" /> Düzenle</Link>
        )}
      </div>

      <div className="flex gap-3.5">
        <div className="relative w-[80px] h-[100px] rounded-[14px] overflow-hidden ring-1 ring-[#F1F0F5] shrink-0 bg-white">
          <ProductImage src={p.coverUrl ?? undefined} alt={p.productName} padding="0px" protect={false} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#1F2937] leading-snug line-clamp-2">{p.productName}</p>
          <p className="text-[12.5px] text-[#6B7280] mt-1">Adet: 1</p>
          <p className="text-[15px] font-bold text-[#111827] mt-1">{money(p.productPrice)}</p>
        </div>
      </div>

      {selected.length > 0 && (
        <ReceiptGroup label="Ek Ürünler">
          {selected.map((a) => (
            <div key={a.id} className="flex items-center justify-between">
              <span className="text-[12.5px] text-[#4B5563] flex items-center gap-1.5 min-w-0"><Gift className="w-3 h-3 text-[#A78BDA] shrink-0" /><span className="truncate">{a.name} ×{p.addonQty[a.id]}</span></span>
              <span className="text-[12.5px] font-semibold text-[#374151] shrink-0 ml-2">{money(a.priceMinor * p.addonQty[a.id])}</span>
            </div>
          ))}
        </ReceiptGroup>
      )}

      <ReceiptGroup label="Teslimat">
        {p.placeName && <RLine icon={MapPin} value={p.placeName} />}
        {p.regionLabel.trim() && <RLine icon={MapPin} value={p.regionLabel} />}
        {p.dateStr && <RLine icon={Calendar} value={p.dateStr} />}
        {p.slotStr && <RLine icon={Clock} value={p.slotStr} />}
        {p.typeStr && <RLine icon={Truck} value={p.typeStr} />}
      </ReceiptGroup>

      {(p.recipientName || p.occasion) && (
        <ReceiptGroup label="Alıcı">
          {p.recipientName && <RLine icon={User} value={p.recipientName} />}
          {occasionLabel(p.occasion) && <RLine icon={Heart} value={occasionLabel(p.occasion)!} />}
        </ReceiptGroup>
      )}

      {p.cardMessage && <ReceiptGroup label="Kart Mesajı"><RLine icon={MessageSquareText} value={`“${p.cardMessage}”`} /></ReceiptGroup>}
      {(senderLine || p.surprise) && (
        <ReceiptGroup label="Gönderen">
          {senderLine && <RLine icon={User} value={senderLine} />}
          {p.surprise && <RLine icon={Gift} value="🎁 Sürpriz sipariş" />}
        </ReceiptGroup>
      )}

      <div className="mt-4 pt-4 border-t border-[#F4F3F7] flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#6B7280]">Toplam</span>
        <span className="text-[19px] font-bold text-[#111827]">{money(p.total)}</span>
      </div>
    </aside>
  );
}
function ReceiptGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children];
  if (!arr.some(Boolean)) return null;
  return (
    <div className="mt-4 pt-4 border-t border-[#F4F3F7]">
      <p className="text-[10px] tracking-[0.14em] text-[#8B5CF6] uppercase font-bold mb-2">{label}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function RLine({ icon: Icon, value }: { icon: React.ComponentType<{ className?: string }>; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-[#A78BDA] mt-0.5 shrink-0" />
      <p className="text-[12.5px] text-[#4B5563] leading-snug break-words">{value}</p>
    </div>
  );
}
