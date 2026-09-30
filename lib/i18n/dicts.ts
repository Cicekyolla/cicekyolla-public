// ---------------------------------------------------------------------------
// ADDITIVE (Release 1 — Global Foundation): 13 Global dilin sözlükleri SUNUCU tarafında
// statik harita. Yalnız locale kabuğu (components/global/v80/V80Shell.tsx) ve /sepet
// layout'u okur → SSR HTML'i URL dilinde çıkar. İstemci paketi bu dosyayı içe almaz;
// istemci tarafı lazy yükleme (lib/i18n/index.tsx `loaders`) aynen sürer.
// TR sayfaları bu haritaya hiç dokunmaz.
// ---------------------------------------------------------------------------
// Uzantılı import: modül hem Next (sunucu bileşenleri) hem `node --test` (strip-types) tarafından
// yüklenir — lib/global/v80/footer.ts ile aynı kalıp.
import type { Dict } from "./dict/tr.ts";
import type { Locale } from "./config.ts";
import en from "./dict/en.ts";
import ar from "./dict/ar.ts";
import zh from "./dict/zh.ts";
import nl from "./dict/nl.ts";
import de from "./dict/de.ts";
import it from "./dict/it.ts";
import ja from "./dict/ja.ts";
import pt from "./dict/pt.ts";
import ko from "./dict/ko.ts";
import ru from "./dict/ru.ts";
import es from "./dict/es.ts";
import az from "./dict/az.ts";
import fr from "./dict/fr.ts";

export const GLOBAL_DICTS: Record<Exclude<Locale, "tr">, Dict> = { en, ar, zh, nl, de, it, ja, pt, ko, ru, es, az, fr };

/** TR için undefined (kök provider TR'yi zaten taşır); Global dil için o dilin sözlüğü. */
export function dictFor(locale: Locale): Dict | undefined {
  return locale === "tr" ? undefined : GLOBAL_DICTS[locale];
}
