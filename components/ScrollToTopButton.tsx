"use client";

/**
 * ScrollToTopButton — "Yukarı çık" yüzen ok butonu (TR + 13 Global dil, root layout'ta tek kez).
 *
 * Yerleşim: sağ altta WhatsApp (bottom-6) ve Telegram (bottom-[84px] lg:bottom-[92px]) üstünde,
 * aynı right-6 hattında. Ürün sayfasında mobil "Sipariş Ver" çubuğu Telegram'ı 84px'e oturtur →
 * ok yine onun üstünde kalır. iPhone ev çubuğu için safe-area payı eklenir.
 *
 * Görünürlük: ~600px aşağı kaydırınca belirir (fade + scale), yukarı dönünce kaybolur. Scroll
 * dinleyicisi passive + rAF ile kısılır. Teslimat adresi / üye paneli / çerez penceresi ya da
 * çerez bandı açıkken çizilmez (yüzen butonların ortak overlay kilidi — useOverlayBusy).
 */

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useOverlayBusy } from "@/components/useOverlayBusy";

const SHOW_AFTER_PX = 600;

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const overlay = useOverlayBusy();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible(window.scrollY > SHOW_AFTER_PX);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const shown = visible && !overlay.hidden && overlay.lift === 0;

  const scrollToTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Sayfanın başına dön"
      title="Yukarı çık"
      aria-hidden={!shown}
      tabIndex={shown ? 0 : -1}
      data-scroll-top-button=""
      className={`fixed right-6 bottom-[calc(152px+env(safe-area-inset-bottom))] lg:bottom-[calc(168px+env(safe-area-inset-bottom))] z-50 flex h-11 w-11 lg:h-12 lg:w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-[opacity,transform,box-shadow] duration-200 ease-out hover:shadow-xl hover:shadow-primary/40 hover:ring-4 hover:ring-primary/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 motion-reduce:transition-none ${
        shown ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-75"
      }`}
    >
      <ArrowUp className="h-5 w-5 lg:h-6 lg:w-6" strokeWidth={2.25} aria-hidden="true" />
    </button>
  );
}
