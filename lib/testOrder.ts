/**
 * Test siparişi → reklam dönüşümü YOK (sprint ödeme-akışı-v1.2, 16 Kas 2026).
 * ---------------------------------------------------------------------------
 * Test ürünüyle verilen sipariş gerçek satış değildir; GA4 / Google Ads / Meta Pixel'e
 * "purchase" olarak gitmemelidir (sunucu tarafında Ads yüklemesi ve Meta CAPI de atlanır).
 *
 * İki sinyal, hangisi varsa:
 *  1. API'nin bayrağı (`conversion_excluded`) — operatörün elle "🧪 Test Siparişi" işaretlediği sipariş dahil.
 *  2. Ürün adı kuralı — API'nin sipariş oluştururken kullandığı AYNI kural (ordersRepository.isTestProductName):
 *     ad BÜYÜK HARFLE "TEST" ile başlar ve ardından harf gelmez. "Testere", "Test Buketi" eşleşmez.
 */
export function isTestProductName(name: string | null | undefined): boolean {
  return typeof name === "string" && /^\s*TEST(?![A-Za-zÇĞİÖŞÜçğıöşü])/.test(name);
}

export function isTestPurchase(
  items: ReadonlyArray<{ product_name?: string | null }> | null | undefined,
  conversionExcluded?: boolean | null,
): boolean {
  if (conversionExcluded === true) return true;
  return Array.isArray(items) && items.some((it) => isTestProductName(it?.product_name));
}

/** Atlanan dönüşüm için konsol satırı (sunucu günlüğündeki ifadeyle aynı). */
export const TEST_ORDER_SKIP_LOG = "test siparişi — dönüşüm atlandı";
