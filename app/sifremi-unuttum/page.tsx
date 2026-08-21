import type { Metadata } from "next";
import SifremiUnuttumForm from "./SifremiUnuttumForm";

export const metadata: Metadata = {
  title: "Şifremi Unuttum",
  description:
    "ÇiçekYolla üyelik şifrenizi WhatsApp üzerinden gönderilen güvenli bağlantıyla yeniden belirleyin.",
  // Hesap akışı sayfaları arama motoruna kapalıdır (giriş sayfasıyla aynı politika).
  robots: { index: false, follow: false },
};

export default function SifremiUnuttumPage() {
  return <SifremiUnuttumForm />;
}
