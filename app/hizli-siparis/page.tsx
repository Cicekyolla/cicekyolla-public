import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

/**
 * /hizli-siparis — ARTIK AYRI BİR MÜŞTERİ YOLU DEĞİLDİR.
 * ---------------------------------------------------------------------------
 * TEK KAPI / TEK HUNİ kararı: sipariş yalnız ürün sayfasındaki tek "Sipariş Ver"
 * CTA'sı ile başlar (ürün → nereye → tarih → saat/kargo → Sipariş Ver → Sepet →
 * hesap → bilgiler → kontrol → ödeme). İkinci bir checkout girişi bırakılmadı.
 *
 * Route BİLEREK SİLİNMEDİ: eski bağlantılar (paylaşılmış link, WhatsApp mesajı,
 * tarayıcı geçmişi, giriş sonrası dönüş adresi) 404 görmesin. Bunun yerine
 * huninin doğru başlangıcına — ürün sayfasına — yönlendirilir; teslimat seçimi
 * orada yapılır. Ürün bilinmiyorsa ana sayfaya düşer.
 *
 * KALICI (308) yönlendirme: tek huni kalıcı bir karardır, arama motorlarına da
 * öyle bildirilir. 308, 307'den farklı olarak indeks sinyalini hedef URL'e
 * (/urun/[slug]) taşır; ~132 eski /hizli-siparis URL'i kaynakta asılı kalmaz.
 * DİKKAT: 308 tarayıcıda agresif önbelleklenir — karar geri alınırsa eski
 * ziyaretçilerde yönlendirme bir süre daha sürebilir.
 *
 * robots noindex BİLEREK KORUNDU: redirect gövdesiz döner ve normalde
 * indekslenecek içerik yoktur, ancak sayfa daha önce açıkça `noindex, follow`
 * ile yayınlanmıştı. Yönlendirmenin herhangi bir nedenle uygulanmadığı durumda
 * (bot davranışı, ara katman, önbellek) bu 132 URL'in indekse geri sızmaması
 * için işaret yerinde bırakıldı. follow açık: hedef ürün sayfası taranabilsin.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function HizliSiparisRedirect({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const slug = (await searchParams).product;
  permanentRedirect(slug ? `/urun/${encodeURIComponent(slug)}` : "/");
}
