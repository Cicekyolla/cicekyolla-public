"use client";

/**
 * §3 EDITORIAL / MANIFESTO — ZIP Homepage.tsx birebir port.
 * Sol: "Çiçekler kelimelerden daha güçlüdür…" manifesto (Fraunces, gradient vurgu).
 * Sağ: 4 istatistik kartı (2.400+ / %98 / 50+ / 7-24) — CountUp animasyonlu, lilac gradient kart.
 * Sıra: TrustBar(USP)'tan sonra. SEO/SSR'a dokunulmadı; yeni mock/placeholder yok.
 */

import { motion } from "motion/react";
import { SectionLabel } from "./SectionHeading";
import { CountUp } from "./CountUp";

const stats = [
  { num: 2400, suf: "+", label: "Mutlu Müşteri" },
  { num: 98, suf: "%", label: "Memnuniyet" },
  { num: 50, suf: "+", label: "Benzersiz Ürün" },
  { num: 7, suf: "/24", label: "WhatsApp Destek" },
];

export function Manifesto() {
  return (
    <section className="py-28 lg:py-36 bg-white">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="grid lg:grid-cols-[1fr_420px] gap-16 lg:gap-24 items-end">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <SectionLabel>Çiçekyolla Manifesto</SectionLabel>
            <blockquote
              style={{ fontFamily: "var(--font-display)", lineHeight: 1.08, letterSpacing: "-0.015em" }}
              className="text-[2.6rem] md:text-[3.4rem] lg:text-[4.2rem] font-semibold text-[#111827]"
            >
              &ldquo;Çiçekler kelimelerden{" "}
              <em
                className="not-italic"
                style={{
                  background: "linear-gradient(135deg, #8B5CF6, #C084FC)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                daha güçlüdür.
              </em>{" "}
              Biz bu gücü her teslimatımıza taşırız.&rdquo;
            </blockquote>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="grid grid-cols-2 gap-6"
          >
            {stats.map(({ num, suf, label }) => (
              <div
                key={label}
                className="rounded-2xl p-6"
                style={{
                  background: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)",
                  border: "1px solid rgba(139,92,246,0.1)",
                }}
              >
                <p
                  style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", lineHeight: 1 }}
                  className="font-semibold text-[#111827] mb-2"
                >
                  <CountUp target={num} suffix={suf} />
                </p>
                <p className="text-xs text-[#6B7280] font-medium tracking-wide">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
