import type { Metadata } from "next";
import GirisForm from "./GirisForm";

export const metadata: Metadata = {
  title: "Üye Girişi ve Kayıt — ÇiçekYolla",
  description: "ÇiçekYolla müşteri hesabı oluşturun; sipariş durumlarını, teslimat zamanlarını, kuponları ve sadakat puanlarını takip edin.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <GirisForm />;
}
