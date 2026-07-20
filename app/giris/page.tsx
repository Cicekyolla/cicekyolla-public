import type { Metadata } from "next";
import GirisForm from "./GirisForm";

export const metadata: Metadata = {
  title: "Üye Girişi ve Kayıt — ÇiçekYolla",
  description: "ÇiçekYolla müşteri hesabı oluşturun, siparişlerinizi takip edin, adreslerinizi ve özel gün hatırlatmalarınızı yönetin.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <GirisForm />;
}
