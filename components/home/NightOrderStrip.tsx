/**
 * GECE ÇİÇEK SİPARİŞİ ŞERİDİ — UrgencyStrip'in premium kardeşi.
 *
 * Tasarım kararı (Version 72, 3 Eyl 2026): ayrı bir "gece" teması YOK. Aynı
 * mor/lila gradyan ailesi kullanılır; farklılaşma yalnız zarif yıldız/parıltı
 * ile verilir. Siyaha yaklaşan zemin, ayrı marka hissi, sabit saat, garanti
 * veya süre vaadi bilinçli olarak yoktur. Metinler `lib/nightOrder.ts`ten gelir.
 *
 * Sunucu bileşenidir (framer-motion yok): ana sayfada UrgencyStrip'in hemen
 * altında ve İstanbul içi lokasyon sayfalarında mor CTA bölümünün üstünde
 * kullanılır. Yıldız konumları SABİTTİR (Math.random yok → hidrasyon farkı yok).
 */
import Link from "next/link";
import { MessageCircle, Sparkles } from "lucide-react";
import { SUPPORT_WHATSAPP } from "@/lib/payment";
import { GECE_SIPARIS, nightOrderWhatsAppHref } from "@/lib/nightOrder";

const YILDIZLAR: ReadonlyArray<{ left: string; top: string; size: number; opacity: number }> = [
  { left: "6%", top: "22%", size: 3, opacity: 0.85 },
  { left: "13%", top: "68%", size: 2, opacity: 0.55 },
  { left: "21%", top: "34%", size: 2, opacity: 0.7 },
  { left: "33%", top: "76%", size: 3, opacity: 0.5 },
  { left: "46%", top: "18%", size: 2, opacity: 0.8 },
  { left: "58%", top: "62%", size: 2, opacity: 0.45 },
  { left: "67%", top: "28%", size: 3, opacity: 0.75 },
  { left: "79%", top: "70%", size: 2, opacity: 0.6 },
  { left: "88%", top: "24%", size: 2, opacity: 0.7 },
  { left: "95%", top: "58%", size: 3, opacity: 0.5 },
];

export function NightOrderStrip() {
  return (
    <div
      className="relative overflow-hidden py-5 px-6"
      style={{ background: "linear-gradient(90deg, #1E0A4A 0%, #4C1D95 40%, #6D28D9 70%, #1E0A4A 100%)" }}
      aria-label="Gece çiçek siparişi"
      data-night-order-strip
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {YILDIZLAR.map((y, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: y.left, top: y.top, width: y.size, height: y.size, opacity: y.opacity,
              background: "#DDD6FE", boxShadow: "0 0 8px 2px rgba(192,132,252,0.45)",
            }}
          />
        ))}
      </div>
      <div className="relative max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-white">
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <Sparkles className="w-4.5 h-4.5 text-[#DDD6FE]" />
          </div>
          <div>
            <p className="font-semibold text-base flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{GECE_SIPARIS.baslik}</span>
              <span className="rounded-full border border-[#C084FC]/45 bg-[#8B5CF6]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[.18em] text-[#DDD6FE]">
                {GECE_SIPARIS.rozet}
              </span>
            </p>
            <p className="text-white/50 text-xs mt-0.5">{GECE_SIPARIS.aciklama}</p>
          </div>
        </div>
        <Link
          href={nightOrderWhatsAppHref(SUPPORT_WHATSAPP)}
          className="px-8 py-3 rounded-full text-white text-sm font-semibold flex-shrink-0 transition-all inline-flex items-center gap-2"
          style={{ border: "1.5px solid rgba(192,132,252,0.45)", background: "rgba(139,92,246,0.2)" }}
        >
          <MessageCircle className="w-4 h-4" />
          {GECE_SIPARIS.cta} →
        </Link>
      </div>
    </div>
  );
}
