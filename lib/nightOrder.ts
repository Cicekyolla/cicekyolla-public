/**
 * GECE ÇİÇEK SİPARİŞİ — tek kaynak metinler.
 *
 * Hazır WhatsApp mesajı operatör tarafından KESİN olarak belirlenmiştir
 * (3 Eyl 2026): müşteri iki nokta üst üsteden sonra istediği saati kendisi
 * yazar. Sabit saat, garanti, süre veya fiyat vaadi BURAYA YAZILMAZ; gece
 * servisi yalnız "bilgi al" akışıdır.
 *
 * Numara kaynağı `lib/payment.ts::SUPPORT_WHATSAPP`tır; ikinci bir numara
 * sabiti üretilmez, bileşen tabanı parametre olarak verir. Reklamdan gelen
 * ziyaretçide `AdsWhatsAppRef` mevcut `text` parametresinin sonuna
 * "[ref: gclid]" ekler (site geneli davranış, burada tekrar yapılmaz).
 */
export const GECE_SIPARIS = {
  baslik: "Gece Çiçek Siparişi",
  rozet: "İstanbul İçi Özel Servis",
  aciklama: "Gece saatlerinde çiçek göndermek isterseniz uygunluk ve seçenekler için bize yazın.",
  cta: "WhatsApp'tan Bilgi Al",
  hazirMesaj: "Merhaba, gece çiçek teslimatı hakkında bilgi almak istiyorum. İstediğim teslimat saati:",
} as const;

/** `taban` = wa.me bağlantısı (SUPPORT_WHATSAPP). Hazır mesaj `text` olarak eklenir. */
export function nightOrderWhatsAppHref(taban: string): string {
  const url = new URL(taban);
  url.searchParams.set("text", GECE_SIPARIS.hazirMesaj);
  return url.toString();
}
