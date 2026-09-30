// ============================================================================
// ADDITIVE (Release 1 — Global Foundation): /sepet kabuğu müşterinin dilinde.
//
// Kanıt (26 Eyl 2026): /sepet statik prerender'dı → `cy_lang=en` çerezi SSR'ı
// etkileyemiyordu; ilk HTML h1 "Sepetim", <title> Türkçe, hidrasyondan sonra "My Cart".
// Bu layout yalnız `cy_lang` çerezini okur (sayfa zaten kişiye özel; veri çekmez):
//   • TR (veya çerez yok): HİÇBİR ŞEY DEĞİŞMEZ — çocuklar aynen, metadata kökten.
//   • Global dil: <title> o dilin "cart.title" metni + sözlüğü seed'lenmiş I18nProvider
//     (lib/i18n/dicts.ts) → SSR h1/etiketler o dilde. Sepet verisi/fiyat/teslimat DOKUNULMAZ.
// ============================================================================
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { I18nProvider } from "@/lib/i18n";
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, type Locale } from "@/lib/i18n/config";
import { dictFor } from "@/lib/i18n/dicts";

export const dynamic = "force-dynamic";

function cookieLocale(): Locale {
  const v = cookies().get(LANG_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = cookieLocale();
  const dict = dictFor(locale);
  // TR: kök metadata (title/description) birebir korunur.
  if (!dict) return {};
  return { title: dict["cart.title"] };
}

export default function SepetLayout({ children }: { children: React.ReactNode }) {
  const locale = cookieLocale();
  const dict = dictFor(locale);
  if (!dict) return <>{children}</>;
  return (
    <I18nProvider initialLocale={locale} initialDict={dict}>
      {children}
    </I18nProvider>
  );
}
