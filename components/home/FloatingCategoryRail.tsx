"use client";

/**
 * Floating glassmorphism category rail — ZIP Homepage.tsx / FloatingCategoryRail birebir port.
 * Hero'nun içinde (overflow:visible section) yaşar; bottom:-118px ile hero sınırının altına taşar.
 *
 * Adaptasyon: react-router <Link to=…> → next/link <Link href=…>. Görsel/etkileşim birebir.
 * Gereksinim: embla-carousel-react (package.json dependencies'e eklenecek).
 */

import { type CSSProperties, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import useEmblaCarousel from "embla-carousel-react";
import { categoryBadges, type CategoryItem } from "./homeData";

export function FloatingCategoryRail({
  items,
  variant = "dark",
  label = "Koleksiyonlar",
}: {
  items?: CategoryItem[];
  variant?: "dark" | "light";
  label?: string;
}) {
  const light = variant === "light";
  const t = {
    container: light
      ? "rgba(250,248,255,0.92)"
      : "rgba(6, 2, 18, 0.82)",
    border: light ? "1px solid rgba(124,58,237,0.14)" : "1px solid rgba(255,255,255,0.13)",
    shadow: light
      ? "0 12px 40px rgba(124,58,237,0.08), 0 2px 8px rgba(0,0,0,0.04)"
      : ["0 40px 120px rgba(0,0,0,0.65)", "0 8px 32px rgba(0,0,0,0.4)", "0 1px 0 rgba(255,255,255,0.12) inset", "0 -1px 0 rgba(255,255,255,0.03) inset"].join(", "),
    labelText: light ? "text-[#7C3AED]" : "text-white/45",
    hintText: light ? "text-[#9CA3AF]" : "text-white/22",
    arrowBg: light ? "rgba(255,255,255,0.95)" : "rgba(20,10,40,0.85)",
    arrowBorder: light ? "1px solid rgba(124,58,237,0.2)" : "1px solid rgba(255,255,255,0.18)",
    arrowText: light ? "text-[#7C3AED]" : "text-white/90 hover:text-white",
    nameText: light ? "text-[#374151] group-hover:text-[#7C3AED]" : "text-white/72 group-hover:text-white",
    countText: light ? "text-[#9CA3AF]" : "text-white/25",
  };
  // TEK KAYNAK: yalnız canlı kategori ağacından gelen items; hardcoded/fallback YOK.
  const cats = items ?? [];
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, dragFree: true, align: "start", containScroll: "trimSnaps" });
  const router = useRouter();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const onSelect = useCallback((api: NonNullable<typeof emblaApi>) => {
    setCanPrev(api.canScrollPrev());
    setCanNext(api.canScrollNext());
  }, []);
  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on("select", onSelect).on("reInit", onSelect);
    return () => { emblaApi.off("select", onSelect).off("reInit", onSelect); };
  }, [emblaApi, onSelect]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  if (cats.length === 0) return null;

  return (
    <div className="w-full overflow-x-hidden">
      {/* Upgraded glass card — deeper blur, stronger shadow, refined border */}
      <div
        className="mx-4 sm:mx-6 lg:mx-14 rounded-[32px] px-5 sm:px-7 pt-5 pb-6"
        style={{
          background: t.container,
          backdropFilter: "blur(48px) saturate(220%) brightness(1.05)",
          WebkitBackdropFilter: "blur(48px) saturate(220%) brightness(1.05)",
          border: t.border,
          boxShadow: t.shadow,
        }}
      >
        {/* Label row */}
        <div className="flex items-center gap-2.5 mb-4">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C084FC] flex-shrink-0" />
          <span className={`${t.labelText} text-[10px] tracking-[0.3em] uppercase font-semibold`}>{label}</span>
          <span className={`ml-auto flex items-center gap-1 ${t.hintText} text-[9px] tracking-wide`}>
            Kaydır
            <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5h7M5.5 1.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>

        {/* Embla carousel + ileri/geri ok butonları (drag/scroll da çalışır) */}
        <div className="relative">
          <button
            type="button"
            aria-label="Geri kaydır"
            onClick={scrollPrev}
            disabled={!canPrev}
            className={`hidden sm:flex absolute left-[-10px] top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full items-center justify-center ${t.arrowText} transition-all ${canPrev ? "opacity-100 cursor-pointer" : "opacity-0 pointer-events-none"}`}
            style={{ background: t.arrowBg, border: t.arrowBorder, backdropFilter: "blur(8px)" }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button
            type="button"
            aria-label="İleri kaydır"
            onClick={scrollNext}
            disabled={!canNext}
            className={`hidden sm:flex absolute right-[-10px] top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full items-center justify-center ${t.arrowText} transition-all ${canNext ? "opacity-100 cursor-pointer" : "opacity-0 pointer-events-none"}`}
            style={{ background: t.arrowBg, border: t.arrowBorder, backdropFilter: "blur(8px)" }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div ref={emblaRef} className="overflow-hidden" style={{ cursor: "grab" }}>
            <div className="flex gap-4 sm:gap-5 lg:gap-6">
            {cats.map((cat) => {
              const badge = categoryBadges[cat.id];
              return (
                <Link
                  key={cat.id}
                  href={cat.href}
                  onClick={(e) => { e.preventDefault(); router.push(cat.href); }}
                  className="flex-shrink-0 group flex flex-col items-center gap-2.5 select-none"
                  style={{ width: "clamp(64px, 8.6vw, 87px)" }}
                  draggable={false}
                >
                  {/* Circle image — hover glow via CSS group-hover, no DOM mutation */}
                  <motion.div
                    whileHover={{ y: -6, scale: 1.1 }}
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
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-112"
                        draggable={false}
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="w-full h-full flex items-center justify-center text-center text-white font-semibold px-1.5"
                        style={{
                          background: "radial-gradient(120% 120% at 30% 20%, #A855F7 0%, #7C3AED 55%, #5B21B6 100%)",
                          fontSize: "clamp(8px, 0.95vw, 10.5px)",
                          lineHeight: 1.2,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
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
                      className={`${t.nameText} transition-colors duration-200 font-semibold`}
                      style={{
                        fontSize: "clamp(9px, 1vw, 11px)",
                        lineHeight: 1.35,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                      } as CSSProperties}
                    >
                      {cat.name}
                    </p>
                    {cat.count && (
                      <p
                        className={`${t.countText} mt-0.5`}
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
    </div>
  );
}
