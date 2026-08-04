// ============================================================================
// Link Data — Build-time sözlükler (kategori + coğrafi sayfalar)
// ISR revalidate: 86400 (1 gün)
// ============================================================================

export interface LinkWord {
  text: string;       // "İnönü Mahallesi", "Orkide"
  url: string;        // "/istanbul/atasehir/inonu-mah", "/kategori/orkide"
  type: 'location' | 'category';
  length: number;     // Uzun adları ilk sıraya almak için
}

async function fetchCategories(): Promise<LinkWord[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/public/categories`, {
      next: { revalidate: 86400 },
    });
    if (!response.ok) return [];
    const data = await response.json();

    return (data.items || [])
      .filter((c: any) => c.is_indexable && c.status === 'active')
      .map((c: any) => ({
        text: c.name,
        url: `/kategori/${c.slug}`,
        type: 'category' as const,
        length: c.name.length,
      }))
      .sort((a: LinkWord, b: LinkWord) => b.length - a.length);
  } catch {
    return [];
  }
}

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
      `${process.env.NEXT_PUBLIC_API_URL}/api/public/seo-pages?page_type=city,district,neighborhood&status=published&index_state=index&page_size=1000`,
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
  const [categories, locations] = await Promise.all([
    fetchCategories(),
    fetchLocationPages(),
  ]);

  const all = [...categories, ...locations];
  all.sort((a, b) => b.length - a.length);

  return all;
}
