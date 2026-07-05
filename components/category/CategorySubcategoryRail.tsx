"use client";

import type { CSSProperties, WheelEvent } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import useEmblaCarousel from "embla-carousel-react";
import type { CategoryItem } from "@/lib/catalog";

const STEP = 5;

function badgeClass(tag?: string): string {
  if (!tag) return "";
  const t = tag.toLocaleLowerCase("tr");
  if (t.includes("kampanya")) return "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]";
  if (t.includes("premium")) return "bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]";
  if (t.includes("yeni")) return "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]";
  if (t.includes("çok") || t.includes("satan")) return "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]";
  if (t.includes("trend")) return "bg-[#FDF2F8] text-[#BE185D] border-[#FBCFE8]";
  return "bg-white text-[#7C3AED] border-[#DDD6FE]";
}

export function CategorySubcategoryRail({
  title,
  items,
}: {
  title: string;
  items: CategoryItem[];
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: items.length > 12,
    dragFree: false,
    align: "start",
    slidesToScroll: STEP,
    duration: 18,
  });

  if (items.length === 0) return null;

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

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
    <section aria-label={`${title} alt koleksiyonları`} className="bg-white border-b border-black/[0.04]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14 py-8 lg:py-10">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-[#8B5CF6] uppercase font-bold mb-2">Alt Koleksiyonlar</p>
            <h2
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
              className="text-2xl lg:text-3xl font-semibold text-[#111827]"
            >
              {title} İçinde Keşfet
            </h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              İlgili koleksiyonları hızlıca gezin, doğru aranjmana daha kısa yoldan ulaşın.
            </p>
          </div>
          <button
            type="button"
            onClick={scrollNext}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-full text-[12px] font-bold text-[#7C3AED] bg-[#F5F3FF] border border-[#DDD6FE] hover:bg-[#EDE9FE] transition-colors"
            aria-label="Alt koleksiyonları kaydır"
          >
            Kaydır
            <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5h7M5.5 1.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="relative" onWheel={handleWheel}>
          <button
            type="button"
            aria-label="Alt koleksiyonlarda geri git"
            onClick={scrollPrev}
            className="hidden sm:flex absolute left-[-12px] top-[42%] -translate-y-1/2 z-10 w-10 h-10 rounded-full items-center justify-center text-[#4C1D95] hover:scale-105 transition-all bg-white border border-[#E5E7EB] shadow-[0_10px_30px_rgba(17,24,39,0.10)]"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button
            type="button"
            aria-label="Alt koleksiyonlarda ileri git"
            onClick={scrollNext}
            className="hidden sm:flex absolute right-[-12px] top-[42%] -translate-y-1/2 z-10 w-10 h-10 rounded-full items-center justify-center text-[#4C1D95] hover:scale-105 transition-all bg-white border border-[#E5E7EB] shadow-[0_10px_30px_rgba(17,24,39,0.10)]"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          <div ref={emblaRef} className="overflow-hidden touch-pan-y" style={{ cursor: "grab" }}>
            <div className="flex gap-4 sm:gap-5 lg:gap-6">
              {items.map((cat) => (
                <Link
                  key={cat.id}
                  href={cat.href}
                  className="flex-shrink-0 group flex flex-col items-center gap-3 select-none rounded-[28px] p-2 transition-all hover:bg-[#FAF5FF]"
                  style={{ width: "clamp(92px, 7.4vw, 126px)" }}
                  draggable={false}
                >
                  <motion.div
                    whileHover={{ y: -5, scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="relative w-full flex-shrink-0 overflow-hidden"
                    style={{
                      aspectRatio: "1",
                      borderRadius: "999px",
                      border: "1px solid rgba(139,92,246,0.12)",
                      boxShadow: "0 10px 30px rgba(124,58,237,0.10), 0 1px 0 rgba(255,255,255,0.9) inset",
                    }}
                  >
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" draggable={false} />
                    ) : (
                      <span
                        aria-hidden
                        className="w-full h-full flex items-center justify-center text-center text-white font-semibold px-2"
                        style={{
                          background: "radial-gradient(120% 120% at 30% 20%, #C084FC 0%, #8B5CF6 52%, #5B21B6 100%)",
                          fontSize: "clamp(8.5px, 0.82vw, 11.5px)",
                          lineHeight: 1.15,
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        } as CSSProperties}
                      >
                        {cat.name}
                      </span>
                    )}
                    <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: "linear-gradient(140deg, rgba(139,92,246,0.20), rgba(255,255,255,0.12))" }} />
                    {cat.tag ? (
                      <span className={`absolute left-1/2 top-1 -translate-x-1/2 max-w-[88%] truncate rounded-full border px-2 py-0.5 text-[9px] font-extrabold shadow-sm ${badgeClass(cat.tag)}`}>
                        {cat.tag}
                      </span>
                    ) : null}
                  </motion.div>

                  <div className="w-full text-center min-w-0">
                    <p
                      className="text-[#374151] group-hover:text-[#7C3AED] transition-colors font-semibold"
                      style={{
                        fontSize: "clamp(9.8px, 0.86vw, 12px)",
                        lineHeight: 1.3,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                      } as CSSProperties}
                    >
                      {cat.name}
                    </p>
                    {cat.count ? (
                      <p className="mt-1 text-[10px] font-medium text-[#9CA3AF]">
                        {cat.count} seçenek
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] font-medium text-[#A78BFA] opacity-0 group-hover:opacity-100 transition-opacity">
                        Koleksiyonu gör
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
