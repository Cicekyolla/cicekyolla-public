"use client";

/**
 * §5b NATIONWIDE SHIPPING + DEKORASYON SPLIT — ZIP Homepage.tsx birebir.
 * İki premium özellik kartı: "Türkiye'nin Her Köşesine Çiçek" (81 il kargo) + "Mekanınızı Dönüştürün" (deko).
 * Adaptasyon: react-router <Link to=…> → next/link <Link href=…>. Görsel/hover birebir.
 */

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function FeatureSplit() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="grid md:grid-cols-2 gap-5">
          {/* Türkiye Kargo card */}
          <Link href="/kategori/turkiye-geneli-kargo" className="group block">
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-[28px]"
              style={{ aspectRatio: "16/9" }}
            >
              <img
                src="https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=1200&h=675&fit=crop&auto=format&q=88"
                alt="Türkiye Geneli Kargo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(105deg, rgba(5,0,18,0.82) 0%, rgba(15,7,60,0.5) 50%, transparent 100%)" }}
              />
              <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] tracking-[0.25em] text-green-400 uppercase font-bold">81 İle Gönderim</span>
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }} className="text-2xl lg:text-3xl font-semibold text-white mb-2">
                  Türkiye&apos;nin Her
                  <br />
                  Köşesine Çiçek
                </h3>
                <p className="text-white/60 text-sm mb-5">Bugün sipariş verin, yarın kargoda. Özel korumalı paketleme ile güvenli teslimat.</p>
                <span className="inline-flex items-center gap-2 text-sm font-bold text-white border border-white/30 rounded-full px-5 py-2.5 group-hover:bg-white group-hover:text-[#7C3AED] transition-all w-fit">
                  Kargo Ürünleri <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>
          </Link>

          {/* Dekorasyon card */}
          <Link href="/dekorasyon" className="group block">
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-[28px]"
              style={{ aspectRatio: "16/9" }}
            >
              <img
                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=675&fit=crop&auto=format&q=88"
                alt="Yapay Çiçek Dekorasyon"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(105deg, rgba(30,8,80,0.88) 0%, rgba(90,30,150,0.5) 55%, transparent 100%)" }}
              />
              <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] tracking-[0.25em] text-[#C084FC] uppercase font-bold">Yapay Çiçek &amp; Peyzaj</span>
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }} className="text-2xl lg:text-3xl font-semibold text-white mb-2">
                  Mekanınızı
                  <br />
                  Dönüştürün
                </h3>
                <p className="text-white/60 text-sm mb-5">500+ tamamlanan proje. Otel, kafe, restoran, ofis — her mekan için premium çözümler.</p>
                <span className="inline-flex items-center gap-2 text-sm font-bold text-white border border-white/30 rounded-full px-5 py-2.5 group-hover:bg-white group-hover:text-[#7C3AED] transition-all w-fit">
                  Projeleri İncele <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>
          </Link>
        </div>
      </div>
    </section>
  );
}
