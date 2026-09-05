// ============================================================================
// Zengin metin (DB'den gelen operatör/AI içeriği) için ORTAK güvenli render yardımcıları.
// Kaynak: components/product/ProductDetail.tsx içindeki mevcut uygulama — davranış
// değişmeden buraya taşındı ki ürün ve Global kategori yüzeyleri AYNI güvenli yolu
// kullansın (kod tekrarı yok). SSR-güvenli, dış bağımlılık yok.
// ============================================================================
/**
 * Ürün açıklaması HTML'ini güvenli + premium sunuma hazırlar.
 * SSR-güvenli, bağımlılıksız (saf regex). Tehlikeli/istenmeyen etiketleri ve
 * satır-içi stilleri temizler, blok içerik barındıran sahte başlıkları düz bloğa
 * indirir ve baştaki tekrar "Ürün Açıklaması" başlığını kaldırır.
 */
export function sanitizeProductHtml(html: string): string {
  let s = html;
  // Tehlikeli/istenmeyen bloklar (içerikle birlikte kaldırılır)
  s = s.replace(/<(script|style|iframe|object|embed|form|button|svg|message)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  // Etiketi kaldır, metni koru
  s = s.replace(/<\/?(script|style|iframe|object|embed|form|button|input|img|svg|path|link|meta|font|o|section)\b[^>]*>/gi, "");
  // Olay işleyicileri + sunuma karışan attribute'lar (tipografiyi biz veriyoruz)
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/\s(style|class|id|dir|tabindex|role|data-[\w-]+|width|height|align|face|color)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // Tehlikeli URL şemaları — href/src üzerinden XSS'i kapatır (javascript:/data:/vbscript:).
  s = s.replace(/\s(?:href|src)\s*=\s*(?:"\s*(?:javascript|data|vbscript):[^"]*"|'\s*(?:javascript|data|vbscript):[^']*'|(?:javascript|data|vbscript):[^\s>]*)/gi, "");
  // Düz metin Tailwind/CSS sınıfları (ChatGPT kopyala-yapıştır)
  s = s.replace(/\*\]\:[a-z-\[\]\(\),.\d]+/gi, "");
  s = s.replace(/\b[A-Z]\w+_[a-z]+\w+\b\s*/g, "");
  s = s.replace(/scroll-(?:mb|mt|pt|pb)-\[[^\]]+\]/gi, "");
  s = s.replace(/calc\s*\([^)]+\)/gi, "");
  // Sahte başlıkları (uzun metin veya blok içeren) düz bloğa indir — gerçek kısa başlıkları KORUR.
  // Callback ile başlık-başına işlenir; başlıklar arasına taşmaz.
  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (full, _lvl, inner) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    return text.length > 90 || /<(?:p|ul|ol|div|br)\b/i.test(inner) ? `<div>${inner}</div>` : full;
  });
  // Boş kalıntıları temizle
  s = s.replace(/<span>\s*<\/span>/gi, "").replace(/<div>\s*<\/div>/gi, "");
  // Baştaki tekrar başlık (çift "Ürün Açıklaması" önler)
  s = s.replace(/^\s*<h[1-6][^>]*>\s*Ürün\s+Açıklaması\s*<\/h[1-6]>/i, "");
  return s.trim();
}

// Açıklama gövdesi için premium tipografi (intro + accordion içleri paylaşır).
export const DESC_PROSE =
  "text-[15px] text-[#4B5563] leading-[1.85] [&_p]:mb-4 [&_p:last-child]:mb-0 " +
  "[&_h1]:text-[18px] [&_h1]:font-bold [&_h1]:text-[#111827] [&_h1]:mt-5 [&_h1]:mb-2 " +
  "[&_h2]:text-[16px] [&_h2]:font-bold [&_h2]:text-[#111827] [&_h2]:mt-5 [&_h2]:mb-2 " +
  "[&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-[#1F2937] [&_h3]:mt-4 [&_h3]:mb-2 " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-1.5 " +
  "[&_li]:leading-relaxed [&_li]:marker:text-[#C4B5FD] [&_strong]:text-[#111827] [&_strong]:font-semibold " +
  "[&_b]:text-[#111827] [&_b]:font-semibold [&_em]:italic [&_a]:text-[#8B5CF6] [&_a]:font-medium hover:[&_a]:underline " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-[#DDD6FE] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#6B7280] [&_blockquote]:my-4 " +
  "[&_hr]:my-5 [&_hr]:border-[#F3F4F6] [&_img]:hidden";

/**
 * Zengin metni DÜZ METNE indirger — schema.org `description` içindir.
 *
 * NEDEN: JSON-LD `description` düz metin bekler. Ürün açıklamaları DB'de HTML
 * olarak duruyor ve canlıda schema'ya HAM HTML gidiyordu
 * (`"<p>Doğanın en özel dokularını..."`). Arama motorları etiketi ayıklamak
 * zorunda kalıyor, çıktı kirli görünüyor.
 *
 * Metni ÜRETMEZ, yalnız mevcut açıklamayı sadeleştirir — uydurma yok.
 */
export function toPlainText(html: string | null | undefined, maxLen = 5000): string {
  if (!html) return "";
  let s = String(html);
  // İçeriğiyle birlikte atılacak bloklar
  s = s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  // Blok sonları boşluğa dönsün ki kelimeler birleşmesin ("...tasarımAnlayışı")
  s = s.replace(/<\/(p|div|li|h[1-6]|tr|blockquote)\s*>/gi, " ");
  s = s.replace(/<br\s*\/?>/gi, " ");
  // Kalan tüm etiketler
  s = s.replace(/<[^>]*>/g, " ");
  // Yaygın HTML varlıkları (sayısal olanlar dahil)
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
  // Tüm boşlukları (satır sonu dahil) tek boşluğa indir
  s = s.replace(/\s+/g, " ").trim();
  if (s.length <= maxLen) return s;
  // Kelime ortasından kesme
  return s.slice(0, maxLen).replace(/\s+\S*$/, "").trim();
}
