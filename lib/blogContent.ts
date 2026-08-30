// lib/blogContent.ts — blog içeriğinin güvenli ayrıştırıcısı (ADDITIVE, 30.08.2026).
//
// Blog Merkezi'ndeki araç çubuklu editör hafif bir işaretleme üretir. Burada o
// işaretleme YAPISAL DÜĞÜMLERE çevrilir; renderer bu düğümlerden React öğeleri
// üretir. HAM HTML HİÇBİR ZAMAN BASILMAZ → dangerouslySetInnerHTML yok, XSS yok.
//
// GERİYE UYUMLULUK: işaretleme içermeyen düz metin (bugünkü 15 yazının tamamı)
// bugünkü davranışın birebir aynısını üretir — boş satırla ayrılmış paragraflar.
//
// Desteklenen işaretleme (satır başı):
//   ## Başlık      → h2
//   - madde        → ul/li   (aynı blokta ardışık satırlar tek listeye toplanır)
// Satır içi:
//   **kalın**  *italik*  [bağlantı metni](/adres)

export type InlineNode =
  | { t: "text"; v: string }
  | { t: "b"; v: string }
  | { t: "i"; v: string }
  | { t: "a"; v: string; href: string };

export type BlockNode =
  | { type: "h2"; inline: InlineNode[] }
  | { type: "p"; inline: InlineNode[] }
  | { type: "ul"; items: InlineNode[][] };

/** Yalnız site içi yollar ve http(s) adresleri geçer. javascript:/data: reddedilir. */
export function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (!href) return null;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (/^https?:\/\/[^\s]+$/i.test(href)) return href;
  if (href.startsWith("#")) return href;
  return null;
}

/** Satır içi işaretlemeyi düğümlere çevirir. Eşleşmeyen işaretler düz metin kalır. */
export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  // Sıra önemli: bağlantı → kalın → italik. Kalın (**) italikten (*) önce denenir.
  const pattern = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push({ t: "text", v: text.slice(last, m.index) });

    if (m[1] !== undefined && m[2] !== undefined) {
      const href = safeHref(m[2]);
      if (href) nodes.push({ t: "a", v: m[1], href });
      else nodes.push({ t: "text", v: m[1] }); // güvensiz adres → yalnız metin kalır
    } else if (m[3] !== undefined) {
      nodes.push({ t: "b", v: m[3] });
    } else if (m[4] !== undefined) {
      nodes.push({ t: "i", v: m[4] });
    }
    last = pattern.lastIndex;
  }

  if (last < text.length) nodes.push({ t: "text", v: text.slice(last) });
  return nodes.length > 0 ? nodes : [{ t: "text", v: text }];
}

/** İçeriği paragraf/başlık/liste bloklarına ayırır. */
export function parseBlogContent(content: string): BlockNode[] {
  const source = typeof content === "string" ? content : "";
  const chunks = source.split(/\n\s*\n/);
  const blocks: BlockNode[] = [];

  for (const rawChunk of chunks) {
    const chunk = rawChunk.trim();
    if (!chunk) continue;

    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    let buffer: string[] = [];

    const flushParagraph = () => {
      if (buffer.length === 0) return;
      blocks.push({ type: "p", inline: parseInline(buffer.join(" ")) });
      buffer = [];
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (line.startsWith("## ")) {
        flushParagraph();
        blocks.push({ type: "h2", inline: parseInline(line.slice(3).trim()) });
        i += 1;
        continue;
      }

      if (/^[-•]\s+/.test(line)) {
        flushParagraph();
        const items: InlineNode[][] = [];
        while (i < lines.length && /^[-•]\s+/.test(lines[i])) {
          items.push(parseInline(lines[i].replace(/^[-•]\s+/, "").trim()));
          i += 1;
        }
        blocks.push({ type: "ul", items });
        continue;
      }

      buffer.push(line);
      i += 1;
    }
    flushParagraph();
  }

  return blocks;
}
