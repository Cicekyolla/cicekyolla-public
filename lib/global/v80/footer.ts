// ============================================================================
// GLOBAL VERSION 80 — locale alt bilgi (footer) görünüm modeli (SAF; test edilir).
// Figma Version 80 footer'ı: yolculuk satırı · marka · MAĞAZA · YARDIM · TESLİMAT ·
// TAKİP · İLETİŞİM · alt şerit. TR footer'a DOKUNULMAZ (o TR rotalarında aynen).
//
// Gerçek damarlar: kategoriler (o dilde CANLI kategoriler, locale href), teslimat
// şehirleri (yalnız o dilde APPROVED şehir kökü), iletişim (TR footer ile AYNI
// kaynak: yayımlı ana sayfa hero yapılandırması), WhatsApp/sosyal (mevcut hesaplar).
// KURAL: locale zinciri korunur — her iç bağlantı /<locale>/… ile başlar; TR legal
// sayfalarına düşülmez; hedefi olmayan link basılmaz (sahte düğme yok).
// ============================================================================
import { DIR, type GlobalLocale } from "../config.ts";
import { CITY_NAMES } from "../locationLabels.ts";
import { V80_DESTINATIONS, type V80Destination } from "./schema.ts";
import { interp } from "./text.ts";

/** Mevcut gerçek sosyal hesaplar (components/Footer.tsx ile aynı). */
export const V80_SOCIAL = [
  { key: "instagram", label: "Instagram", href: "https://www.instagram.com/cicekyolla/" },
  { key: "facebook", label: "Facebook", href: "https://www.facebook.com/cicekyolla" },
] as const;

export interface V80FooterInput {
  locale: GlobalLocale;
  texts: Record<string, string>;
  /** O dilde canlı kategoriler (locale href ile) — en fazla 6 basılır. */
  categories: { name: string; href: string }[];
  allHref: string | null;
  /** O dilde APPROVED şehir kökleri (istanbul/antalya/mugla/izmir). */
  liveDestinations: readonly string[];
  contact: { phone: string; email: string };
  whatsapp: string;
  isHome: boolean;
  hasFaq?: boolean;
  year?: number;
}
export interface V80FooterLink { key: string; label: string; href: string; external?: boolean }
export interface V80FooterColumn { key: "shop" | "help" | "deliver" | "follow"; title: string; links: V80FooterLink[] }
export interface V80FooterModel {
  locale: GlobalLocale;
  dir: "ltr" | "rtl";
  homeHref: string;
  brand: string;
  journey: string;
  tagline1: string;
  tagline2: string;
  since: string;
  columns: V80FooterColumn[];
  contact: { title: string; phone: string; phoneHref: string; email: string; emailHref: string; whatsapp: string; whatsappLabel: string; address: string };
  cta: { label: string; href: string };
  rights: string;
  cookies: string;
}

/** TR footer ile aynı normalizasyon: 0507… → +90507…, 90… → +90…, aksi hâlde +90 ön eki. */
export function phoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("0") ? `+90${digits.slice(1)}` : digits.startsWith("90") ? `+${digits}` : `+90${digits}`;
}

export function buildV80Footer(input: V80FooterInput): V80FooterModel {
  const { locale } = input;
  const t = (k: string) => input.texts[k] ?? "";
  const home = `/${locale}`;
  const anchor = (id: string) => (input.isHome ? `#${id}` : `${home}#${id}`);

  const shop: V80FooterLink[] = input.categories.slice(0, 6).map((c) => ({ key: c.href, label: c.name, href: c.href }));
  if (input.allHref && t("footer.all")) shop.push({ key: "all", label: t("footer.all"), href: input.allHref });

  const help: V80FooterLink[] = [
    { key: "how", label: t("footer.how"), href: anchor("journey") },
    { key: "areas", label: t("footer.areas"), href: anchor("destinations") },
    ...(input.hasFaq ? [{ key: "faq", label: t("footer.faq"), href: anchor("content") }] : []),
    { key: "whatsapp", label: t("footer.whatsapp"), href: input.whatsapp, external: true },
  ].filter((l) => l.label && l.href);

  const live = new Set(input.liveDestinations);
  const deliver: V80FooterLink[] = (V80_DESTINATIONS as readonly V80Destination[])
    .filter((c) => live.has(c))
    .map((c) => ({ key: c, label: CITY_NAMES[locale][c], href: `${home}/${c}` }));

  const follow: V80FooterLink[] = V80_SOCIAL.map((s) => ({ key: s.key, label: s.label, href: s.href, external: true }));

  const columns: V80FooterColumn[] = [
    { key: "shop", title: t("footer.shop"), links: shop },
    { key: "help", title: t("footer.help"), links: help },
    { key: "deliver", title: t("footer.deliver"), links: deliver },
    { key: "follow", title: t("footer.follow"), links: follow },
  ].filter((c) => c.title && c.links.length > 0) as V80FooterColumn[];

  const phone = input.contact.phone.trim();
  const email = input.contact.email.trim();
  return {
    locale,
    dir: DIR[locale],
    homeHref: home,
    brand: "ÇiçekYolla",
    journey: t("footer.journey"),
    tagline1: t("footer.tagline1"),
    tagline2: t("footer.tagline2"),
    since: t("footer.since"),
    columns,
    contact: {
      title: t("footer.contact"),
      phone,
      phoneHref: `tel:${phoneHref(phone)}`,
      email,
      emailHref: `mailto:${email}`,
      whatsapp: input.whatsapp,
      whatsappLabel: t("footer.whatsapp"),
      address: `${CITY_NAMES[locale].istanbul}, ${t("footer.country")}`,
    },
    cta: { label: t("footer.cta"), href: anchor("shop") },
    rights: interp(t("footer.rights"), { year: input.year ?? new Date().getFullYear() }),
    cookies: t("footer.cookies"),
  };
}
