// Operatör bağlantısı denetimi (saf). intro_html içinde elle yazılmış en az bir <a> varsa
// sayfa "elle bağlantı yönetilen" sayılır ve otomatik sözlük enjeksiyonu HİÇ çalışmaz.
// Gerekçe: otomatik sözlük "İstanbul"u Tuzla'da bir mahalleye, "Feneryolu"yu Kadıköy'e bağlıyordu.
export function hasOperatorLinks(html: string | null | undefined): boolean {
  return typeof html === "string" && /<a[\s>]/i.test(html);
}

/** Pilot sayfa = pillar (category_location) ya da operatör vitrini olan sayfa. */
type PilotPageLike = { page_type?: string; intro_html?: string | null; body_blocks?: unknown };

/**
 * Otomatik sözlük enjeksiyonu atlansın mı? YALNIZ pilot sayfalarda ve intro'da elle <a> varsa.
 * Diğer tüm (mevcut) sayfalarda enjeksiyon bugünkü gibi çalışır — çıktıları değişmez.
 */
export function skipAutoLinkInjection(page: PilotPageLike | null | undefined): boolean {
  if (!page) return false;
  const body = page.body_blocks;
  const hasShowcase = Array.isArray(body) && body.some((b) => {
    if (!b || typeof b !== "object" || (b as { type?: unknown }).type !== "showcase") return false;
    const items = (b as { items?: unknown }).items;
    return Array.isArray(items) && items.some((it) => !!it && typeof it === "object" && (it as { active?: unknown }).active !== false && Number.isInteger(Number((it as { product_id?: unknown }).product_id)) && Number((it as { product_id?: unknown }).product_id) > 0);
  });
  const isPilot = page.page_type === "category_location" || hasShowcase;
  return isPilot && hasOperatorLinks(page.intro_html);
}
