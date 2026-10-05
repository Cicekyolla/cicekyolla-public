// =============================================================================
// JSON-LD'yi <script type="application/ld+json"> gövdesine GÜVENLE gömme.
//
// KÖK NEDEN: JSON-LD metni dangerouslySetInnerHTML ile basılır. İçinde geçen bir
// `</script>` (ya da `<!--`) dizisi — Admin / CMS / AI metni: SSS cevabı, H1,
// kayıtlı schema_jsonld — script etiketini ERKEN KAPATIR; kalan metin sayfaya
// işaretleme olarak düşer (şema bozulur, markup enjekte olur).
//
// KURAL: `<` her zaman `<` olarak yazılır. JSON'da `<` yalnız string
// değerlerin içinde bulunabilir ve `<` aynı karakterin geçerli JSON
// kaçışıdır → JSON.parse sonucu BİREBİR aynıdır; şema içeriği değişmez.
//
// Bağımlılığı yoktur (sunucu ve istemci bileşenlerinden güvenle içe aktarılır).
// Ürün sayfalarının kullandığı serializeJsonLd (lib/productSchema.ts) aynı kuralı
// uygular; bu modül aynı korumayı diğer bütün JSON-LD çıkışlarına taşır.
// =============================================================================

/** Önceden serileştirilmiş JSON-LD METNİNİ script gövdesi için güvenli hâle getirir (idempotent). */
export function escapeJsonLdText(json: string): string {
  return json.replace(/</g, "\\u003c");
}

/** Bir değeri JSON-LD olarak serileştirir ve script gövdesi için güvenli hâle getirir. */
export function safeJsonLd(value: unknown): string {
  return escapeJsonLdText(JSON.stringify(value));
}
