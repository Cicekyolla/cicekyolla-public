// ============================================================================
// Link Data — Runtime sözlük çekme
// /api/public/link-dictionary'den: published+index kategoriler (265) + lokasyonlar
// Cache: 5 min (API'de), ISR revalidate: 10 dk (Next.js)
// ============================================================================

export interface LinkWord {
  text: string;       // "İnönü Mahallesi", "Orkide"
  url: string;        // "/istanbul/atasehir/inonu-mah", "/kategori/orkide"
  type: 'location' | 'category';
}

// ── EK (PERF, 9 Eyl 2026) — ADDITIVE, davranış korunur ──────────────────────
// Vercel runtime logları (dpl_92MgNF…): her lokasyon sayfası üretiminde
// "[linkData] Fetching" satırı İKİ kez üst üste düşüyordu (Next 14, statik
// üretimde sayfa gövdesini iki kez çalıştırıyor) ve API yavaş/erişilemezken bu
// bekleme sayfa üretimini bloklayabiliyordu. Sözlük yalnız DEKORATİF metin içi
// linkler içindir; sayfanın içeriği değildir.
//   1) Süreç içi önbellek (TTL 10 dk) + uçuştaki isteğin paylaşımı: aynı lambda
//      örneğinde N sayfa üretimi → 1 ağ isteği; iki render geçişi aynı sözü
//      paylaşır. (Next Data Cache 600 sn saklamaya devam eder.)
//   2) Zaman aşımı (3 sn): API geç kalırsa elde sözlük varsa o, yoksa [] döner;
//      sayfa linksiz üretilir — mevcut hata yolu (try/catch → []) ile AYNI.
// Boş sonuç (API hatası) yalnız 60 sn saklanır: geçici kesinti 10 dk boyunca
// linkleri silmesin. Dönüş tipi, sıralama kuralı ve çağıran (page.tsx) aynı.
// React cache() BİLEREK kullanılmadı: Node birim testi (lib/linkData.test.ts)
// react@18.3 stable ile çalışır; süreç içi memo istek içi tekrarı da karşılar.
const TTL_MS = 10 * 60_000;
const EMPTY_TTL_MS = 60_000;
const TIMEOUT_MS = 3_000;

let memo: { words: LinkWord[]; expiresAt: number } | null = null;
let inflight: Promise<LinkWord[]> | null = null;

async function fetchLinkWords(): Promise<LinkWord[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://cicekyolla-api.onrender.com';
  const url = `${apiUrl}/api/public/link-dictionary`;
  console.log('[linkData] Fetching from:', url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      next: { revalidate: 600 },  // 10 min ISR
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn('[linkData] API error:', response.status);
      return memo?.words ?? [];
    }

    const data = await response.json();
    const words: LinkWord[] = data.words || [];
    console.log('[linkData] Loaded', words.length, 'words');

    // Uzun adlar ilk (word boundary matching için)
    words.sort((a, b) => b.text.length - a.text.length);

    return words;
  } catch (err) {
    console.error('[linkData] Fetch failed:', err instanceof Error ? err.message : err);
    // Zaman aşımı / ağ hatası: elde eski sözlük varsa onu kullan, yoksa boş.
    return memo?.words ?? [];
  } finally {
    clearTimeout(timer);
  }
}

async function getLinkDataMemoized(): Promise<LinkWord[]> {
  if (memo && memo.expiresAt > Date.now()) return memo.words;
  if (inflight) return inflight;
  inflight = fetchLinkWords()
    .then((words) => {
      memo = { words, expiresAt: Date.now() + (words.length > 0 ? TTL_MS : EMPTY_TTL_MS) };
      return words;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

/** Aynı imza: `await getLinkData()` → LinkWord[] (uzun adlar önce). */
export async function getLinkData(): Promise<LinkWord[]> {
  return getLinkDataMemoized();
}
