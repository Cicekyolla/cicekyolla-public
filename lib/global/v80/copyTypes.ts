// ============================================================================
// GLOBAL VERSION 80 — sunum metni sözleşmesi (13 dil). Yalnız METİN; ürün,
// fiyat, sayı, teslimat saati veya sipariş sayısı burada TUTULMAZ.
// Yer tutucular: {n} sayı, {x} seçim adı, {price} fiyat, {city} şehir, {time} saat.
// ============================================================================

export type V80ChipKey =
  | "mother" | "partner" | "friend" | "colleague" | "sibling" | "family"
  | "birthday" | "anniversary" | "condolence" | "thanks" | "sorry" | "surprise";
export type V80MoodKey = "love" | "birthday" | "sorry" | "thanks" | "condolence";
export type V80CardKey = V80MoodKey | "getwell";
export type V80CityKey = "istanbul" | "antalya" | "mugla" | "izmir";

export interface V80Copy {
  header: {
    search: string; searchHint: string; whatsapp: string; cart: string; menu: string; closeMenu: string;
    currency: string; noResults: string; popular: string; seeAll: string; products: string; categories: string; skip: string;
  };
  hero: {
    eyebrow: string; title1: string; title2: string; titleEm: string; body: string; cta: string; cta2: string;
    occasion: string; occasionAny: string; date: string; datePick: string; where: string; whereEmpty: string; whereChange: string;
    sameDay: string; cargo: string; founded: string; statusOpen: string; statusClosed: string;
  };
  ticker: { hand: string; since: string; fresh: string; world: string; types: string; care: string };
  trustMini: { ssl: string; whatsapp: string; since: string };
  discovery: {
    eyebrow: string;
    groups: { who: string; occasion: string; what: string; where: string };
    chips: Record<V80ChipKey, string>;
    show: string; match: string; clear: string;
  };
  shop: {
    eyebrow: string; eyebrowFor: string; title: string; titleFor: string; all: string; tabAll: string; unit: string; more: string;
    promoTitle: string; promoBody: string; promoCta: string; cardCta: string;
    sameDay: string; cargo: string; bestseller: string; new: string; sale: string; empty: string;
  };
  categories: { eyebrow: string; title: string; pick: string; kinds: string; from: string };
  delivery: {
    eyebrow: string; title: string; titleEm: string; selected: string; noSelection: string;
    items: { istanbul: { label: string; title: string; sub: string }; cargo: { label: string; title: string; sub: string }; cities: { label: string; title: string; sub: string } };
  };
  collections: { eyebrow: string; title: string; sub: string; view: string };
  mood: { eyebrow: string; title: string; items: Record<V80MoodKey, { word: string; line: string; sub: string; cta: string }> };
  card: {
    eyebrow: string; title: string; sub: string; note: string; preview: string; brand: string; cta: string;
    occasions: Record<V80CardKey, string>; lines: Record<V80CardKey, string[]>;
  };
  destinations: { eyebrow: string; title: string; sameDay: string; cargo: string; districts: string; subs: Record<V80CityKey, string> };
  journey: {
    title1: string; title2: string; body: string; bullets: [string, string, string]; cta: string;
    steps: { t: string; d: string }[]; quote: string; help: string; wa: string; waNote: string;
    facts: { founded: string; local: string };
  };
  reviews: { eyebrow: string; title: string; source: string };
  cta: { eyebrow: string; title1: string; titleEm: string; body: string; button: string; bullets: [string, string] };
  trust: { pay: { title: string; desc: string }; sameday: { title: string; desc: string }; whatsapp: { title: string; desc: string }; fresh: { title: string; desc: string } };
  content: { faq: string; more: string };
}
