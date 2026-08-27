"use client";

/**
 * AdsWhatsAppRef — reklamdan gelen ziyaretçinin WhatsApp geçişine tıklama
 * kimliğini taşır.
 *
 * NEDEN TEK YERDEN: sitede 17 ayrı dosyada sabit `wa.me` bağlantısı var ve
 * bunların çoğu sunucuda (SSR) üretiliyor. Tıklama kimliği ise YALNIZ
 * tarayıcıda bilinir (_gcl_aw çerezi / URL parametresi). Bu yüzden bağlantılar
 * tıklama anında, yerinde zenginleştirilir — 17 dosyayı istemci bileşenine
 * çevirmeden ve mevcut görünümü hiç değiştirmeden.
 *
 * DAVRANIŞ: yalnız `href` güncellenir; tıklamanın kendisi ENGELLENMEZ, yeni
 * sekme/hedef ayarlarına dokunulmaz. Tıklama kimliği yoksa (organik ziyaretçi,
 * pazarlama çerezi reddedilmiş) hiçbir şey yapılmaz ve bağlantı bugünkü
 * haliyle açılır.
 *
 * Yakalanan etiketi API tarafında `bridgeExtractAdsRef` ayıklar.
 */

import { useEffect } from "react";
import { readAdsAttribution, withWhatsAppRef } from "@/lib/adsAttribution";

export function AdsWhatsAppRef() {
  useEffect(() => {
    const attr = readAdsAttribution();
    const ref = attr.gclid ?? attr.gbraid ?? attr.wbraid;
    if (!ref) return; // reklamdan gelmeyen ziyaretçide hiçbir şey değişmez

    const isle = (e: Event) => {
      const hedef = e.target as Element | null;
      const a = hedef?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const yeni = withWhatsAppRef(a.getAttribute("href") ?? "", ref, window.location.origin);
      if (yeni) a.href = yeni;
    };

    // pointerdown tıklamanın varsayılan davranışından ÖNCE çalışır; click de
    // klavye ile açılan bağlantılar için yedek. İkisi de yalnız href yazar.
    document.addEventListener("pointerdown", isle, true);
    document.addEventListener("click", isle, true);
    return () => {
      document.removeEventListener("pointerdown", isle, true);
      document.removeEventListener("click", isle, true);
    };
  }, []);

  return null;
}
