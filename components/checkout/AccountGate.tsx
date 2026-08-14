"use client";

// ---------------------------------------------------------------------------
// ACCOUNT GATE (Checkout Adım 1) — CONVERSION FIRST · GUEST ONLY (V1).
// Kullanıcı ürün + teslimat seçimini yaptı; bu ekran siparişi BAŞLATIR.
// V1: yalnız "Misafir Olarak Devam Et". Sahte login/OTP/session/social YOK.
// Gelecekte auth eklenince açılacak entegrasyon noktaları YORUM olarak bırakıldı.
// ADDITIVE: order/checkout/payment/auth mantığına DOKUNMAZ. "Devam" → Alıcı Bilgileri.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ShieldCheck, Truck, Lock, FileCheck, CreditCard, Sparkles, Users, MapPin, Calendar, Clock, Package, ArrowRight, Pencil, LogIn, UserPlus } from "lucide-react";
import { ProductImage } from "@/components/product/ProductImage";
import { readPendingDelivery, type PendingDelivery } from "@/lib/pendingDelivery";
import { CheckoutProgress } from "./CheckoutProgress";

const money = (m: number) => `₺${(m / 100).toLocaleString("tr-TR")}`;

function formatDate(d?: string): string | null {
  if (!d) return null;
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
}

const TRUST = [
  { icon: ShieldCheck, label: "256 Bit Güvenli Alışveriş" },
  { icon: Truck, label: "Aynı Gün Teslimat" },
  { icon: Lock, label: "SSL Koruması" },
  { icon: FileCheck, label: "KVKK Uyumlu" },
  { icon: CreditCard, label: "Güvenli Sipariş" },
  { icon: Sparkles, label: "Profesyonel Floristler" },
  { icon: Users, label: "Binlerce Mutlu Müşteri" },
];

type Props = {
  productName: string;
  priceMinor: number;
  coverUrl?: string | null;
  productSlug: string;
  quantity?: number;
  totalMinor?: number;
  returnPath?: string;
  delivery?: PendingDelivery;
  onContinue: () => void;
  /** Teslimatı checkout içinde düzenle (ürün sayfasına GİTMEZ). */
  onEditDelivery?: () => void;
};

