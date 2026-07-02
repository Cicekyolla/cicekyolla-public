"use client";

/**
 * §6 OCCASION SHOPPING — ZIP Homepage.tsx birebir port.
 * Ortalı başlık ("Hangi Özel Gün İçin Arıyorsunuz?") + 6 özel gün kartı (hover zoom).
 * Adaptasyon: react-router <Link to=…> → next/link <Link href=…>. occasions verisi co-located.
 */

import Link from "next/link";
import { motion } from "motion/react";
import { SectionLabel, SectionTitle } from "./SectionHeading";

const occasions = [
  { name: "Doğum Günü", image: "https://images.unsplash.com/photo-1468327768560-75b778cbb551?w=600&h=750&fit=crop&auto=format&q=85", href: "/kategori/dogum-gunu" },
  { name: "Sevgililer Günü", image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&h=750&fit=crop&auto=format&q=85", href: "/kategori/sevgililer-gunu" },
  { name: "Anneler Günü", image: "https://images.unsplash.com/photo-1490750967868-88df5691cc8e?w=600&h=750&fit=crop&auto=format&q=85", href: "/kategori/anneler-gunu" },
  { name: "Düğün & Nişan", image: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&h=750&fit=crop&auto=format&q=85", href: "/kategori/dugun" },
  { name: "Geçmiş Olsun", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=750&fit=crop&auto=format&q=85", href: "/kategori/gecmis-olsun" },
  { name: "Mezuniyet", image: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=600&h=750&fit=crop&auto=format&q=85", href: "/kategori/mezuniyet" },
];

export function OccasionShopping() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="text-center mb-14">
          <SectionLabel>Özel Günler</SectionLabel>
          <SectionTitle>
            Hangi Özel Gün
            <br />
            İçin Arıyorsunuz?
          </SectionTitle>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
          {occasions.map((occ, idx) => (
            <motion.div
              key={occ.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.07, duration: 0.55 }}
            >
              <Link href={occ.href} className="group block">
                <div className="relative overflow-hidden rounded-[20px]" style={{ aspectRatio: "3/4" }}>
                  <motion.img
                    src={occ.image}
                    alt={occ.name}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.07 }}
                    transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.06) 55%, transparent 100%)" }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                    <p className="text-white text-[13px] font-semibold">{occ.name}</p>
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
