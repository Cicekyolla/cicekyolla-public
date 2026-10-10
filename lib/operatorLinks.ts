// Operatör bağlantısı denetimi (saf). intro_html içinde elle yazılmış en az bir <a> varsa
// sayfa "elle bağlantı yönetilen" sayılır ve otomatik sözlük enjeksiyonu HİÇ çalışmaz.
// Gerekçe: otomatik sözlük "İstanbul"u Tuzla'da bir mahalleye, "Feneryolu"yu Kadıköy'e bağlıyordu.
import { isOperatorManaged } from "./managedSeoContent.ts";

export function hasOperatorLinks(html: string | null | undefined): boolean {
  return typeof html === "string" && /<a[\s>]/i.test(html);
}

/** Pilot sayfa = pillar (category_location), operatör vitrini olan sayfa ya da OPERATÖR-ONAYLI içerikli sayfa. */
type PilotPageLike = { page_type?: string; intro_html?: string | null; body_blocks?: unknown; content_source?: string | null };

/**
 * Pilot sayfa mı? category_location, en az bir aktif vitrin öğesi ya da operatör-onaylı içerik kaynağı.
 * DÜZELTME (10 Eki 2026): içerik gösterimi vitrinde ürün SEÇİLMİŞ olmasına bağlıydı. Otomatik (kategori kaynaklı,
 * items boş) vitrinli 995 İstanbul sayfasında operatörün yazdığı içerik pilot sayılmıyor; otomatik sözlük yanlış
 * bağ basıyor ve intro biçimi (.cy-intro) gelmiyordu. Ölçüt artık içeriğin kendisi: title/meta/H1 ile AYNI kapı
 * (lib/managedSeoContent.ts). Şablon (kaynak NULL) ve otomatik AI içeriği kapı dışında → o sayfalar bugünkü gibi.
 */
export function isPilotPage(page: PilotPageLike | null | undefined): boolean {
  if (!page) return false;
  const body = page.body_blocks;
  const hasShowcase = Array.isArray(body) && body.some((b) => {
    if (!b || typeof b !== "object" || (b as { type?: unknown }).type !== "showcase") return false;
    const items = (b as { items?: unknown }).items;
    return Array.isArray(items) && items.some((it) => !!it && typeof it === "object" && (it as { active?: unknown }).active !== false && Number.isInteger(Number((it as { product_id?: unknown }).product_id)) && Number((it as { product_id?: unknown }).product_id) > 0);
  });
  return page.page_type === "category_location" || hasShowcase || isOperatorManaged(page.content_source);
}

/**
 * Otomatik sözlük enjeksiyonu atlansın mı? YALNIZ pilot sayfalarda ve intro'da elle <a> varsa.
 * Diğer tüm (mevcut) sayfalarda enjeksiyon bugünkü gibi çalışır — çıktıları değişmez.
 */
export function skipAutoLinkInjection(page: PilotPageLike | null | undefined): boolean {
  return isPilotPage(page) && hasOperatorLinks(page?.intro_html);
}

/** İntro sarmalayıcı sınıfları: "cy-intro" yalnız pilot sayfada; diğerlerinde HTML bugünkü gibi. */
export function introWrapperClass(page: PilotPageLike | null | undefined): string {
  return isPilotPage(page) ? "cy-intro space-y-6 text-lg leading-8" : "space-y-6 text-lg leading-8";
}
