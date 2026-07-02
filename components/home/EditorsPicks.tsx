"use client";

/**
 * §8 EDITOR'S PICKS — Dark VIP — ZIP Homepage.tsx birebir port.
 * Koyu gradient bölüm; ortalı başlık (SectionTitle light + gradient vurgu) + 3 editör kartı.
 * Adaptasyon: react-router <Link to=…> → next/link <Link href=…>. editors verisi co-located.
 */

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { SectionLabel, SectionTitle } from "./SectionHeading";

const editors = [
  { id: 1, name: "Siyah Kutuda Kırmızı Güller", subtitle: "Editör No. 01", price: 849, badge: "Editör Seçimi", image: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=900&h=1100&fit=crop&auto=format&q=90", slug: "premium-kirmizi-guller" },
  { id: 2, name: "Peony & Ranunculus Mix", subtitle: "Editör No. 02", price: 999, badge: "Limited Edition", image: "https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=900&h=1100&fit=crop&auto=format&q=90", slug: "pembe-sakayik-buketi" },
  { id: 3, name: "Beyaz Zarafet Aranjmanı", subtitle: "Editör No. 03", price: 749, badge: "Premium", image: "https://images.unsplash.com/photo-1487530811015-780f2f5a3f48?w=900&h=1100&fit=crop&auto=format&q=90", slug: "beyaz-lale-aranjmani" },
];

export function EditorsPicks() {
  return (
    <section className="py-24" style={{ background: "linear-gradient(180deg, #0D0520 0%, #150832 100%)" }}>
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="text-center mb-14">
          <SectionLabel>VIP Koleksiyon</SectionLabel>
          <SectionTitle light>
            Özenle Küratörlenen
            <br />
            <em
              className="not-italic"
              style={{
                background: "linear-gradient(135deg, #C084FC, #E9D5FF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Editör Seçimleri
            </em>
          </SectionTitle>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {editors.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.13, duration: 0.65 }}
            >
              <Link href={`/urun/${product.slug}`} className="group block">
                <div className="relative overflow-hidden rounded-[24px] bg-[#1F0A40]" style={{ aspectRatio: "3/4" }}>
                  <motion.img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover opacity-85"
                    whileHover={{ scale: 1.05, opacity: 1 }}
                    transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.12) 50%, transparent 100%)" }}
                  />
                  {/* Badge glass pill */}
                  <div
                    className="absolute top-5 left-5 px-3 py-1.5 text-[10px] font-bold tracking-wider text-white/90 rounded-full"
                    style={{
                      background: "rgba(139,92,246,0.25)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(192,132,252,0.35)",
                    }}
                  >
                    {product.badge}
                  </div>
                  <div className="absolute bottom-0 left-0 p-7">
                    <p className="text-[10px] tracking-[0.28em] text-[#C084FC] uppercase font-bold mb-2">{product.subtitle}</p>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", lineHeight: 1.15 }} className="text-white font-semibold mb-2">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between mt-3">
                      <p style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem" }} className="text-white/90 font-semibold">
                        ₺{product.price}
                      </p>
                      <span className="flex items-center gap-1.5 text-white/60 text-xs font-medium group-hover:text-white/90 transition-colors">
                        İncele <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
