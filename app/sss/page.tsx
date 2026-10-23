import { permanentRedirect } from "next/navigation";

// next start + Next 14.2.5: statik (ISR) sayfa içinden yapılan yönlendirme önbelleğe alınınca
// Location başlığı OLMADAN 308 döner (Vercel bunu kendi altyapısında düzeltiyordu). Dinamik
// çizimde yönlendirme Location'la gider (23 Eki 2026, Skyversal taşıması sonrası tespit).
export const dynamic = "force-dynamic";

export default function LegacyFaqPage() {
  permanentRedirect("/sik-sorulan-sorular");
}
