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
    /* KRİTİK: kimlik TIKLAMA ANINDA okunur, mount anında DEĞİL.
       GTM'in Conversion Linker'ı _gcl_aw çerezini sayfa yüklendikten kısa süre
       SONRA yazıyor. Değeri mount'ta bir kez okumak, canlıda her ziyarette BİR
       ÖNCEKİ ziyaretin gclid'ini taşıyordu (production read-back ile yakalandı).
       Tıklama anında okumak bu yarışı tamamen ortadan kaldırır ve sayfalar arası
       istemci-taraflı geçişlerde de doğru değeri verir. */
    const isle = (e: Event) => {
      const hedef = e.target as Element | null;
      const a = hedef?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;

      // Açılış sayfasında URL parametresi en taze kaynaktır; çerez ise sonraki
      // sayfalarda (parametre kaybolduğunda) devreye girer.
      const urlGclid = new URLSearchParams(window.location.search).get('gclid');
      const attr = readAdsAttribution();
      const ref = urlGclid?.slice(0, 255) || attr.gclid || attr.gbraid || attr.wbraid;
      if (!ref) return; // reklamdan gelmeyen ziyaretçide hiçbir şey değişmez

      const yeniHref = withWhatsAppRef(a.getAttribute('href') ?? '', ref, window.location.origin);
      if (yeniHref) a.href = yeniHref;
    };

    // pointerdown tıklamanın varsayılan davranışından ÖNCE çalışır; click de
    // klavye ile açılan bağlantılar için yedek. İkisi de yalnız href yazar.
    document.addEventListener('pointerdown', isle, true);
    document.addEventListener('click', isle, true);
    return () => {
      document.removeEventListener('pointerdown', isle, true);
      document.removeEventListener('click', isle, true);
    };
  }, []);

  return null;
}
