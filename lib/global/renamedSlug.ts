// =============================================================================
// renamedSlug.ts — çeviri slug'ı değişmiş global ürünün eski adresi → yeni adres
// -----------------------------------------------------------------------------
// GSC (23 Eki 2026): örneklenen 7/7 global ürün 404'ünde ürün yaşıyor, yalnız çeviri
// slug'ı değişmiş ve eski adres için 301 yazılmamış:
//   fr  bouquet-roses-saumon-adele      → adele-bouquet-de-roses-saumon
//   it  bouquet-rose-blu-bianche-audrey → audrey-bouquet-di-rose-blu-e-bianche
// Yeni slug aynı kelimelerin yeniden sıralanması (+ bağlaç). Kural (TAHMİN YOK):
// eski slug'ın anlamlı kelimelerinin TAMAMI (bağlaçlar atılır, sondaki çoğul -s
// kökte birleşir) adaylardan TAM OLARAK BİRİNDE varsa o aday döner; hiç / birden
// fazla aday → null (sayfa bugünkü gibi 404). Saf modül; veri çağırandan gelir.
// =============================================================================

const STOP = new Set([
  'de', 'di', 'du', 'des', 'del', 'della', 'la', 'le', 'les', 'el', 'il', 'lo', 'los', 'las', 'a', 'al',
  'et', 'e', 'y', 'en', 'in', 'und', 'and', 'the', 'of', 'with', 'con', 'per', 'em', 'da', 'do', 'dos', 'das',
  'van', 'het', 'een', 'met', 'mit', 'im', 'aus', 've', 'ile',
]);

function tokens(slug: string): string[] {
  return (slug || '')
    .toLowerCase()
    .split('-')
    .filter((t) => t && !STOP.has(t))
    .map((t) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t));
}

/** Eski slug'ın en az bu kadar anlamlı kelimesi olmalı (kısa/genel adlar tahmine açık). */
const MIN_TOKENS = 4;
/** Yeni slug en fazla bu kadar EK anlamlı kelime taşıyabilir (yeniden sıralama + ör. "emballage"). */
const MAX_EXTRA = 1;

export function findRenamedSlug(oldSlug: string, candidates: readonly string[]): string | null {
  const old = [...new Set(tokens(oldSlug))];
  if (old.length < MIN_TOKENS) return null;
  const hits = candidates.filter((c) => {
    if (!c || c === oldSlug) return false;
    const have = new Set(tokens(c));
    return have.size - old.length <= MAX_EXTRA && old.every((t) => have.has(t));
  });
  return hits.length === 1 ? hits[0] : null;
}

type Fetcher = () => Promise<readonly string[]>;
const memo = new Map<string, { at: number; slugs: readonly string[] }>();
const MEMO_MS = 5 * 60_000;

/** Envanteri locale başına 5 dk süreç içinde tutar (404 trafiğinde her istekte okunmaz). */
export async function findRenamedLocaleSlug(
  locale: string,
  oldSlug: string,
  fetchSlugs: Fetcher,
  now: number = Date.now(),
): Promise<string | null> {
  let entry = memo.get(locale);
  if (!entry || now - entry.at > MEMO_MS) {
    let slugs: readonly string[] = [];
    try {
      slugs = await fetchSlugs();
    } catch {
      slugs = [];
    }
    entry = { at: now, slugs };
    memo.set(locale, entry);
  }
  return findRenamedSlug(oldSlug, entry.slugs);
}
