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
import { ShieldCheck, Truck, Lock, FileCheck, CreditCard, Sparkles, Users, MapPin, Calendar, Clock, Package, ArrowRight, Pencil } from "lucide-react";
import { ProductImage } from "@/components/product/ProductImage";
import { readPendingDelivery, type PendingDelivery } from "@/lib/pendingDelivery";

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
  { icon: CreditCard, label: "Güvenli Ödeme" },
  { icon: Sparkles, label: "Profesyonel Floristler" },
  { icon: Users, label: "Binlerce Mutlu Müşteri" },
];

const STEPS = ["Teslimat", "Hesap", "Alıcı", "Kart Mesajı", "Ödeme"];

function ProgressBar({ active }: { active: number }) {
  return (
    <div className="flex items-center w-full max-w-2xl mx-auto mb-10">
      {STEPS.map((s, i) => {
        const done = i < active;
        const cur = i === active;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${
                  done ? "bg-[#7C3AED] text-white" : cur ? "bg-[#7C3AED] text-white ring-4 ring-[#EDE9FE]" : "bg-[#F1F0F5] text-[#9CA3AF]"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-[10.5px] font-semibold whitespace-nowrap ${cur ? "text-[#7C3AED]" : done ? "text-[#6B7280]" : "text-[#C4B5FD]"}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-[2px] flex-1 mx-1.5 mb-5 rounded-full ${i < active ? "bg-[#7C3AED]" : "bg-[#F1F0F5]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

type Props = {
  productName: string;
  priceMinor: number;
  coverUrl?: string | null;
  productSlug: string;
  onContinue: () => void;
};

export default function AccountGate({ productName, priceMinor, coverUrl, productSlug, onContinue }: Props) {
  const [pd, setPd] = useState<PendingDelivery | null>(null);
  useEffect(() => { setPd(readPendingDelivery()); }, []);

  const dateStr = formatDate(pd?.date);
  const typeStr = pd?.mode === "cargo" ? "Ücretsiz Kargo" : pd?.mode === "sameday" ? "Aynı Gün Teslimat" : null;

  const Summary = (
    <motion.aside
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="lg:sticky lg:top-6 rounded-[22px] border border-[#F1F0F5] bg-white p-5 shadow-[0_10px_40px_-18px_rgba(124,58,237,0.28)]"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] tracking-[0.18em] text-[#8B5CF6] uppercase font-bold">Sipariş Özeti</h3>
        <Link href={`/urun/${productSlug}`} className="flex items-center gap-1 text-[12px] font-semibold text-[#7C3AED] hover:underline">
          <Pencil className="w-3 h-3" /> Düzenle
        </Link>
      </div>

      <div className="flex gap-3.5">
        <div className="relative w-[84px] h-[104px] rounded-[14px] overflow-hidden ring-1 ring-[#F1F0F5] shrink-0 bg-white">
          <ProductImage src={coverUrl ?? undefined} alt={productName} padding="0px" protect={false} />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#1F2937] leading-snug line-clamp-2">{productName}</p>
          <p className="text-[13px] text-[#6B7280] mt-1">Adet: 1</p>
          <p className="text-[16px] font-bold text-[#111827] mt-1.5">{money(priceMinor)}</p>
        </div>
      </div>

      {(pd?.address || pd?.placeName || dateStr || pd?.slotLabel || typeStr) && (
        <div className="mt-4 pt-4 border-t border-[#F4F3F7] space-y-2.5">
          <p className="text-[10.5px] tracking-[0.16em] text-[#8B5CF6] uppercase font-bold">Teslimat Bilgileri</p>
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

      <div className="mt-4 pt-4 border-t border-[#F4F3F7] flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#6B7280]">Toplam</span>
        <span className="text-[19px] font-bold text-[#111827]">{money(priceMinor)}</span>
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

      <ProgressBar active={1} />

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
            <h2 className="text-[20px] font-bold text-[#111827]" style={{ fontFamily: "var(--font-display)" }}>Misafir Olarak Devam Et</h2>
            <p className="text-[14px] text-[#6B7280] mt-2 leading-relaxed">
              En hızlı sipariş yöntemi. Hesap oluşturmanıza gerek yok — siparişinizi yaklaşık 2 dakikada tamamlayabilirsiniz.
            </p>

            <button
              onClick={onContinue}
              className="group mt-5 w-full flex items-center justify-center gap-2 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] active:scale-[0.99] text-white text-[15px] font-bold py-4 transition-all shadow-[0_12px_30px_-10px_rgba(124,58,237,0.6)]"
            >
              Misafir Olarak Devam Et
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Küçük bilgi — V1'de login YOK, sahte alan YOK. Sadece bilgilendirme. */}
            <p className="text-center text-[12.5px] text-[#9CA3AF] mt-4">
              Daha önce sipariş verdiyseniz, üyelik girişi yakında aktif olacak.
            </p>

            {/*
              GELECEK ENTEGRASYON NOKTASI (V2+): burada auth eklenince
              Google / Apple / Microsoft / Magic Link / OTP butonları render edilecek.
              V1'de bilinçli olarak BOŞ — sahte login üretilmez.
            */}
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

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-[#8B5CF6] mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wide">{label}</p>
        <p className="text-[13px] text-[#374151] font-medium leading-snug">{value}</p>
      </div>
    </div>
  );
}
