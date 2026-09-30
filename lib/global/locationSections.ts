// ============================================================================
// GLOBAL LOKASYON SAYFASI — BÖLÜM SIRASI (saf modül; ağ yok → node --test ile test edilir).
//
// Kaynak: storefront belgesi (global_pages 'storefront') structure.locationSections —
// 13 dilde ve şehir/ilçe/mahalle sayfalarında TEK sıra. Public bunu AYRI istekle okumaz:
// API /api/public/global/catalog yanıtındaki ham `location_sections` alanı (belge zaten
// orada okunuyor) → ek istek YOK. Alan yoksa (eski API) / bozuksa → varsayılan sıra.
//
// Hero (kırıntı + H1 + kısa giriş) listede YOKTUR; her zaman en üsttedir.
//
// Blok anlamları (lib/global/page.tsx GlobalPageBody):
//   trust      → TrustStrip (İstanbul) / CargoTrustStrip (kargo)
//   commerce   → başlık + kategori çipleri + ürün ızgarası (kargo: kargo katalog gövdesi)
//   categories → kategori keşif kartları (aynı lokasyon planı)
//   emotion    → duygu kartları (yalnız aynı gün / İstanbul)
//   reviews    → gerçek Google yorumları (o dilin başlıkları)
//   story      → Uzaklık/Atölye/Concierge/Teslimat kanıtı/Mesaj (İstanbul) · Mesaj (kargo)
//   locations  → ilçe / mahalle iç bağlantıları
//   content    → content_html + SSS
//   cta        → kapanış CTA'sı (yalnız İstanbul)
//
// Parse kuralı (Admin kopyasıyla aynı): bilinen id'ler, tekrar yok (ilk geçen kazanır),
// eksik id'ler varsayılan sırayla sona eklenir (enabled=true); dizi değilse varsayılan.
// ASLA throw etmez — sayfa hiçbir zaman bu alan yüzünden kırılmaz.
// ============================================================================

export const LOCATION_SECTION_IDS = [
  "trust",
  "commerce",
  "categories",
  "emotion",
  "reviews",
  "story",
  "locations",
  "content",
  "cta",
] as const;
export type LocationSectionId = (typeof LOCATION_SECTION_IDS)[number];

export interface LocationSection {
  id: LocationSectionId;
  enabled: boolean;
}

/** Varsayılan sıra (hepsi açık): güven → ürünler → kategoriler → duygu → yorumlar → hikâye → lokasyonlar → içerik → CTA. */
export const DEFAULT_LOCATION_SECTIONS: readonly Readonly<LocationSection>[] = Object.freeze(
  LOCATION_SECTION_IDS.map((id) => Object.freeze({ id, enabled: true })),
);

/** Kargo destinasyonunda (Antalya/Muğla/İzmir) basılmayan bloklar — aynı gün / İstanbul hikâyesi taşırlar. */
export const CARGO_HIDDEN_LOCATION_SECTIONS: readonly LocationSectionId[] = Object.freeze(["emotion", "cta"] as LocationSectionId[]);

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function isLocationSectionId(v: unknown): v is LocationSectionId {
  return typeof v === "string" && (LOCATION_SECTION_IDS as readonly string[]).includes(v);
}

/** Ham `location_sections` → tam, tekrarsız bölüm listesi (her zaman yeni dizi döner). */
export function parseLocationSections(raw: unknown): LocationSection[] {
  if (!Array.isArray(raw)) return DEFAULT_LOCATION_SECTIONS.map((s) => ({ id: s.id, enabled: s.enabled }));
  const seen = new Set<LocationSectionId>();
  const list: LocationSection[] = [];
  for (const item of raw) {
    if (!isObj(item) || !isLocationSectionId(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    list.push({ id: item.id, enabled: typeof item.enabled === "boolean" ? item.enabled : true });
  }
  // Eksik (ör. sonradan eklenen) bölümler varsayılan sırayla sona — eski kayıtta görünmez kalmasın.
  for (const id of LOCATION_SECTION_IDS) if (!seen.has(id)) list.push({ id, enabled: true });
  return list;
}

/**
 * Bu sayfada basılacak bölüm id'leri, sırayla: yalnız açık olanlar; kargo destinasyonunda
 * aynı gün / İstanbul bloğu (emotion, cta) hiç basılmaz (Admin açık bıraksa bile).
 */
/** Nötr (sınır/belirsiz erişim) modda basılmayan bloklar — kapanış CTA'sı "bugün gönder" çağrışımı taşır. */
export const NEUTRAL_HIDDEN_LOCATION_SECTIONS: readonly LocationSectionId[] = Object.freeze(["cta"] as LocationSectionId[]);

export function renderableLocationSections(
  sections: readonly Readonly<LocationSection>[],
  opts: { cargo: boolean; neutral?: boolean },
): LocationSectionId[] {
  const out: LocationSectionId[] = [];
  for (const s of sections) {
    if (!s.enabled || !isLocationSectionId(s.id) || out.includes(s.id)) continue;
    if (opts.cargo && CARGO_HIDDEN_LOCATION_SECTIONS.includes(s.id)) continue;
    if (opts.neutral && NEUTRAL_HIDDEN_LOCATION_SECTIONS.includes(s.id)) continue;
    out.push(s.id);
  }
  return out;
}
