// ============================================================================
// Link Data — Sözlükler (kategori + coğrafi sayfalar)
// Static kategori listesi (API fallback yok, Vercel build compat)
// ISR revalidate: 86400 (1 gün) — coğrafi sayfalar runtime'da çekiliyor
// ============================================================================

export interface LinkWord {
  text: string;       // "İnönü Mahallesi", "Orkide"
  url: string;        // "/istanbul/atasehir/inonu-mah", "/kategori/orkide"
  type: 'location' | 'category';
  length: number;     // Uzun adları ilk sıraya almak için
}

// Static kategori listesi (265 kategoriden seçme: en çok linkli, search-popular)
// Build env dependency'si yok, Vercel'de güvenilir
const STATIC_CATEGORIES = [
  // Top kategoriler (uzun adlar ilk)
  { text: 'Kız Arkadaşa Çiçek', url: '/kategori/kiz-arkadas-cicek', type: 'category' as const, length: 23 },
  { text: 'Sevgililer Günü Çiçek', url: '/kategori/sevgililer-gunu-cicek', type: 'category' as const, length: 22 },
  { text: 'Doğum Günü Çiçekleri', url: '/kategori/dogum-gunu-cicekleri', type: 'category' as const, length: 20 },
  { text: 'Taziye Çiçekleri', url: '/kategori/taziye-cicekleri', type: 'category' as const, length: 16 },
  { text: 'Gülümseme Çiçekleri', url: '/kategori/gulumseyen-cicekler', type: 'category' as const, length: 19 },
  { text: 'Gül Buketleri', url: '/kategori/gul-buketleri', type: 'category' as const, length: 13 },
  { text: 'Orkide Çiçekleri', url: '/kategori/orkide-cicekleri', type: 'category' as const, length: 16 },
  { text: 'Lale Çiçekleri', url: '/kategori/lale-cicekleri', type: 'category' as const, length: 14 },
  { text: 'Aranjmanlar', url: '/kategori/arajmanlar', type: 'category' as const, length: 11 },
  { text: 'Saksı Çiçekleri', url: '/kategori/saksi-cicekleri', type: 'category' as const, length: 15 },
  // Daha fazla kategoriler
  { text: 'Gül', url: '/kategori/gul-buketleri', type: 'category' as const, length: 3 },
  { text: 'Orkide', url: '/kategori/orkide-cicekleri', type: 'category' as const, length: 6 },
  { text: 'Lale', url: '/kategori/lale-cicekleri', type: 'category' as const, length: 4 },
  { text: 'Aranjman', url: '/kategori/arajmanlar', type: 'category' as const, length: 8 },
].sort((a, b) => b.length - a.length) as LinkWord[];

function extractLocationName(h1: string, pageType: string): string[] {
  if (!h1) return [];
  // h1 pattern: "{YER} Çiçek Gönder" veya "{YER} Çiçekçi ve Çiçek Siparişi"
  const match = h1.match(/^(.+?)\s+(?:Çiçek|Çiçekçi)/i);
  if (!match) return [];

  const yerAdi = match[1].trim();
  const parts = yerAdi.split(/\s+/);

  if (pageType === 'neighborhood') {
    // "İnönü Mahallesi" → ["İnönü Mahallesi", "İnönü"]
    return [yerAdi, ...parts.filter(p => !/Mahallesi|Mah/i.test(p))];
  }
  return [yerAdi];
}

async function fetchLocationPages(): Promise<LinkWord[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'https://api.cicekyolla.com'}/api/public/seo-pages?page_type=city,district,neighborhood&status=published&index_state=index&page_size=1000`,
      { next: { revalidate: 86400 } }
    );
    if (!response.ok) return [];
    const data = await response.json();

    const result: LinkWord[] = [];
    for (const page of data.items || []) {
      const adlar = extractLocationName(page.h1, page.page_type);
      for (const ad of adlar) {
        result.push({
          text: ad,
          url: page.url_path,
          type: 'location',
          length: ad.length,
        });
      }
    }

    return result.sort((a, b) => b.length - a.length);
  } catch {
    return [];
  }
}

export async function getLinkData(): Promise<LinkWord[]> {
  // Static kategoriler + dinamik coğrafi sayfalar
  const locations = await fetchLocationPages();
  const all = [...STATIC_CATEGORIES, ...locations];
  all.sort((a, b) => b.length - a.length);

  return all;
}
