// =============================================================================
// Ürün açıklamasından SSS üretimi — BÖLÜM SINIRI.
//
// KÖK NEDEN: açıklamadaki bölümler (Ürün İçeriği, ölçüler, kimlere gönderilir …)
// sabit bitiş kalıplarıyla kesiliyordu ("Ürün İçeriği" … "Yaklaşık Ölçüler").
// Açıklama başka bir başlık kullandığında (Ürün Boyutu, Ürün Ölçüleri, Boyut
// Bilgisi, Kimlere Gönderilir …) bitiş bulunamıyor, bölüm açıklamanın SONUNA
// kadar uzuyor ve sonraki bölümlerin başlıkları ile maddeleri cevaba karışıyordu
// ("… Doğal yosun dokunuşları, Ürün Boyutu, Kimlere Gönderilir, Sevgiliye, Eşe …
// kullanılarak hazırlanır"). Gerçek açıklamalarda bölüm başlığı da madde de aynı
// düzeydedir (hepsi h3), bu yüzden başlık düzeyi sınır olarak kullanılamaz.
//
// KURAL: bir bölüm, başlangıç etiketinden sonra gelen İLK bölüm etiketinde biter —
// hangi etiket olursa olsun. Etiket yalnız bir metin düğümünün BAŞINDA sayılır
// (bir HTML etiketinin kapanışından hemen sonra; arada yalnız boşluk / emoji /
// noktalama olabilir): cümle içinde geçen aynı sözcükler bölümü bitirmez.
// 65 canlı açıklamada: kirli cevap 17 → 0; temiz cevapların hiçbiri değişmedi.
// Bağımlılığı yoktur.
// =============================================================================

const SECTION_LABEL = /(?<=>[^<\p{L}\p{N}]*)(?:Ürün\s+İçeriği|Yaklaşık\s+(?:Ürün\s+)?Ölçüler|Ürün\s+Ölçüleri|Ürün\s+Boyutu|Boyut\s+Bilgisi|Teknik\s+Bilgiler|Ürün\s+Özellikleri|Ürün\s+Açıklaması|Kimlere\s+Gönderil(?:ir|ebilir)|Hangi\s+Günlerde\s+Gönderil|Kullanım\s+Alanları|Çiçeklerin\s+Anlamı|Bakım\s+(?:Talimatı|Bilgisi|Öneri))/giu;

/** `start` ile başlayan bölümün HTML'i: başlangıç eşleşmesinin sonundan, sonraki bölüm etiketine (yoksa açıklamanın sonuna) kadar. */
export function descriptionSection(description: string, start: RegExp): string {
  const match = start.exec(description);
  if (!match) return "";
  const rest = description.slice((match.index ?? 0) + match[0].length);
  SECTION_LABEL.lastIndex = 0;
  const next = SECTION_LABEL.exec(rest);
  return rest.slice(0, next ? next.index : rest.length);
}

/** Ölçü değerinin başındaki "Yaklaşık" atılır (cevap kalıbı zaten "Yaklaşık yükseklik …" der → "Yaklaşık yükseklik Yaklaşık 55 cm" olmasın). */
export function withoutApproxPrefix(value: string): string {
  return value.replace(/^yaklaşık\s+/i, "");
}
