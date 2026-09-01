"use client";

/**
 * AdsWhatsAppRef — WhatsApp geçişini ölçer ve reklamdan gelen ziyaretçide
 * tıklama kimliğini karşı tarafa taşır.
 *
 * İKİ AYRI İŞ, TEK DİNLEYİCİ: (1) her WhatsApp tıklaması `whatsapp_click`
 * olayı olarak dataLayer'a yazılır — GTM bunu Google Ads "WhatsApp Sohbet"
 * dönüşümüne bağlar; (2) ziyaretçi reklamdan geldiyse hazır mesaja referans
 * eklenir. Bunlar tek yerde durur çünkü ikisi de AYNI tıklama anını ve aynı
 * "bu bir WhatsApp bağlantısı mı" kararını paylaşır.
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
import { isWhatsAppHref, readAdsAttribution, withWhatsAppRef } from "@/lib/adsAttribution";
import { pushEvent } from "@/lib/analytics";

export function AdsWhatsAppRef() {
  useEffect(() => {
    const isle = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const hedef = e.target as Element | null;
      const a = hedef?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;

      const href = a.getAttribute("href") ?? "";
      if (!isWhatsAppHref(href, window.location.origin)) return;

      // Buradan sonrası KESİN bir WhatsApp tıklamasıdır: reklamdan gelsin
      // gelmesin ölçülür. Google yalnız tıklama kimliği taşıyan oturumu kendine
      // mal edebilir; gerisi "Tüm dönüşümler"de kalıp gerçek talebi gösterir.
      const yeniSekme = a.target === "_blank";

      // Açılış sayfasında URL parametresi en taze kaynaktır; çerez ise sonraki
      // sayfalarda (parametre kaybolduğunda) devreye girer.
      const urlGclid = new URLSearchParams(window.location.search).get("gclid");
      const attr = readAdsAttribution();
      const ref = urlGclid?.slice(0, 255) || attr.gclid || attr.gbraid || attr.wbraid;

      // null dönerse referans zaten vardır ya da eklenemiyordur: her iki halde
      // de bağlantıya KARIŞMAYIZ, yalnız olayı göndeririz.
      const zenginlestirilmis = ref ? withWhatsAppRef(href, ref, window.location.origin) : null;

      if (!zenginlestirilmis) {
        // Bağlantıyı biz taşımıyoruz; tarayıcı kendi akışında gidecek.
        // Yeni sekmede sayfa ayakta kaldığı için etiket rahat çalışır; aynı
        // sekmede ise beklemek yerine olayı gönderip bırakırız — burada zaten
        // tıklama kimliği yok, yani Ads'in ilişkilendirebileceği bir şey yok.
        pushEvent("whatsapp_click");
        return;
      }

      e.preventDefault();

      if (yeniSekme) {
        // Yeni sekme kullanıcı hareketiyle AÇILMALI, yoksa engellenir. Sayfa
        // ayakta kaldığı için etiketi beklemeye gerek yok.
        const w = window.open(zenginlestirilmis, "_blank", "noopener,noreferrer");
        pushEvent("whatsapp_click");
        if (!w) window.location.href = zenginlestirilmis;
      } else {
        // Aynı sekmede gidiyoruz: önce etiketlerin çalışmasını bekle, sonra
        // git. pushEvent'in kendi zaman aşımı var; kullanıcı takılı kalmaz.
        pushEvent("whatsapp_click", {}, () => {
          window.location.href = zenginlestirilmis;
        });
      }
    };

    document.addEventListener("click", isle, true);
    return () => document.removeEventListener("click", isle, true);
  }, []);

  return null;
}
