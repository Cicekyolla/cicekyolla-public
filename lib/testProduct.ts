// lib/testProduct.ts — TEST ürünü ad kuralı (ADDITIVE, 16 Kas 2026).
// API'deki kuralla AYNI (ordersRepository.isTestProductName): ad BÜYÜK HARFLE "TEST" ile başlar
// ve ardından harf gelmez ("TEST — …", "TEST: …", "TEST 2"). "Testere", "Test Buketi", "TESTİ" eşleşmez.
// Test ürünü herkese açık listelerde, aramada ve ürün akışında (merchant feed) GÖSTERİLMEZ;
// ürün aktif kalır, doğrudan linki (/urun/:slug) çalışır.

export function isTestProductName(name: string | null | undefined): boolean {
  return typeof name === "string" && /^\s*TEST(?![A-Za-zÇĞİÖŞÜçğıöşü])/.test(name);
}

/** Listeden test ürünlerini çıkarır (sıra korunur). */
export function withoutTestProducts<T extends { name?: string | null }>(items: T[]): T[] {
  return items.filter((it) => !isTestProductName(it.name));
}
