"use client";

import type { CSSProperties, WheelEvent } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import useEmblaCarousel from "embla-carousel-react";
import { categoryBadges, type CategoryItem } from "./homeData";

const STEP = 5;

export function FloatingCategoryRail({ items }: { items?: CategoryItem[] }) {
  const cats = items ?? [];
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: cats.length > 12,
    dragFree: false,
    align: "start",
    slidesToScroll: STEP,
    duration: 18,
  });
  if (cats.length === 0) return null;

  const scrollPrevFast = () => emblaApi?.scrollPrev();
  const scrollNextFast = () => emblaApi?.scrollNext();

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!emblaApi) return;
    const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
    if (!horizontalIntent) return;
    event.preventDefault();
    const delta = event.deltaX || event.deltaY;
    if (delta > 0) emblaApi.scrollNext();
    if (delta < 0) emblaApi.scrollPrev();
  };

  return (
    <div className="w-full overflow-x-hidden">
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
        <div className="flex items-center gap-2.5 mb-4">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C084FC] flex-shrink-0" />
          <span className="text-white/45 text-[10px] tracking-[0.3em] uppercase font-semibold">Koleksiyonlar</span>
          <button
            type="button"
            onClick={scrollNextFast}
            className="ml-auto flex items-center gap-1 text-white/45 hover:text-white text-[9px] tracking-wide transition-colors"
            aria-label="Koleksiyonları hızlı kaydır"
          >
            Kaydır
            <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5h7M5.5 1.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="relative" onWheel={handleWheel}>
          <button
            type="button"
            aria-label="Geri hızlı kaydır"
            onClick={scrollPrevFast}
            className="hidden sm:flex absolute left-[-10px] top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full items-center justify-center text-white/90 hover:text-white hover:scale-105 transition-all"
            style={{ background: "rgba(20,10,40,0.9)", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(8px)" }}
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button
            type="button"
            aria-label="İleri hızlı kaydır"
            onClick={scrollNextFast}
            className="hidden sm:flex absolute right-[-10px] top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full items-center justify-center text-white/90 hover:text-white hover:scale-105 transition-all"
            style={{ background: "rgba(20,10,40,0.9)", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(8px)" }}
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          <div ref={emblaRef} className="overflow-hidden touch-pan-y" style={{ cursor: "grab" }}>
            <div className="flex gap-4 sm:gap-5 lg:gap-6">
              {cats.map((cat) => {
                const badge = categoryBadges[cat.id];
                return (
                  <Link
                    key={cat.id}
                    href={cat.href}
                    className="flex-shrink-0 group flex flex-col items-center gap-2.5 select-none"
                    style={{ width: "clamp(82px, 7.2vw, 112px)" }}
                    draggable={false}
                  >
                    <motion.div
                      whileHover={{ y: -6, scale: 1.07 }}
                      whileTap={{ scale: 0.94 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="relative w-full flex-shrink-0 overflow-hidden cat-circle"
                      style={{
                        aspectRatio: "1",
                        borderRadius: "50%",
                        boxShadow: "0 8px 28px rgba(0,0,0,0.6), 0 0 0 1.5px rgba(255,255,255,0.12)",
                      }}
                    >
                      {cat.image ? (
                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-112" draggable={false} />
                      ) : (
                        <span
                          aria-hidden
                          className="w-full h-full flex items-center justify-center text-center text-white font-semibold px-2"
                          style={{
                            background: "radial-gradient(120% 120% at 30% 20%, #A855F7 0%, #7C3AED 55%, #5B21B6 100%)",
                            fontSize: "clamp(9px, 0.86vw, 12px)",
                            lineHeight: 1.15,
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {cat.name}
                        </span>
                      )}
                      <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: "linear-gradient(140deg, rgba(139,92,246,0.48), rgba(168,85,247,0.28))" }} />
                      {badge && (
                        <span className="absolute -top-0.5 -right-0.5 rounded-full flex items-center justify-center shadow-lg border border-white/25 text-[9px] font-bold" style={{ background: badge.color, lineHeight: 1, width: "19px", height: "19px" }} title={badge.label}>
                          {badge.emoji}
                        </span>
                      )}
                    </motion.div>

                    <div className="text-center w-full min-w-0">
                      <p
                        className="text-white/72 group-hover:text-white transition-colors duration-200 font-semibold"
                        style={{
                          fontSize: "clamp(9.5px, 0.9vw, 12px)",
                          lineHeight: 1.3,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                        } as CSSProperties}
                      >
                        {cat.name}
                      </p>
                      {cat.count && <p className="text-white/25 mt-0.5" style={{ fontSize: "clamp(7px, 0.82vw, 9px)" }}>{cat.count}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
