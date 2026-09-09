// ============================================================================
// heroPreload.ts — LCP hero görseli için preload bağlantıları (9 Eyl 2026, Adım 2)
// ----------------------------------------------------------------------------
// Ana sayfa hero'su <picture> içinde (mobil/tablet <source> + desktop <img>).
// React SSR, <picture> içindeki <img> için OTOMATİK preload YAZMAZ (Adım 1'de
// kapatılan seli üreten kural picture'ı bilerek dışlar). Sonuç: LCP görseli ancak
// ~580 KB HTML ayrıştırılıp <picture>'a gelinince keşfediliyordu (Lighthouse:
// yükleme gecikmesi 2,3–3,3 sn). Bu saf yardımcı, HomeHero'nun <picture>
// seçim kuralını BİREBİR yansıtan `media` koşullu preload listesini üretir:
//   mobil  → (max-width: 639px)                 [picture: 1. source]
//   tablet → (min-width: 640px) and (max-width: 1023px)  [picture: 2. source]
//   desktop→ (min-width: 1024px)                [picture: <img>]
// Eksik kırılımda aralıklar komşuya devrolur; yalnız desktop varsa media yok.
// Tarayıcı yalnız eşleşen media'yı indirir; <picture> aynı URL'yi seçtiği için
// tek istek olur (çift indirme yok). Görsel/URL/tasarım değişmez.
// ============================================================================

export interface HeroMediaSet {
  desktop: string;
  tablet?: string | null;
  mobile?: string | null;
}

export interface HeroPreloadLink {
  href: string;
  media?: string;
}

export function heroPreloadLinks(set: HeroMediaSet): HeroPreloadLink[] {
  const desktop = (set.desktop ?? "").trim();
  const tablet = (set.tablet ?? "").trim();
  const mobile = (set.mobile ?? "").trim();
  if (!desktop) return [];
  const out: HeroPreloadLink[] = [];
  if (mobile) out.push({ href: mobile, media: "(max-width: 639px)" });
  if (tablet) out.push({ href: tablet, media: mobile ? "(min-width: 640px) and (max-width: 1023px)" : "(max-width: 1023px)" });
  const desktopMedia = tablet ? "(min-width: 1024px)" : mobile ? "(min-width: 640px)" : undefined;
  out.push(desktopMedia ? { href: desktop, media: desktopMedia } : { href: desktop });
  return out;
}
