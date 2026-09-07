// ============================================================================
// GLOBAL VERSION 80 — locale sayfalarının ortak kabuğu: tasarım sistemi kökü
// (.v80) + Version 80 başlığı + görünürlük animasyonu. TR sayfaları bu kabuğa
// hiç girmez (yalnız lib/global/page.tsx çağırır).
// ============================================================================
import "@/lib/global/v80/v80.css";
import type { GlobalLocale } from "@/lib/global/config";
import { DIR } from "@/lib/global/config";
import { V80Header, type V80HeaderProps } from "./V80Header";
import { V80Reveal } from "./V80Reveal";
import { V80FilterProvider } from "./V80FilterContext";

export function V80Shell({ locale, header, children }: { locale: GlobalLocale; header: V80HeaderProps; children: React.ReactNode }) {
  return (
    <div className="v80" lang={locale} dir={DIR[locale]}>
      <V80FilterProvider>
        <V80Header {...header} />
        {children}
      </V80FilterProvider>
      <V80Reveal />
    </div>
  );
}
