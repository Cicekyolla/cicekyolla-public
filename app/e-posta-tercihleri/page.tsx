import type { Metadata } from "next";
import EPostaTercihleriForm from "./EPostaTercihleriForm";
import { unsubscribeTokenStripScript } from "@/lib/emailPreferences";

export const metadata: Metadata = {
  title: "E-posta Tercihleri",
  description: "ÇiçekYolla kampanya e-postalarından çıkış.",
  // Kişiye özel jeton taşıyan sayfa; arama motoruna kapalı.
  robots: { index: false, follow: false },
};

/* Jeton taşıyan sayfa önbelleğe alınmaz (Referrer-Policy, Cache-Control ve
   X-Robots-Tag başlıkları next.config.js::headers() içinde bu yola tanımlıdır). */
export const dynamic = "force-dynamic";

/**
 * KAMPANYA E-POSTASINDAN ÇIKIŞ (DESIGN §3.G.2) — mail gövdesindeki
 * "Abonelikten çık" bağlantısı: `/e-posta-tercihleri#t=<jeton>`.
 *
 * Sayfa açılırken HİÇBİR ŞEY YAZILMAZ (posta tarayıcıları bağlantıyı önden
 * çeker); yalnız maskeli adres ve durum okunur. Çıkış, kişinin "Aboneliği
 * bırak" düğmesine basmasıyla POST edilir.
 */
export default function EPostaTercihleriPage() {
  return (
    <>
      {/*
        JETON TEMİZLİĞİ — sayfanın ilk çalışan script'i (lib/resetToken.ts ile
        aynı gerekçe): jeton GTM'in ilk page_view'ı `page_location`'a yazmadan
        önce adres çubuğundan silinir ve bir global'e taşınır.
      */}
      <script dangerouslySetInnerHTML={{ __html: unsubscribeTokenStripScript() }} />
      <EPostaTercihleriForm />
    </>
  );
}
