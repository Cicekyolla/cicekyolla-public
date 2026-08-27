"use client";

/**
 * AdsWhatsAppRef — reklamdan gelen ziyaretçinin WhatsApp geçişine tıklama
 * kimliğini taşır.
 *
 * NEDEN TEK YERDEN: sitede 17 ayrı dosyada sabit `wa.me` bağlantısı var ve
 * bunların çoğu sunucuda (SSR) üretiliyor. Tıklama kimliği ise YALNIZ
 * tarayıcıda bilinir (_gcl_aw çerezi / URL parametresi).
 *
 * NEDEN href YAZMIYORUZ (27 Ağu 2026 canlı bulgusu):
 * İlk sürüm tıklama anında `a.href` değerini güncelliyordu. Bu, React'in
 * yönettiği bir attribute'tur — bileşen yeniden render edildiği anda React
 * kendi değerini geri yazar ve referans silinir. Gerçek dokunuşta bu KESİN
 * olarak oluyor: yüzen buton `motion.a` + `whileTap` (WhatsApp Button) ve
 * ürün sayfası bağlantısının metni `window.location.href` içerdiği için
 * (ProductDetail) dokunuş/hidrasyon anında yeniden render tetikleniyor.
 * Sentetik olay göndererek yapılan testlerde bu jest hiç çalışmadığı için
 * ölçüm YANLIŞ PASS veriyordu; gerçek telefonda mesaj hep referanssız gitti.
 *
 * Bu yüzden artık attribute'a hiç dokunulmuyor: tıklama yakalanır, varsayılan
 * davranış iptal edilir ve zenginleştirilmiş adrese BİZ gideriz. Böylece
 * React'in ne zaman render ettiği önemsizleşir.
 */

import { useEffect } from "react";
import { readAdsAttribution, withWhatsAppRef } from "@/lib/adsAttribution";

export function AdsWhatsAppRef() {
  useEffect(() => {
    const isle = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const hedef = e.target as Element | null;
      const a = hedef?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;

      // Açılış sayfasında URL parametresi en taze kaynaktır; çerez ise sonraki
      // sayfalarda (parametre kaybolduğunda) devreye girer.
      const urlGclid = new URLSearchParams(window.location.search).get("gclid");
      const attr = readAdsAttribution();
      const ref = urlGclid?.slice(0, 255) || attr.gclid || attr.gbraid || attr.wbraid;
      if (!ref) return; // reklamdan gelmeyen ziyaretçide hiçbir şey değişmez

      // null dönerse WhatsApp bağlantısı değildir ya da referans zaten vardır:
      // her iki halde de tıklamaya KARIŞMAYIZ.
      const zenginlestirilmis = withWhatsAppRef(a.getAttribute("href") ?? "", ref, window.location.origin);
      if (!zenginlestirilmis) return;

      e.preventDefault();
      const yeniSekme = a.target === "_blank";
      if (yeniSekme) {
        // Kullanıcı hareketiyle tetiklendiği için engellenmez; yine de
        // açılamazsa aynı sekmede devam ederiz — tıklama asla ölü kalmaz.
        const w = window.open(zenginlestirilmis, "_blank", "noopener,noreferrer");
        if (!w) window.location.href = zenginlestirilmis;
      } else {
        window.location.href = zenginlestirilmis;
      }
    };

    document.addEventListener("click", isle, true);
    return () => document.removeEventListener("click", isle, true);
  }, []);

  return null;
}
