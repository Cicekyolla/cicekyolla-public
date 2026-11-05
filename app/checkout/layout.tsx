// EK (SEO YAYIN ZİNCİRİ): bu rota kişiye özel bir işlem sayfasıdır → arama dizinine girmez.
// Sayfa istemci bileşeni olduğu için metadata burada verilir. Kural + gerekçe: lib/privateRoutes.ts.
//
// C7 (6 Kas 2026) — /checkout ve /checkout/sonuc kabuğu müşterinin dilinde (/sepet deseni,
// app/sepet/layout.tsx). Kanıt: rota statik + önbellekliydi → `cy_lang=en` çerezli ilk HTML'de
// <title> "ÇiçekYolla | Online Çiçek Siparişi" ve "Sepetiniz hazırlanıyor…" (TR) çıkıyordu.
// Bu layout yalnız `cy_lang` çerezini okur (sayfa zaten kişiye özel; veri çekmez):
//   • TR (veya çerez yok): HİÇBİR ŞEY DEĞİŞMEZ — çocuklar aynen, metadata kökten + noindex.
//   • Global dil: <title> o dilin "co.pageTitle" metni + sözlüğü seed'lenmiş I18nProvider
//     → SSR metinleri o dilde. Akış, sipariş gövdesi ve ödeme mantığı DOKUNULMAZ.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { I18nProvider } from "@/lib/i18n";
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from "@/lib/i18n/config";
import { dictFor } from "@/lib/i18n/dicts";
import { PRIVATE_ROUTE_ROBOTS } from "@/lib/privateRoutes";

export const dynamic = "force-dynamic";

function cookieLocale(): Locale {
  const v = cookies().get(LANG_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = dictFor(cookieLocale());
  if (!dict) return { robots: PRIVATE_ROUTE_ROBOTS };
  return { title: dict["co.pageTitle"], robots: PRIVATE_ROUTE_ROBOTS };
}

export default function PrivateRouteLayout({ children }: { children: React.ReactNode }) {
  const locale = cookieLocale();
  const dict = dictFor(locale);
  if (!dict) return children;
  return (
    <I18nProvider initialLocale={locale} initialDict={dict}>
      {children}
    </I18nProvider>
  );
}
