"use client";

/**
 * Floating glassmorphism category rail — ZIP Homepage.tsx / FloatingCategoryRail birebir port.
 * Hero'nun içinde (overflow:visible section) yaşar; bottom:-118px ile hero sınırının altına taşar.
 *
 * Adaptasyon: react-router <Link to=…> → next/link <Link href=…>. Görsel/etkileşim birebir.
 * Gereksinim: embla-carousel-react (package.json dependencies'e eklenecek).
 */

import type { CSSProperties } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import useEmblaCarousel from "embla-carousel-react";
import { categoryBadges, type CategoryItem } from "./homeData";

export function FloatingCategoryRail({ items }: { items?: CategoryItem[] }) {
  // TEK KAYNAK: yalnız canlı kategori ağacından gelen items; hardcoded/fallback YOK.
  const cats = items ?? [];
  const [emblaRef] = useEmblaCarousel({ loop: false, dragFree: true, align: "start" });
  if (cats.length === 0) return null;

  return (
    <div className="w-full overflow-x-hidden">
      {/* Upgraded glass card — deeper blur, stronger shadow, refined border */}
      <div
        className="mx-4 sm:mx-6 lg:mx-14 rounded-[32px] px-5 sm:px-7 pt-5 pb-6"
        style={{
          background: "rgba(6, 2, 18, 0.82)",
          backdropFilter: "blur(48px) saturate(220%) brightness(1.05)",
          WebkitBackdropFilter: "blur(48px) saturate(220%) brightness(1.05)",
          border: "1px solid rgba(255,255,255,0.13)",
          boxShadow: [
            "0 40px 120px rgba(0,0,0,0.65)",
            "0 8px 32px rgba(0,0,0,0.4)",
            "0 1px 0 rgba(255,255,255,0.12) inset",
            "0 -1px 0 rgba(255,255,255,0.03) inset",
          ].join(", "),
        }}
      >
        {/* Label row */}
        <div className="flex items-center gap-2.5 mb-4">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C084FC] flex-shrink-0" />
          <span className="text-white/45 text-[10px] tracking-[0.3em] uppercase font-semibold">Koleksiyonlar</span>
          <span className="ml-auto flex items-center gap-1 text-white/22 text-[9px] tracking-wide">
            Kaydır
            <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5h7M5.5 1.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>

        {/* Embla carousel */}
        <div ref={emblaRef} className="overflow-hidden" style={{ cursor: "grab" }}>
          <div className="flex gap-4 sm:gap-5 lg:gap-6">
            {cats.map((cat) => {
              const badge = categoryBadges[cat.id];
              return (
                <Link
                  key={cat.id}
                  href={cat.href}
                  className="flex-shrink-0 group flex flex-col items-center gap-2.5 select-none"
                  style={{ width: "clamp(64px, 8.6vw, 87px)" }}
                  draggable={false}
                >
                  {/* Circle image — hover glow via CSS group-hover, no DOM mutation */}
                  <motion.div
                    whileHover={{ y: -6, scale: 1.1 }}
                    whileTap={{ scale: 0.91 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="relative w-full flex-shrink-0 overflow-hidden cat-circle"
                    style={{
                      aspectRatio: "1",
                      borderRadius: "50%",
                      boxShadow: "0 8px 28px rgba(0,0,0,0.6), 0 0 0 1.5px rgba(255,255,255,0.12)",
                    }}
                  >
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-112"
                        draggable={false}
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="w-full h-full flex items-center justify-center text-white/90 text-[11px] font-bold text-center px-1 leading-tight"
                        style={{ background: "linear-gradient(140deg, #7C3AED, #A855F7)" }}
                      >
                        {cat.name}
                      </span>
                    )}
                    {/* Hover purple sheen */}
                    <span
                      className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-350"
                      style={{ background: "linear-gradient(140deg, rgba(139,92,246,0.48), rgba(168,85,247,0.28))" }}
                    />
                    {/* Emoji badge */}
                    {badge && (
                      <span
                        className="absolute -top-0.5 -right-0.5 rounded-full flex items-center justify-center shadow-lg border border-white/25 text-[9px] font-bold"
                        style={{ background: badge.color, lineHeight: 1, width: "19px", height: "19px" }}
                        title={badge.label}
                      >
                        {badge.emoji}
                      </span>
                    )}
                  </motion.div>

                  {/* Name + count */}
                  <div className="text-center w-full min-w-0">
                    <p
                      className="text-white/72 group-hover:text-white transition-colors duration-200 font-semibold"
                      style={{
                        fontSize: "clamp(9px, 1vw, 11px)",
                        lineHeight: 1.35,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      } as CSSProperties}
                    >
                      {cat.name}
                    </p>
                    {cat.count && (
                      <p
                        className="text-white/25 mt-0.5"
                        style={{ fontSize: "clamp(7px, 0.82vw, 9px)" }}
                      >
                        {cat.count}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
