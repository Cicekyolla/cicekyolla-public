"use client";

/**
 * §12 DISTRICT DELIVERY — ZIP Homepage.tsx birebir port.
 * Sol: ilçe/il listesi → programmatic /cicek-gonder/{slug} iç linkleri (SEO District Pages ile uyumlu).
 * Sağ: animasyonlu soyut harita (dönen halkalar + şehir noktaları, ping efekti).
 * Adaptasyon: react-router <Link to=…> → next/link <Link href=…>. districts verisi co-located.
 */

import Link from "next/link";
import { motion } from "motion/react";
import { MapPin, ArrowRight } from "lucide-react";
import { SectionLabel, SectionTitle } from "./SectionHeading";

const districts = [
  { name: "Kadıköy", time: "2–3 saat", orders: "847" },
  { name: "Beşiktaş", time: "2–3 saat", orders: "723" },
  { name: "Şişli", time: "2–3 saat", orders: "612" },
  { name: "Üsküdar", time: "3–4 saat", orders: "489" },
  { name: "Ataşehir", time: "3–4 saat", orders: "378" },
  { name: "Maltepe", time: "3–4 saat", orders: "321" },
  { name: "Ankara", time: "Aynı gün", orders: "956" },
  { name: "İzmir", time: "Aynı gün", orders: "634" },
];

const cityDots = [
  { x: "32%", y: "38%", label: "İstanbul", delay: 0 },
  { x: "58%", y: "28%", label: "Ankara", delay: 0.15 },
  { x: "18%", y: "62%", label: "İzmir", delay: 0.3 },
  { x: "72%", y: "60%", label: "Antalya", delay: 0.45 },
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u");
}

export function DistrictDelivery() {
  return (
    <section className="py-24" style={{ background: "linear-gradient(180deg, #FAFAFA 0%, #F5F3FF 60%, #FAFAFA 100%)" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-16 items-center">
          <div>
            <SectionLabel>Teslimat Bölgeleri</SectionLabel>
            <SectionTitle>
              Türkiye&apos;nin Her
              <br />
              Köşesine Teslimat
            </SectionTitle>
            <p className="text-[#6B7280] text-[16px] leading-relaxed mt-6 mb-10">
              İstanbul&apos;dan Ankara&apos;ya, İzmir&apos;den Antalya&apos;ya — yüzlerce ilçeye aynı
              gün teslimat. 14:00&apos;a kadar verilen siparişler bugün teslim edilir.
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              {districts.map((d, idx) => (
                <motion.div
                  key={d.name}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.06, duration: 0.5 }}
                >
                  <Link
                    href={`/cicek-gonder/${slugify(d.name)}`}
                    className="group flex items-center justify-between px-5 py-4 rounded-[14px] transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.8)",
                      border: "1px solid rgba(139,92,246,0.08)",
                      backdropFilter: "blur(12px)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.3)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(139,92,246,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.08)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #F5F3FF, #EDE9FE)" }}
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#111827] group-hover:text-[#8B5CF6] transition-colors">{d.name}</p>
                        <p className="text-xs text-[#9CA3AF]">{d.time} teslimat</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#8B5CF6] bg-[#F5F3FF] px-2 py-1 rounded-full">{d.orders} sipariş</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#DDD6FE] group-hover:text-[#8B5CF6] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Abstract map */}
          <div className="hidden lg:block">
            <div
              className="relative overflow-hidden rounded-[32px]"
              style={{
                aspectRatio: "1",
                background: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 50%, #DDD6FE 100%)",
                boxShadow: "0 40px 100px rgba(139,92,246,0.12), 0 4px 24px rgba(0,0,0,0.06)",
              }}
            >
              {/* Decorative rings */}
              {[280, 200, 130].map((size, i) => (
                <motion.div
                  key={i}
                  animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                  transition={{ duration: 40 + i * 15, repeat: Infinity, ease: "linear" }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ width: size, height: size, border: `1px solid rgba(139,92,246,${0.12 + i * 0.06})` }}
                />
              ))}

              {/* City dots */}
              {cityDots.map((dot) => (
                <motion.div
                  key={dot.label}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: dot.delay, type: "spring", stiffness: 200 }}
                  className="absolute"
                  style={{ left: dot.x, top: dot.y }}
                >
                  {/* Ping effect */}
                  <div className="relative">
                    <span className="absolute -inset-2 rounded-full animate-ping" style={{ background: "rgba(139,92,246,0.2)", animationDuration: "2.5s" }} />
                    <div
                      className="relative w-4 h-4 rounded-full"
                      style={{ background: "linear-gradient(135deg, #8B5CF6, #A855F7)", boxShadow: "0 4px 16px rgba(139,92,246,0.5)", border: "2px solid white" }}
                    />
                  </div>
                  <div
                    className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl px-3 py-2"
                    style={{
                      background: "rgba(255,255,255,0.95)",
                      backdropFilter: "blur(12px)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(139,92,246,0.1)",
                    }}
                  >
                    <p className="text-[12px] font-bold text-[#111827]">{dot.label}</p>
                    <p className="text-[10px] text-[#8B5CF6] font-semibold">Aynı gün ✓</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
