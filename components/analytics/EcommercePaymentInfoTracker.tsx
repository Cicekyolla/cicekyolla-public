"use client";

/**
 * EcommercePaymentInfoTracker — DEVRE DIŞI (20 Kas 2026).
 * ---------------------------------------------------------------------------
 * Bu bileşen `add_payment_info` olayını sayfada üç Türkçe metnin ("Havale / EFT",
 * "Ödeme Yöntemi", "Siparişi Oluştur") birlikte görünmesine bağlıyordu.
 * "Siparişi Oluştur" metni arayüzden kaldırıldığı için olay hiç tetiklenmiyordu
 * (GA4 hunisinde "ödeme bilgisi" = 0); 13 dilde ise metinler çevrildiğinden
 * zaten çalışamazdı. Ayrıca ödeme türünü sabit "havale" gönderiyordu.
 *
 * Olay artık ödeme adımının kendisinden, gerçek seçili yöntemle gönderilir:
 * components/checkout/CheckoutWizard.tsx. Çift sayım olmasın diye bu bileşen
 * hiçbir şey yapmaz. Dosya ve dışa aktarım, app/layout.tsx içe aktarımı
 * bozulmasın diye yerinde bırakıldı (yeniden adlandırma / silme yok).
 */
export function EcommercePaymentInfoTracker() {
  return null;
}
