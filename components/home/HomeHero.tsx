"use client";

/**
 * §1 CINEMATIC HERO + §2 Floating Koleksiyonlar — ZIP Homepage.tsx birebir port.
 *
 * Adaptasyonlar (handover kuralı: react-router → next/link, interaktif kısımlar "use client"):
 * - `react-router` <Link to=…>  →  `next/link` <Link href=…>
 * - CTA butonu: <Link><motion.button> (ZIP) → geçerli HTML için <Link><motion.span> (görsel birebir aynı)
 * - Görsel, katmanlar, parallax (useScroll/useTransform), Ken Burns keyframe, glass kart AYNEN korundu.
 * - overflow:visible KORUNDU → FloatingCategoryRail (bottom:-118px) hero sınırının altına taşar.
 *
 * Tasarım token'ları globals.css'ten okunur (var(--font-display) = Fraunces). Yeni token üretilmedi.
 */

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { Truck, ArrowRight, MessageCircle, Star } from "lucide-react";
import { FloatingCategoryRail } from "./FloatingCategoryRail";

export function HomeHero() {
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroImgY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const heroTextY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);

  return (
    <>
      <section
        ref={heroRef}
        className="relative bg-[#0A0118]"
        style={{ minHeight: "min(100svh, 920px)", height: "100svh", overflow: "visible" }}
      >
        {/* Parallax image — clipped inside its own container */}
        <motion.div style={{ y: heroImgY }} className="absolute inset-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1490750967868-88df5691cc8e?w=2800&h=1800&fit=crop&auto=format&q=92"
            alt="Cinematic luxury flowers"
            className="w-full h-full object-cover"
            style={{
              transform: "scale(1.12)",
              animation: "kenburns 18s ease-in-out infinite alternate",
            }}
          />
          <style>{`
            @keyframes kenburns {
              from { transform: scale(1.14) translate(-0.8%, 0.6%); }
              to   { transform: scale(1.04) translate(0.8%, -0.5%); }
            }
          `}</style>
        </motion.div>

        {/* Layered overlays */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(5,0,20,0.82) 0%, rgba(15,7,60,0.55) 45%, rgba(0,0,0,0.18) 100%)",
            pointerEvents: "none",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 40%)",
            pointerEvents: "none",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, #8B5CF6 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />

        {/* Hero content */}
        <motion.div
          style={{ y: heroTextY, opacity: heroOpacity }}
          className="absolute inset-0 flex items-center"
        >
          <div className="max-w-[1440px] mx-auto px-6 lg:px-14 w-full">
            <div className="max-w-[660px]">
              {/* Live badge */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2.5 mb-9"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "100px",
                  padding: "8px 16px",
                }}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                </span>
                <span className="text-white/80 text-[11px] tracking-[0.18em] uppercase font-medium">
                  Aynı Gün Teslimat Aktif
                </span>
              </motion.div>

              {/* Display headline */}
              <motion.h1
                initial={{ opacity: 0, y: 36 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontFamily: "var(--font-display)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.02em",
                }}
                className="text-[3.8rem] sm:text-[5rem] lg:text-[6.5rem] font-semibold text-white mb-7"
              >
                Her Duygu
                <br />
                <em
                  className="not-italic"
                  style={{
                    background:
                      "linear-gradient(135deg, #C084FC 0%, #E9D5FF 50%, #C084FC 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Bir Çiçekle
                </em>
                <br />
                Anlam Kazanır
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.7 }}
                className="text-white/60 text-lg leading-relaxed mb-10 max-w-[460px]"
              >
                Türkiye&apos;nin en prestijli çiçek markası. Özenle seçilmiş premium
                aranjmanlar, zarif paketleme, aynı gün teslimat.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link href="/kategori/buketler" className="inline-block">
                  <motion.span
                    whileHover={{ scale: 1.04, y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center justify-center gap-3 px-9 py-4 rounded-full text-white font-semibold text-sm tracking-wide"
                    style={{
                      background:
                        "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)",
                      boxShadow:
                        "0 12px 40px rgba(139,92,246,0.55), 0 0 0 1px rgba(255,255,255,0.08)",
                    }}
                  >
                    Koleksiyonu Keşfet
                    <ArrowRight className="w-4 h-4" />
                  </motion.span>
                </Link>
                <motion.a
                  whileHover={{ scale: 1.03 }}
                  href="https://wa.me/905551234567"
                  className="flex items-center justify-center gap-3 px-9 py-4 rounded-full text-white/90 text-sm font-semibold transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp Sipariş
                </motion.a>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Floating glass card — bottom right */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="absolute bottom-10 right-6 lg:right-14 hidden md:block"
          style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "20px",
            padding: "20px 24px",
            boxShadow: "0 16px 64px rgba(0,0,0,0.3)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #A855F7)" }}
            >
              <Truck className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Aynı Gün Teslimat</p>
              <p className="text-white/50 text-xs">14:00&apos;a kadar sipariş ver</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
            ))}
            <span className="text-white/50 text-xs ml-1.5">4.9 · 2.400+ yorum</span>
          </div>
        </motion.div>

        {/* ── §2 CATEGORY CAROUSEL — hero içinde, absolute bottom ──
            overflow:visible section sayesinde hero görselinin altına taşar.
            Alttaki beyaz alan cam kartın alt yarısının arkasında görünür → gerçek %40-50 overlap. */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-0 right-0 z-30"
          style={{ bottom: "-118px" }}
        >
          <FloatingCategoryRail />
        </motion.div>
      </section>

      {/* GEÇİCİ — rail bottom:-118px taşmasını karşılayan beyaz zemin (overlap'in beyaz arkası).
          §3 trust/USP bandı (paddingTop:142px) geldiğinde bu div KALDIRILACAK; o bant rail'i yakalayacak. */}
      <div aria-hidden className="bg-white" style={{ height: "142px" }} />
    </>
  );
}
