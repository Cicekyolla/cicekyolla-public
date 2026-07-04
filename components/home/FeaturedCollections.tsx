"use client";

/**
 * §4 FEATURED COLLECTIONS — ZIP Homepage.tsx birebir port.
 * Sol büyük kart + ortada 2 dikey kart + sağda mor "Kişiye Özel Tasarım" CTA kartı.
 * Adaptasyon: react-router <Link to=…> → next/link <Link href=…>. Görsel/etkileşim birebir.
 * collections verisi bölüme özel (ZIP top-level const) — burada co-located tutuldu.
 */

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { SectionLabel, SectionTitle } from "./SectionHeading";

// TEK KAYNAK: canlı kategori ağacından gelen vitrin kategorileri (hardcoded YOK).
type FCItem = { id: string; name: string; href: string; image: string };
export function FeaturedCollections({ items }: { items?: FCItem[] }) {
  const collections = (items ?? []).slice(0, 3);
  if (collections.length < 3) return null; // yeterli görselli kategori yoksa bölüm gizli
  return (
    <section className="py-20">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="flex items-end justify-between mb-12">
          <div>
            <SectionLabel>Koleksiyonlar</SectionLabel>
            <SectionTitle>
              Öne Çıkan
              <br />
              Koleksiyonlar
            </SectionTitle>
          </div>
          <Link
            href="/kategori/buketler"
            className="hidden md:flex items-center gap-2 text-sm text-[#8B5CF6] font-semibold hover:gap-3 transition-all"
          >
            Tümünü Gör <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr_1fr] gap-4 lg:gap-5">
          {/* Large hero card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              href={collections[0].href}
              className="group block relative overflow-hidden rounded-[24px]"
              style={{ aspectRatio: "3/4" }}
            >
              <motion.img
                src={collections[0].image}
                alt={collections[0].name}
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.04 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.08) 50%, transparent 100%)" }}
              />
              <div className="absolute bottom-0 left-0 p-8">
                <p className="text-[10px] tracking-[0.3em] text-[#C084FC] uppercase font-bold mb-2">"Koleksiyon"</p>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", lineHeight: 1.1 }} className="text-white font-semibold mb-2">
                  {collections[0].name}
                </h3>
                <span
                  className="inline-flex items-center gap-2 text-white text-xs font-semibold py-2.5 px-5 rounded-full transition-all duration-300 group-hover:bg-white group-hover:text-[#7C3AED]"
                  style={{ border: "1.5px solid rgba(255,255,255,0.35)" }}
                >
                  Keşfet <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          </motion.div>

          {/* Two smaller stacked cards */}
          <div className="grid grid-rows-2 gap-4 lg:gap-5">
            {collections.slice(1).map((col, i) => (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.12 * (i + 1), duration: 0.7 }}
              >
                <Link href={col.href} className="group block relative overflow-hidden rounded-[24px] h-full min-h-[220px]">
                  <motion.img
                    src={col.image}
                    alt={col.name}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)" }}
                  />
                  <div className="absolute bottom-0 left-0 p-6">
                    <p className="text-[10px] tracking-[0.25em] text-[#C084FC] uppercase font-bold mb-1">"Koleksiyon"</p>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem" }} className="text-white font-semibold">
                      {col.name}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Brand / CTA card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="hidden lg:flex flex-col rounded-[24px] overflow-hidden"
            style={{ background: "linear-gradient(160deg, #3B0764 0%, #6D28D9 45%, #9333EA 75%, #A855F7 100%)" }}
          >
            <div className="flex-1 p-8 flex flex-col">
              <div className="mb-auto">
                <p className="text-[10px] tracking-[0.32em] text-[#DDD6FE]/70 uppercase font-bold mb-6">Özel Hizmet</p>
                <h3
                  style={{ fontFamily: "var(--font-display)", lineHeight: 1.1, fontSize: "1.7rem" }}
                  className="text-white font-semibold mb-4"
                >
                  Kişiye Özel
                  <br />
                  Tasarım
                </h3>
                <p className="text-[#DDD6FE]/70 text-sm leading-relaxed">
                  Uzman tasarımcılarımızla tamamen size özel aranjmanlar. Her bütçeye, her duyguya.
                </p>
              </div>
              <a
                href="https://wa.me/905074413474?text=Merhaba%2C%20sipari%C5%9F%20vermek%20istiyorum"
                className="mt-8 flex items-center gap-2 py-3.5 px-6 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-colors border border-white/15"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp&apos;tan Yazın
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
