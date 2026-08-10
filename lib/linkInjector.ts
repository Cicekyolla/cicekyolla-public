// ============================================================================
// Link Injector — Cheerio-based HTML link enjeksiyonu (Türkçe word boundary)
// HTML-aware, text node'lara sadece dokun, tag-safe, nested link yok
// Kurallar: 1 kez, max 3 link, tam kelime, kendine link yok, uzun ad ilk
//
// HEDEF: metin içi linkler YALNIZ kategori sayfalarına gider (/kategori/...).
// Lokasyon bağlantısı bilinçli olarak buraya konmaz — ilçe/mahalle bağı zaten
// NeighborhoodCards bileşeninde düzenli ve tam liste hâlinde veriliyor.
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
  // 8 -> 3: ~350 kelimelik bir metinde 8 link okuma akışını bozuyor ve link
  // değerini seyreltiyor. 300-400 kelimede 2-4 bağlam linki doğal durur.
  maxLinks: number = 3
): string {
  if (!html || words.length === 0) {
    console.log(`[injectLinksIntoHtml] Skipped: html=${!!html} words=${words.length}`);
    return html;
  }

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

      // Anchor'lar önce YER TUTUCU olarak konur; düz metin escape edildikten
      // SONRA geri yazılır. Böylece çevredeki metin güvenle kaçırılır (&, <, >)
      // ama anchor'lar gerçek HTML olarak kalır.
      const anchors: string[] = [];
      let text = node.data || '';
      let modified = false;

      for (const word of words) {
        if (linkCount >= maxLinks) break;

        const wordKey = word.text.toLowerCase();
        if (linked.has(wordKey)) continue;
        if (word.url === currentPageUrl) continue;

        // Türkçe word boundary eşleşmesi
        const regex = buildTurkishWordRegex(word.text);
        const match = regex.exec(text);
        if (!match) continue;

        // HTML escape + link oluştur (enjekte edilen değerler HER ZAMAN kaçırılır)
        // Yer tutucu NUL karakteriyle sarılır: doğal metinde ASLA bulunmaz,
        // bu yüzden "en az 4 saat" gibi sıradan sayılarla çakışma riski yok.
        const url = escapeAttr(word.url);
        const escapedWord = escapeHtml(word.text);
        const token = `\u0000${anchors.length}\u0000`;
        // GÖRÜNÜRLÜK: Tailwind preflight `a { color: inherit }` uyguluyor ve
        // kapsayıcıdaki `prose` sınıfları ÖLÜ (@tailwindcss/typography kurulu
        // değil). Sınıfsız anchor gövde metninden ayırt edilemiyordu: Google
        // linki görüyor ama kullanıcı göremiyordu. Marka tokenı ile renklendirilir
        // (--primary = #8B5CF6); hardcode hex KULLANILMAZ. Alt çizgi bilinçli
        // olarak yok — kurumsal görünüm tercihi.
        anchors.push(`<a class="text-primary" href="${url}">${escapedWord}</a>`);

        // DÜZELTME (Kural 1): gerçekten YALNIZ ilk eşleşme değiştirilir.
        // Öncesinde String.replace /g bayraklı regex ile TÜM eşleşmeleri
        // değiştiriyor ve her biri için linkCount++ çalıştığı için maxLinks
        // tavanı aşılabiliyordu — yorum "first occurrence" diyordu ama kod öyle
        // davranmıyordu.
        //
        // DÜZELTME (boşluk): match[1] öndeki sınır karakteridir (boşluk, virgül…).
        // Eski kod bu grubu düşürüyordu, link önceki kelimeye yapışıyordu:
        // "taze Çiçekler" -> "taze<a>Çiçekler</a>". Artık korunuyor.
        text =
          text.slice(0, match.index) +
          match[1] +
          token +
          text.slice(match.index + match[0].length);

        linkCount++;
        linked.add(wordKey);
        modified = true;
      }

      if (!modified) return;

      // DÜZELTME (asıl hata): anchor HTML'i text node'un .data alanına
      // yazılıyordu. Cheerio'da text node'un .data'sı LİTERAL METİNDİR;
      // $.html() serialize ederken içeriği escape eder ve kullanıcıya
      // "&lt;a href=...&gt;" ham etiketi görünürdü. Doğrusu: text node'u
      // parse edilmiş düğümlerle DEĞİŞTİRMEK.
      const replacement = escapeHtml(text).replace(
        /\u0000(\d+)\u0000/g,
        (_full, index: string) => anchors[Number(index)] ?? '',
      );
      $(node).replaceWith(replacement);
    });

  console.log(`[injectLinksIntoHtml] Completed: linkCount=${linkCount} linkedWords=${linked.size}`);
  return $.html();
}

function buildTurkishWordRegex(word: string): RegExp {
  // Tüm regex özel karakterlerini escape et (/ dahil)
  const escaped = word.replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&');

  // Türkçe word boundary: boşluk/nokta/virgül/tire/parantez/başında/sonunda
  // Köşeli parantez içinde: literal karakterler (parantez escape çıkırıldı)
  const boundary = '[\\s.,;:!?()\\-−"\']';
  const pattern = `(^|${boundary})(${escaped})(?=${boundary}|$)`;

  try {
    return new RegExp(pattern, 'gui');
  } catch (err) {
    console.error(`[buildTurkishWordRegex] Invalid pattern for word="${word}" pattern="${pattern}":`, err);
    // Fallback: kelimeyi literal match et (word boundary yok)
    return new RegExp(`\\b${escaped}\\b`, 'gui');
  }
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
