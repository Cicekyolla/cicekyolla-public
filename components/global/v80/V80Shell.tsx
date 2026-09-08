// ============================================================================
// GLOBAL VERSION 80 — locale sayfalarının ortak kabuğu: tasarım sistemi kökü
// (.v80) + Version 80 başlığı + Version 80 alt bilgisi (locale-aware footer) +
// görünürlük animasyonu. TR sayfaları bu kabuğa hiç girmez (yalnız
// lib/global/page.tsx çağırır); TR Header/Footer locale rotalarında ChromeGate ile gizlidir.
// ============================================================================
import "@/lib/global/v80/v80.css";
import type { GlobalLocale } from "@/lib/global/config";
import { DIR } from "@/lib/global/config";
import type { V80FooterModel } from "@/lib/global/v80/footer";
import { V80Header, type V80HeaderProps } from "./V80Header";
import { V80Footer } from "./V80Footer";
import { V80Reveal } from "./V80Reveal";
import { V80FilterProvider } from "./V80FilterContext";

export function V80Shell({ locale, header, footer, children }: { locale: GlobalLocale; header: V80HeaderProps; footer: V80FooterModel; children: React.ReactNode }) {
  return (
    <div className="v80" lang={locale} dir={DIR[locale]}>
      <V80FilterProvider>
        <V80Header {...header} />
        {children}
      </V80FilterProvider>
      <V80Footer model={footer} />
      <V80Reveal />
    </div>
  );
}
