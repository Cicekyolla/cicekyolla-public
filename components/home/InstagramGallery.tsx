"use client";

/**
 * §11 INSTAGRAM GALLERY — ZIP Homepage.tsx birebir port.
 * Başlık (@cicekyolla) + Takip Et + 8 görsel grid (hover'da mor overlay + Instagram ikonu).
 * instagramPosts verisi co-located.
 */

import { motion } from "motion/react";
import { Instagram } from "lucide-react";
import { SectionLabel } from "./SectionHeading";

const instagramPosts = [
  "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&h=600&fit=crop&auto=format&q=85",
  "https://images.unsplash.com/photo-1490750967868-88df5691cc8e?w=600&h=600&fit=crop&auto=format&q=85",
  "https://images.unsplash.com/photo-1612968550885-5d1cf8a0c39f?w=600&h=600&fit=crop&auto=format&q=85",
  "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&h=600&fit=crop&auto=format&q=85",
  "https://images.unsplash.com/photo-1487530811015-780f2f5a3f48?w=600&h=600&fit=crop&auto=format&q=85",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop&auto=format&q=85",
  "https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=600&h=600&fit=crop&auto=format&q=85",
  "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=600&h=600&fit=crop&auto=format&q=85",
];

export function InstagramGallery() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14">
        <div className="flex items-center justify-between mb-9">
          <div>
            <SectionLabel>Instagram</SectionLabel>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem" }} className="font-semibold text-[#111827]">
              @cicekyolla
            </h3>
          </div>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#8B5CF6] font-semibold hover:gap-3 transition-all"
          >
            <Instagram className="w-4 h-4" />
            Takip Et
          </a>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 lg:gap-3">
          {instagramPosts.map((src, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.04 }}
              className="group relative overflow-hidden rounded-xl lg:rounded-[14px] cursor-pointer"
              style={{ aspectRatio: "1" }}
            >
              <motion.img
                src={src}
                alt="Instagram"
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "rgba(139,92,246,0.4)", backdropFilter: "blur(2px)" }}
              >
                <Instagram className="w-6 h-6 text-white" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
