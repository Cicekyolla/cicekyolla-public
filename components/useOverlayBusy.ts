"use client";

/**
 * Yüzen iletişim butonları (WhatsApp + Telegram) ve açık pencereler — mevcut tek overlay kilidini
 * (ConsentManager acquireOverlay/onOverlayChange) okur; yeni sistem DEĞİL.
 *
 *  - Çerez BANDI açıkken butonlar GİZLENMEZ: ziyaretçi bandı kapatmasa da iletişim butonları görünür
 *    kalır; bant ekranın altını kapladığı için butonlar bandın yüksekliği kadar YUKARI kayar (lift).
 *    (Önceki sürüm bant açıkken gizliyordu → karar vermeyen ziyaretçi butonları HİÇ görmüyordu.)
 *  - Teslimat adresi / üye paneli / çerez tercihleri / bildirim penceresi açıkken: gizli (hidden),
 *    pencere kapanınca geri gelir.
 */
import { useEffect, useState } from "react";
import { onOverlayChange, overlayBusy } from "@/components/consent/ConsentManager";

export function useOverlayBusy(): { hidden: boolean; lift: number } {
  const [state, setState] = useState({ hidden: false, lift: 0 });
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const measure = () => {
      if (!overlayBusy()) return { hidden: false, lift: 0 };
      // Kilit "cookie"de: bant görünüyorsa üstüne çık; tercih penceresi (bant yok) ise gizle.
      if (!overlayBusy("cookie")) {
        const bands = Array.from(document.querySelectorAll<HTMLElement>("[data-cookie-banner]"));
        const tops = bands.map((b) => b.getBoundingClientRect()).filter((r) => r.height > 0).map((r) => r.top);
        if (tops.length) return { hidden: false, lift: Math.max(0, Math.round(window.innerHeight - Math.min(...tops))) };
      }
      return { hidden: true, lift: 0 };
    };
    const refresh = () => {
      const next = measure();
      setState((prev) => (prev.hidden === next.hidden && prev.lift === next.lift ? prev : next));
      // Bant giriş animasyonu/ekran boyu değişirken ölçüm güncel kalsın; kilit boşalınca durur.
      if (overlayBusy() && !timer) timer = setInterval(refresh, 250);
      if (!overlayBusy() && timer) { clearInterval(timer); timer = null; }
    };
    refresh();
    const unsub = onOverlayChange(refresh);
    window.addEventListener("resize", refresh);
    return () => { unsub(); window.removeEventListener("resize", refresh); if (timer) clearInterval(timer); };
  }, []);
  return state;
}
