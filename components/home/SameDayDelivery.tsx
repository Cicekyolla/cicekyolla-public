"use client";

/**
 * §5c SAME DAY DELIVERY — mevcut tasarım korunur.
 * İş kuralı: İstanbul içi uygun bölgelerde aynı gün; İstanbul dışı kargoya uygun
 * ürünlerde 1–3 iş günü. Kesin saat/araç/ücretsiz kargo taahhüdü verilmez.
 */

import Link from "next/link";
import { motion } from "motion/react";
import { Clock, Sparkles, Truck, Zap, ArrowRight, Leaf } from "lucide-react";
import { SectionLabel, SectionTitle } from "./SectionHeading";

const steps = [
  { step: "01", icon: Clock, title: "Sipariş Ver", desc: "Teslimat bölgenizi seçin; uygun tarih ve saat aralıkları sipariş adımında gösterilir.", color: "#8B5CF6" },
  { step: "02", icon: Sparkles, title: "Özenle Hazırlanır", desc: "Çiçekleriniz sipariş detaylarına göre ustalarımız tarafından özenle hazırlanır.", color: "#A855F7" },
  { step: "03", icon: Truck, title: "Teslim Edilir", desc: "İstanbul içi uygun bölgelerde aynı gün, İstanbul dışında kargoya uygun ürünlerde 1–3 iş günü teslimat uygulanır.", color: "#C084FC" },
];

export function SameDayDelivery() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <SectionLabel>İstanbul&apos;da Aynı Gün Teslimat</SectionLabel>
            <SectionTitle>
              Bölgenize Uygun,
              <br />
              Güvenli Teslimat
            </SectionTitle>
            <p className="text-[#6B7280] text-[16px] leading-relaxed mt-6 mb-10">
              İstanbul içindeki uygun teslimat bölgelerinde aynı gün kurye seçeneği sunulur.
              İstanbul dışındaki adreslerde yalnızca kargoya uygun ürünler 1–3 iş günü içinde gönderilir.
              Kesin tarih ve uygun saat aralıkları sipariş adımında bölgenize göre gösterilir.
            </p>

            <div className="space-y-5">
              {steps.map(({ step, icon: Icon, title, desc, color }, i) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.55 }}
                  className="flex items-start gap-5"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${color}22, ${color}44)`, border: `1px solid ${color}33` }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-[10px] font-bold tracking-[0.2em]" style={{ color }}>ADIM {step}</span>
                      <p className="text-sm font-bold text-[#111827]">{title}</p>
                    </div>
                    <p className="text-sm text-[#6B7280] leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/kategori/buketler" className="inline-block">
                <motion.span
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2.5 px-8 py-4 rounded-full text-white text-sm font-bold"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #A855F7)", boxShadow: "0 10px 32px rgba(139,92,246,0.32)" }}
                >
                  <Zap className="w-4 h-4" />
                  Hemen Sipariş Ver
                </motion.span>
              </Link>
              <Link
                href="/teslimat-bolgeleri"
                className="flex items-center gap-2 px-8 py-4 rounded-full text-[#8B5CF6] text-sm font-bold border border-[#DDD6FE] hover:bg-[#F5F3FF] transition-colors"
              >
                Teslimat Bölgeleri <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 gap-4"
          >
            <div
              className="col-span-2 relative overflow-hidden rounded-[24px] p-7 flex flex-col justify-between"
              style={{ background: "linear-gradient(135deg, #0D0520 0%, #2D1260 50%, #4C1D95 100%)", minHeight: "180px" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] tracking-[0.25em] text-[#C084FC] uppercase font-bold mb-2">Teslimat Kapsamı</p>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", lineHeight: 1 }} className="font-semibold text-white">Bölgeye Göre</p>
                  <p className="text-white/55 text-sm mt-2">uygun tarih ve saat seçimi</p>
                </div>
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(192,132,252,0.15)", border: "1px solid rgba(192,132,252,0.2)" }}
                >
                  <Clock className="w-5 h-5 text-[#C084FC]" />
                </div>
              </div>
              <div className="flex gap-2 mt-4 flex-wrap">
                {["İstanbul Aynı Gün", "Türkiye 1–3 İş Günü", "Kargoya Uygun Ürünler"].map((label) => (
                  <span
                    key={label}
                    className="px-3 py-1 rounded-full text-[11px] font-semibold text-white/80"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div
                className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%)", filter: "blur(32px)" }}
              />
            </div>

            <div
              className="relative overflow-hidden rounded-[20px] p-6"
              style={{ background: "linear-gradient(135deg, #F5F3FF, #EDE9FE)", border: "1px solid rgba(139,92,246,0.12)" }}
            >
              <Leaf className="w-5 h-5 text-[#8B5CF6] mb-3" />
              <p style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", lineHeight: 1 }} className="font-semibold text-[#111827]">
                Özenli
                <br />
                Hazırlık
              </p>
              <p className="text-xs text-[#8B5CF6] font-bold mt-2 tracking-wide">Taze Ürün Seçimi</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