export default function AccountGate({ productName, priceMinor, coverUrl, productSlug, quantity = 1, totalMinor, returnPath, delivery, onContinue, onEditDelivery }: Props) {
  const [pd, setPd] = useState<PendingDelivery | null>(delivery ?? null);
  const [member, setMember] = useState<{ name: string; email: string } | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  useEffect(() => {
    setPd(delivery ?? readPendingDelivery());
    fetch("/api/account", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((account) => setMember(account?.customer ?? null))
      .catch(() => setMember(null))
      .finally(() => setAccountLoading(false));
  }, [delivery]);

  const dateStr = formatDate(pd?.date);
  const typeStr = pd?.mode === "cargo" ? "Ücretsiz Kargo" : pd?.mode === "sameday" ? "Aynı Gün Teslimat" : null;
  // TEK HUNİ: giriş sonrası dönüş her zaman checkout'un kendisidir.
  // Eski fallback /hizli-siparis'e dönüyordu; o route artık ürün sayfasına
  // yönlendiriyor ve müşteri giriş yaptıktan sonra sepetini kaybediyormuş gibi
  // hissedecekti. productSlug prop'u özet kartındaki "Düzenle" için duruyor.
  const loginReturnPath = returnPath ?? "/checkout";

  const Summary = (
    <motion.aside
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      // V85 — checkout'taki ürün hafızası paneliyle AYNI koyu aile, böylece
      // hesap adımı kompozisyonun doğal devamı olur. Auth mantığı DEĞİŞMEDİ.
      className="lg:sticky lg:top-6 overflow-hidden rounded-[22px] p-5 shadow-[0_28px_70px_-34px_rgba(76,29,149,0.85)]"
      style={{ background: "linear-gradient(175deg, #0F0224 0%, #1A0638 55%, #110328 100%)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[9px] tracking-[0.32em] uppercase font-bold" style={{ color: "#C4B5FD" }}>✦ Siparişiniz</h3>
        {/* Checkout'tan ÇIKMAZ: teslimat düzenleme panelini açar. Önce
            /urun/[slug]'a Link'ti ve müşteri siparişe baştan başlıyordu. */}
        {onEditDelivery && (
          <button type="button" onClick={onEditDelivery} className="flex items-center gap-1 text-[12px] font-semibold text-white/70 hover:text-white transition-colors">
            <Pencil className="w-3 h-3" /> Düzenle
          </button>
        )}
      </div>

      <div className="relative w-full overflow-hidden rounded-[16px] bg-white" style={{ aspectRatio: "4/5" }}>
        <ProductImage src={coverUrl ?? undefined} alt={productName} padding="10px" protect={false} sizes="(max-width:1024px) 100vw, 360px" />
      </div>
      <p className="mt-3.5 text-white font-semibold leading-snug" style={{ fontFamily: "var(--font-display)", fontSize: "19px", letterSpacing: "-0.01em" }}>{productName}</p>
      <div className="mt-1 flex items-baseline gap-2">
        {quantity > 1 && <span className="text-white/40 text-[12px]">×{quantity}</span>}
        <span className="text-white/70 text-[13.5px] font-medium">{money(priceMinor * quantity)}</span>
      </div>

      {(pd?.address || pd?.placeName || dateStr || pd?.slotLabel || typeStr) && (
        <div className="mt-4 pt-4 space-y-2.5" style={{ borderTop: "1px solid rgba(196,181,253,0.13)" }}>
          <p className="text-[10px] tracking-[0.14em] uppercase font-bold" style={{ color: "#C4B5FD" }}>Teslimat Bilgileri</p>
          {pd?.placeName && <Row icon={MapPin} label="Seçilen Yer" value={pd.placeName} />}
          {(pd?.address || pd?.neighborhood) && (
            <Row
              icon={MapPin}
              label="Teslimat Adresi"
              value={`${pd.neighborhood ? pd.neighborhood + ", " : ""}${pd.district ? pd.district : ""}${pd.city ? " / " + pd.city : ""}${pd.address ? " — " + pd.address : ""}`}
            />
          )}
          {dateStr && <Row icon={Calendar} label="Teslimat Tarihi" value={dateStr} />}
          {pd?.slotLabel && <Row icon={Clock} label="Saat" value={pd.slotLabel} />}
          {typeStr && <Row icon={Package} label="Teslimat Tipi" value={typeStr} />}
        </div>
      )}

      <div className="mt-4 pt-4 flex items-baseline justify-between" style={{ borderTop: "1px solid rgba(196,181,253,0.13)" }}>
        <span className="text-[12px] text-white/40">Toplam</span>
        <span className="text-white font-semibold" style={{ fontFamily: "var(--font-display)", fontSize: "26px", letterSpacing: "-0.02em" }}>{money(totalMinor ?? priceMinor * quantity)}</span>
      </div>
    </motion.aside>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      {/* Başlık */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#7C3AED] mb-3">
          <span style={{ fontFamily: "var(--font-display)" }}>Çiçek Yolla</span> <span>❤️</span>
        </div>
        <h1 className="text-3xl lg:text-[34px] font-bold text-[#111827]" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
          Siparişinize Devam Edelim
        </h1>
        <p className="text-[15px] text-[#6B7280] mt-3 max-w-lg mx-auto leading-relaxed">
          Ürününüz hazır. Şimdi siparişinizi birkaç adımda güvenle tamamlayacağız.
        </p>
      </div>

      {/* Tek anlatı — kendi 5 adımlı çubuğu kaldırıldı (Teslimat'ı 1. sıraya koyuyor,
          Wizard ise 2. sıraya koyuyordu). Hesap seçimi "Bilgiler" fazının girişidir. */}
      <div className="mb-10">
        <CheckoutProgress current={2} />
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start">
        {/* Sol/İçerik — mobilde özetten SONRA */}
        <div className="order-2 lg:order-1 space-y-5">
          {/* Misafir kartı — tek büyük CTA */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[22px] border border-[#EDE9FE] bg-gradient-to-b from-white to-[#FBFAFF] p-6 lg:p-8"
          >
            {accountLoading ? <p className="text-[14px] text-[#6B7280]">Üyelik durumunuz kontrol ediliyor…</p> : member ? <>
              <h2 className="text-[20px] font-bold text-[#111827]" style={{ fontFamily: "var(--font-display)" }}>{member.name} olarak devam edin</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6B7280]">{member.email} hesabıyla verilen sipariş, müşteri panelinizde tarih, saat, durum ve puan hareketleriyle görünür.</p>
              <button onClick={onContinue} className="group mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7C3AED] py-4 text-[15px] font-bold text-white shadow-[0_12px_30px_-10px_rgba(124,58,237,0.6)] hover:bg-[#6D28D9]">Üye Olarak Devam Et <ArrowRight className="h-4 w-4" /></button>
            </> : <>
              <h2 className="text-[20px] font-bold text-[#111827]" style={{ fontFamily: "var(--font-display)" }}>Nasıl devam etmek istersiniz?</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6B7280]">Üye siparişleri müşteri panelinde görünür ve teslimattan sonra puan kazanır. Hesap oluşturmadan da devam edebilirsiniz.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link href={`/giris?next=${encodeURIComponent(loginReturnPath)}`} className="flex items-center justify-center gap-2 rounded-2xl bg-[#7C3AED] px-4 py-4 text-[14px] font-bold text-white hover:bg-[#6D28D9]"><LogIn className="h-4 w-4" /> Giriş Yap</Link>
                <Link href={`/giris?next=${encodeURIComponent(loginReturnPath)}#uye-ol`} className="flex items-center justify-center gap-2 rounded-2xl border border-[#C4B5FD] bg-white px-4 py-4 text-[14px] font-bold text-[#7C3AED] hover:bg-[#F5F3FF]"><UserPlus className="h-4 w-4" /> Üye Ol</Link>
              </div>
              <button onClick={onContinue} className="group mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white py-4 text-[14px] font-bold text-[#4B5563] hover:border-[#C4B5FD] hover:text-[#7C3AED]">Misafir Olarak Devam Et <ArrowRight className="h-4 w-4" /></button>
            </>}
          </motion.div>

          {/* Güven bloğu */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[22px] border border-[#F1F0F5] bg-white p-5"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
              {TRUST.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-[12.5px] text-[#4B5563] font-medium">
                  <Icon className="w-4 h-4 text-[#22C55E] shrink-0" />
                  <span className="leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Sağ/Özet — mobilde ÖNCE */}
        <div className="order-1 lg:order-2">{Summary}</div>
      </div>
    </motion.div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 mt-[3px] shrink-0" style={{ color: "#8B5CF6" }} />
      <div className="min-w-0">
        <p className="text-[10px] text-white/35 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-[12.5px] text-white/75 font-medium leading-snug break-words">{value}</p>
      </div>
    </div>
  );
}
