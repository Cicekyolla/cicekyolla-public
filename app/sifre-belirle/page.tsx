import type { Metadata } from "next";
import SifreBelirleForm from "./SifreBelirleForm";

export const metadata: Metadata = {
  title: "Şifre Belirle",
  description: "ÇiçekYolla üyelik hesabınız için yeni şifrenizi belirleyin.",
  // Tek kullanımlık token taşıyan sayfa; arama motoruna kesinlikle kapalı.
  robots: { index: false, follow: false },
};

export default function SifreBelirlePage() {
  return <SifreBelirleForm />;
}
