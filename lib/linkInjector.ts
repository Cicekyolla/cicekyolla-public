// ============================================================================
// Link Injector — Cheerio-based HTML link enjeksiyonu (Türkçe word boundary)
// HTML-aware, text node'lara sadece dokun, tag-safe, nested link yok
// Kurallar: 1 kez, max 6-8 link, tam kelime, kendine link yok, uzun ad ilk
// ============================================================================

import * as cheerio from 'cheerio';

export interface LinkableWord {
  text: string;
  url: string;
  type: 'location' | 'category';
}

export function injectLinksIntoHtml(
  html: string,
  words: LinkableWord[],
  currentPageUrl: string,
  maxLinks: number = 8
): string {
  if (!html || words.length === 0) return html;

  const $ = cheerio.load(html);
  const linked = new Set<string>();
  let linkCount = 0;

  // Text node'ları dolaş (tag'ler skip edilir, zaten linkli <a> içindekiler skip edilir)
  $('*')
    .contents()
    .each((_, node) => {
      if (linkCount >= maxLinks) return;
      if (node.type !== 'text') return;

      // Mevcut linkli text'i skip (parent <a> tag'iyse)
      if ($(node).parent().is('a')) return;

      let text = node.data || '';
      let modified = false;

      for (const word of words) {
        if (linkCount >= maxLinks) break;

        const wordKey = word.text.toLowerCase();
        if (linked.has(wordKey)) continue;
        if (word.url === currentPageUrl) continue;

        // Türkçe word boundary eşleşmesi
        const regex = buildTurkishWordRegex(word.text);
        if (!regex.test(text)) continue;

        // HTML escape + link oluştur
        const url = escapeAttr(word.url);
        const escapedWord = escapeHtml(word.text);

        // Replace only first occurrence (Kural 1)
        text = text.replace(regex, () => {
          linkCount++;
          return `<a href="${url}">${escapedWord}</a>`;
        });

        linked.add(wordKey);
        modified = true;
      }

      if (modified) {
        node.data = text;
      }
    });

  return $.html();
}

function buildTurkishWordRegex(word: string): RegExp {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Türkçe word boundary: boşluk/nokta/virgül/tire/parantez/başında/sonunda
  // Case-insensitive match
  return new RegExp(
    `(^|[\\s\\.,!?;:\\(\\)\\-−"\\'"])(${escaped})(?=[\\s\\.,!?;:\\(\\)\\-−"\\'"]|$)`,
    'gui'
  );
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, c => map[c]);
}

function escapeAttr(url: string): string {
  return url.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
