// TELEGRAM İLETİŞİM BUTONU — TEK DAMAR
//
//   ADMIN (Ana Sayfa CMS → Hero → "İşletme Kimliği ve İletişim": telegram_enabled / telegram_username / telegram_url)
//     → API /api/public/homepage (yayın sürümü, hero.config — şema homepageValidation.ts)
//       → resolveTelegram(hero.config)  (app/layout.tsx, TR + 13 dil aynı kök layout)
//         → components/TelegramButton.tsx (yüzen buton, WhatsApp'ın yanında)
//
// Yalnız sohbet bağlantısı (https://t.me/<kullanıcı>) — bot, Telegram API, webhook YOK.
// Admin alanı boşsa yedek: @cicekyolla. Aktif/pasif yalnız Admin'den (alan yoksa aktif).
// SEO'ya (sameAs, JSON-LD, hreflang, canonical) yazılmaz.

import { isGlobalLocale, parseLocalePath } from "./global/config.ts";

export const TELEGRAM_FALLBACK = { username: "cicekyolla", url: "https://t.me/cicekyolla" } as const;

export interface TelegramContact { enabled: boolean; username: string; url: string }

const USER_RE = /^@?([A-Za-z0-9_]{5,32})$/;
const URL_RE = /^https:\/\/(t\.me|telegram\.me)\/([A-Za-z0-9_]{5,32})\/?$/i;

/** hero.config → Telegram bağlantısı. Bağlantı > kullanıcı adı > yedek. Bozuk değer yayına çıkmaz (yedeğe düşer). */
export function resolveTelegram(cfg?: Record<string, unknown> | null): TelegramContact {
  const enabled = cfg?.telegram_enabled !== false;
  const rawUser = typeof cfg?.telegram_username === "string" ? cfg.telegram_username.trim() : "";
  const rawUrl = typeof cfg?.telegram_url === "string" ? cfg.telegram_url.trim() : "";
  const userMatch = USER_RE.exec(rawUser);
  const urlMatch = URL_RE.exec(rawUrl);
  if (urlMatch) return { enabled, username: userMatch ? userMatch[1] : urlMatch[2], url: `https://t.me/${urlMatch[2]}` };
  if (userMatch) return { enabled, username: userMatch[1], url: `https://t.me/${userMatch[1]}` };
  return { enabled, username: TELEGRAM_FALLBACK.username, url: TELEGRAM_FALLBACK.url };
}

/** Sayfa diline göre erişilebilir ad (aria-label) ve kısa etiket. TR + 13 Global dil. */
export const TELEGRAM_LABELS: Record<string, { aria: string; label: string }> = {
  tr: { aria: "Telegram'dan ÇiçekYolla'ya yazın", label: "Telegram" },
  de: { aria: "ÇiçekYolla auf Telegram schreiben", label: "Telegram" },
  en: { aria: "Message ÇiçekYolla on Telegram", label: "Telegram" },
  fr: { aria: "Écrire à ÇiçekYolla sur Telegram", label: "Telegram" },
  nl: { aria: "Stuur ÇiçekYolla een bericht via Telegram", label: "Telegram" },
  it: { aria: "Scrivi a ÇiçekYolla su Telegram", label: "Telegram" },
  es: { aria: "Escribe a ÇiçekYolla por Telegram", label: "Telegram" },
  pt: { aria: "Fale com a ÇiçekYolla no Telegram", label: "Telegram" },
  az: { aria: "ÇiçekYolla-ya Telegram-da yazın", label: "Telegram" },
  ru: { aria: "Написать ÇiçekYolla в Telegram", label: "Telegram" },
  ar: { aria: "راسل ÇiçekYolla عبر تيليجرام", label: "تيليجرام" },
  zh: { aria: "通过 Telegram 联系 ÇiçekYolla", label: "Telegram" },
  ja: { aria: "Telegram で ÇiçekYolla にメッセージを送る", label: "Telegram" },
  ko: { aria: "텔레그램으로 ÇiçekYolla에 문의하기", label: "텔레그램" },
};

/** Yol → dil (yalnız etiket için). /de, /en … önekleri; diğer her yol TR. */
export function telegramLocale(pathname: string | null | undefined): string {
  const seg = String(pathname || "").split("/")[1] || "";
  return seg !== "tr" && seg in TELEGRAM_LABELS ? seg : "tr";
}

/**
 * Ürün sayfası mı? TR /urun/<slug> ve 13 dil /<dil>/<ürün-segmenti>/<slug> AYNI ProductDetail'i kullanır;
 * mobilde alta sabit "Sipariş Ver / Order Now" çubuğu vardır → Telegram onun ÜSTÜNE çıkar.
 */
export function isProductPagePath(pathname: string | null | undefined): boolean {
  const path = String(pathname || "");
  if (path.startsWith("/urun/")) return true;
  const [, locale, ...segs] = path.split("/");
  return isGlobalLocale(locale) && parseLocalePath(locale, segs.filter(Boolean)).kind === "product";
}

/**
 * Yüzen WhatsApp butonu — Global 13 dil (TR'deki buton metni/bağlantısı AYNEN kalır).
 * Bağlantı Global vitrinin mevcut WHATSAPP_URL'i ile birebir (lib/global/v80/view.ts; test eşitliği korur):
 * aynı numara, hazır metin yok — yeni sipariş akışı DEĞİL, mevcut iletişim hattı.
 */
export const GLOBAL_WHATSAPP_URL = "https://wa.me/905458813450";

export const WHATSAPP_FLOAT_LABELS: Record<string, { aria: string; label: string }> = {
  de: { aria: "ÇiçekYolla auf WhatsApp schreiben", label: "WhatsApp" },
  en: { aria: "Message ÇiçekYolla on WhatsApp", label: "WhatsApp" },
  fr: { aria: "Écrire à ÇiçekYolla sur WhatsApp", label: "WhatsApp" },
  nl: { aria: "Stuur ÇiçekYolla een bericht via WhatsApp", label: "WhatsApp" },
  it: { aria: "Scrivi a ÇiçekYolla su WhatsApp", label: "WhatsApp" },
  es: { aria: "Escribe a ÇiçekYolla por WhatsApp", label: "WhatsApp" },
  pt: { aria: "Fale com a ÇiçekYolla no WhatsApp", label: "WhatsApp" },
  az: { aria: "ÇiçekYolla-ya WhatsApp-da yazın", label: "WhatsApp" },
  ru: { aria: "Написать ÇiçekYolla в WhatsApp", label: "WhatsApp" },
  ar: { aria: "راسل ÇiçekYolla عبر واتساب", label: "واتساب" },
  zh: { aria: "通过 WhatsApp 联系 ÇiçekYolla", label: "WhatsApp" },
  ja: { aria: "WhatsApp で ÇiçekYolla にメッセージを送る", label: "WhatsApp" },
  ko: { aria: "WhatsApp으로 ÇiçekYolla에 문의하기", label: "WhatsApp" },
};
