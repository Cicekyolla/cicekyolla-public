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

export async function getLinkData(): Promise<LinkWord[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.cicekyolla.com';
    const response = await fetch(`${apiUrl}/api/public/link-dictionary`, {
      next: { revalidate: 600 },  // 10 min ISR
    });

    if (!response.ok) {
      console.warn('[linkData] API error:', response.status);
      return [];
    }

    const data = await response.json();
    const words: LinkWord[] = data.words || [];

    // Uzun adlar ilk (word boundary matching için)
    words.sort((a, b) => b.text.length - a.text.length);

    return words;
  } catch (err) {
    console.error('[linkData]', err instanceof Error ? err.message : err);
    return [];
  }
}
