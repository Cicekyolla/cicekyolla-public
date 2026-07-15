"use client";

/**
 * §9 BRAND STORY — ZIP Homepage.tsx birebir port.
 * Sol: görsel + floating "7-10 Gün Taze Kalma Garantisi" kartı.
 * Sağ: "Hikayemiz" başlık + iki paragraf + 4 maddelik güven listesi + CTA.
 * Adaptasyon: react-router <Link><button> → next/link <Link> (buton stili). Görsel/etkileşim birebir.
 */

import Link from "next/link";
import { motion } from "motion/react";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import { SectionLabel, SectionTitle } from "./SectionHeading";

const features = [
  "Günlük taze pazar alımı",
  "El yapımı özel tasarım",
  "Biyobozunur lüks ambalaj",
  "Kişisel mesaj kartı dahil",
];

export function BrandStory() {
  return (
    <section className="py-28 lg:py-36 bg-white">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-16 lg:gap-28 items-center">
          {/* Image side */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div
              className="overflow-hidden rounded-[28px]"
              style={{ aspectRatio: "4/5", boxShadow: "0 40px 120px rgba(0,0,0,0.14), 0 8px 32px rgba(0,0,0,0.08)" }}
            >
              <img
                src="https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=1200&h=1500&fit=crop&auto=format&q=92"
                alt="Çiçekyolla atölyesi"
                width={1200}
                height={1500}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Floating stat card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="absolute -bottom-7 -right-5 lg:-right-10 rounded-[20px] p-6"
              style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(24px)",
                boxShadow: "0 24px 64px rgba(139,92,246,0.14), 0 4px 16px rgba(0,0,0,0.08)",
                border: "1px solid rgba(139,92,246,0.1)",
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #A855F7)" }}
              >
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "1.7rem", lineHeight: 1 }} className="font-semibold text-[#111827]">
                7–10 Gün
              </p>
              <p className="text-xs text-[#8B5CF6] font-semibold mt-1 tracking-wide">Taze Kalma Garantisi</p>
            </motion.div>
          </motion.div>

          {/* Text side */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          >
            <SectionLabel>Hikayemiz</SectionLabel>
            <SectionTitle>
              Her Teslimat
              <br />
              Bir Hikaye Anlatır
            </SectionTitle>
            <p className="text-[#6B7280] text-[16px] leading-relaxed mt-7 mb-6">
              Çiçekyolla olarak, her çiçek teslimatının arkasında derin bir duygu olduğuna inanıyoruz.
              Sevgi, özlem, kutlama, teselli… Bu anları en güzel şekilde ifade etmek için buradayız.
            </p>
            <p className="text-[#6B7280] text-[16px] leading-relaxed mb-10">
              Uzman çiçek tasarımcılarımız her sabah pazarın en taze ürünlerini özenle seçer.
              Her buket, el yapımı bir sanat eserine dönüşür.
            </p>

            <div className="space-y-3.5 mb-11">
              {features.map((item) => (
                <div key={item} className="flex items-center gap-3.5">
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #EDE9FE, #DDD6FE)", border: "1px solid rgba(139,92,246,0.2)" }}
                  >
                    <Check className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  </div>
                  <span className="text-[14px] text-[#374151] font-medium">{item}</span>
                </div>
              ))}
            </div>

            <Link href="/kategori/buketler" className="inline-block">
              <motion.span
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 px-9 py-4 rounded-full text-white text-sm font-semibold"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #A855F7)", boxShadow: "0 10px 32px rgba(139,92,246,0.32)" }}
              >
                Koleksiyonu Keşfet <ArrowRight className="w-4 h-4" />
              </motion.span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
