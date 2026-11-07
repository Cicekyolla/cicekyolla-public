// 7 Kas 2026 — ana sayfa "Hangi Özel Gün İçin Arıyorsunuz?" bölümü için sezon kartı.
// Panel API'si occasion_shopping'e kart listesi kabul etmediği için (config yalnız title/collection_ids)
// sezon kartı burada tarihe bağlı eklenir: pencere içinde verilen kartın YERİNE geçer ve başa alınır,
// pencere bitince liste kendiliğinden eski haline döner (ayrı geri alma PR'ı gerekmez).

export type SeasonalOccasionCard = { id: string; name: string; href: string; image: string; enabled?: boolean };

export type SeasonalSwap = {
  card: SeasonalOccasionCard;
  /** Yerini alacağı kartın id'si (sezon dışı kart). */
  replaces: string;
  /** İstanbul saatine göre YYYY-MM-DD, iki uç dahil. */
  from: string;
  until: string;
};

export const SEASONAL_OCCASION_SWAPS: SeasonalSwap[] = [
  {
    card: {
      id: "teachers-day",
      name: "Öğretmenler Günü",
      href: "/kategori/ogretmenler-gunu",
      image: "/r2/1791671514822-solde-pembe-orkide-j-t-ambalaj-saks.webp",
      enabled: true,
    },
    replaces: "graduation",
    from: "2026-11-01",
    until: "2026-11-24",
  },
];

/** Verilen anın İstanbul (UTC+3, yaz saati yok) takvim günü. */
export function istanbulDay(now: Date): string {
  return new Date(now.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}

export function applySeasonalOccasions<T extends SeasonalOccasionCard>(
  cards: T[],
  now: Date,
  swaps: SeasonalSwap[] = SEASONAL_OCCASION_SWAPS,
): (T | SeasonalOccasionCard)[] {
  const day = istanbulDay(now);
  let out: (T | SeasonalOccasionCard)[] = [...cards];
  for (const s of swaps) {
    if (day < s.from || day > s.until) continue;
    if (out.some((c) => c.href === s.card.href)) continue;
    const idx = out.findIndex((c) => c.id === s.replaces);
    if (idx === -1) continue;
    out = [s.card, ...out.slice(0, idx), ...out.slice(idx + 1)];
  }
  return out;
}
