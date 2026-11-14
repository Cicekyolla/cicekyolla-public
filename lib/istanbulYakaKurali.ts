// lib/istanbulYakaKurali.ts — İSTANBUL YAKA TESLİMAT KURALI (14 Kas 2026, ADDITIVE).
// İşletme sahibinin doğruladığı operasyon kuralı (14 Kas 2026):
//   Anadolu Yakası → aynı gün teslimat için son sipariş 18:00, son teslimat 22:00
//   Avrupa Yakası  → aynı gün teslimat için son sipariş 17:00, son teslimat 22:00
// İki kavram AYRI: "son sipariş saati" (müşterinin sipariş verebileceği son an) ≠ "son teslimat saati".
//
// YANLIŞ VAAT YOK: kural yalnız motor (Delivery Engine /reach) ilçeyi standart kurye kapsamında ('in')
// sayıyor VE motorun son sipariş saati kuraldan erken DEĞİLSE gösterilir. Aksi (uzak / özel araç / karışık /
// motor daha erken kapanıyor / motor okunamadı) → null: ödeme adımındaki motor kontrolü geçerli kalır.

export type Yaka = "anadolu" | "avrupa";

export interface YakaKurali { siparisSonSaat: string; teslimatSonSaat: string }

export const YAKA_KURALI: Record<Yaka, YakaKurali> = {
  anadolu: { siparisSonSaat: "18:00", teslimatSonSaat: "22:00" },
  avrupa: { siparisSonSaat: "17:00", teslimatSonSaat: "22:00" },
};

/** İstanbul'un 14 Anadolu Yakası ilçesi (slug). Diğer 25 ilçe Avrupa Yakası. */
export const ANADOLU_ILCELERI = new Set([
  "adalar", "atasehir", "beykoz", "cekmekoy", "kadikoy", "kartal", "maltepe",
  "pendik", "sancaktepe", "sultanbeyli", "sile", "tuzla", "umraniye", "uskudar",
]);

/** İstanbul'un 25 Avrupa Yakası ilçesi (slug). */
export const AVRUPA_ILCELERI = new Set([
  "arnavutkoy", "avcilar", "bagcilar", "bahcelievler", "bakirkoy", "basaksehir", "bayrampasa",
  "besiktas", "beylikduzu", "beyoglu", "buyukcekmece", "catalca", "esenler", "esenyurt",
  "eyupsultan", "fatih", "gaziosmanpasa", "gungoren", "kagithane", "kucukcekmece", "sariyer",
  "silivri", "sultangazi", "sisli", "zeytinburnu",
]);

export function yakaOf(districtSlug: string | null | undefined): Yaka | null {
  if (!districtSlug) return null;
  if (ANADOLU_ILCELERI.has(districtSlug)) return "anadolu";
  if (AVRUPA_ILCELERI.has(districtSlug)) return "avrupa";
  return null;
}

/** Motorun ilçe kararından gereken alanlar (GET /api/public/global/reach). */
export interface MotorIlceKarari { reach: string | null; cutoff_time: string | null }

const hhmm = (t: string | null | undefined): string | null => (t && /^\d{2}:\d{2}/.test(t) ? t.slice(0, 5) : null);

export interface YakaBilgisi extends YakaKurali { yaka: Yaka }

/**
 * Sayfada gösterilecek yaka bilgisi ya da null (motor geçerli).
 * Koşullar: bilinen İstanbul ilçesi + motor 'in' + motor saati okunur + motor saati ≥ kural saati.
 */
export function yakaBilgisi(districtSlug: string | null | undefined, motor: MotorIlceKarari | null): YakaBilgisi | null {
  const yaka = yakaOf(districtSlug);
  if (!yaka || !motor || motor.reach !== "in") return null;
  const motorSaat = hhmm(motor.cutoff_time);
  const kural = YAKA_KURALI[yaka];
  if (!motorSaat || motorSaat < kural.siparisSonSaat) return null;
  return { yaka, ...kural };
}
