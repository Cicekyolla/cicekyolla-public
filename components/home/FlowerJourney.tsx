"use client";

/**
 * §Çiçeğin Yolculuğu — Figma "Servis Deneyimi" bölümü (additive).
 * Koyu mor gece zemini (hero/noir ailesi #0A0118), ince yatay lila timeline,
 * soft glow ikon daireleri, 4 adımlı premium servis akışı.
 * Desktop: yatay 4 sütun + daireleri birleştiren çizgi. Mobil: dikey akış
 * (taşma yok, WhatsApp butonuyla çakışma yok — normal akışta, fixed değil).
 * Metinler kullanıcı onaylı final metinlerdir — değiştirme.
 * Veri bağlantısı YOK (editorial, Manifesto/WorkshopToday emsali).
 */

import { motion } from "motion/react";
import { Flower2, Scissors, Gift, Truck } from "lucide-react";

const STEPS = [
  {
    no: "01",
    title: "Seçilir",
    text: "Sabah erken saatlerde taze ithal çiçekler usta floristlerimiz tarafından tek tek incelenerek seçilir.",
    Icon: Flower2,
  },
  {
    no: "02",
    title: "Hazırlanır",
    text: "Her aranjman, deneyimli floristlerimizin elleriyle özenle ve sanatsal bir anlayışla şekillendirilir.",
    Icon: Scissors,
  },
  {
    no: "03",
    title: "Paketlenir",
    text: "Özel koruyucu ambalaj, zarif şerit ve el yazısı kart ile sipariş hediye gibi hazırlanır.",
    Icon: Gift,
  },
  {
    no: "04",
    title: "Teslim Edilir",
    text: "Profesyonel kurye ekibimiz, siparişinizi tam zamanında ve hasarsız teslim eder.",
    Icon: Truck,
  },
] as const;

export function FlowerJourney() {
  return (
    <section aria-label="Çiçeğin Yolculuğu" className="relative bg-[#0A0118] overflow-hidden">
      {/* Soft mor glow — abartısız, Figma gece atmosferi */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.14) 0%, transparent 55%)", pointerEvents: "none" }}
      />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-14 py-24 lg:py-32">
        {/* Eyebrow — yanlarda ince lila çizgilerle (Figma) */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center gap-4 mb-5"
        >
          <span className="h-px w-10" style={{ background: "linear-gradient(90deg, transparent, rgba(192,132,252,0.5))" }} />
          <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#C084FC]">Servis Deneyimi</span>
          <span className="h-px w-10" style={{ background: "linear-gradient(90deg, rgba(192,132,252,0.5), transparent)" }} />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center text-white text-4xl lg:text-[56px] font-semibold mb-16 lg:mb-20"
          style={{ fontFamily: "var(--font-display)", lineHeight: 1.05, letterSpacing: "-0.01em" }}
        >
          Çiçeğin Yolculuğu
        </motion.h2>

        <div className="relative">
          {/* İnce yatay lila timeline — yalnız desktop, dairelerin merkezinden geçer */}
          <div
            className="hidden lg:block absolute left-[10%] right-[10%] top-[52px] h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(192,132,252,0.35) 15%, rgba(192,132,252,0.35) 85%, transparent)" }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            {STEPS.map((step, idx) => (
              <motion.div
                key={step.no}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.14, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex flex-col items-center text-center"
              >
                {/* Glow'lu ikon dairesi + numara rozeti */}
                <div className="relative mb-8">
                  <div
                    className="w-[104px] h-[104px] rounded-full flex items-center justify-center"
                    style={{
                      background: "radial-gradient(circle at 35% 30%, rgba(139,92,246,0.28) 0%, rgba(139,92,246,0.10) 60%, rgba(255,255,255,0.03) 100%)",
                      border: "1px solid rgba(192,132,252,0.22)",
                      boxShadow: "0 0 44px rgba(139,92,246,0.28), inset 0 1px 0 rgba(255,255,255,0.10)",
                    }}
                  >
                    <step.Icon className="w-7 h-7 text-white/85" aria-hidden="true" />
                  </div>
                  <span
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)",
                      boxShadow: "0 4px 14px rgba(139,92,246,0.55)",
                    }}
                  >
                    {idx + 1}
                  </span>
                </div>

                <p className="text-[11px] tracking-[0.28em] font-bold text-white/40 mb-2">{step.no}</p>
                <h3 className="text-white text-2xl font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>
                  {step.title}
                </h3>
                <p className="text-white/55 text-sm leading-relaxed max-w-[300px]">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
