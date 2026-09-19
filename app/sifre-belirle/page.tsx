import type { Metadata } from "next";
import SifreBelirleForm from "./SifreBelirleForm";
import { resetTokenStripScript } from "@/lib/resetToken";

export const metadata: Metadata = {
  title: "Şifre Belirle",
  description: "ÇiçekYolla üyelik hesabınız için yeni şifrenizi belirleyin.",
  // Tek kullanımlık token taşıyan sayfa; arama motoruna kesinlikle kapalı.
  robots: { index: false, follow: false },
};

/* Token taşıyan sayfa önbelleğe alınmaz (Referrer-Policy ve Cache-Control
   başlıkları next.config.js::headers() içinde bu yola tanımlıdır). */
export const dynamic = "force-dynamic";

export default function SifreBelirlePage() {
  return (
    <>
      {/*
        TOKEN TEMİZLİĞİ (DESIGN §3.A.9) — sayfanın İLK çalışan script'i.

        Bağlantıdaki tek kullanımlık token'ı bir global'e taşıyıp adres
        çubuğundan siler. Neden React effect'i değil: GTM `beforeInteractive`
        olarak `<head>`'e gtm.js'i ASENKRON enjekte ediyor; ilk `page_view`
        hidrasyonu beklemez. Effect'e bırakılsa token GA4'ün `page_location`
        alanına düşebilirdi. Bu script HTML ayrıştırma sırasında, React
        yüklenmeden çalışır.

        `<head>` daha da erken olurdu ama layout.tsx bu fazın sahiplik
        listesinde değil; gövdenin en başı, elimizdeki en erken noktadır.
      */}
      <script dangerouslySetInnerHTML={{ __html: resetTokenStripScript() }} />
      <SifreBelirleForm />
    </>
  );
}
