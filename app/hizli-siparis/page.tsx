import { redirect } from "next/navigation";

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
 * Geçici (307) yönlendirme: karar geri alınabilir kalsın ve arama motorları
 * kalıcı bir sinyal almasın. Sayfa zaten noindex idi, SEO etkisi yok.
 */
export const dynamic = "force-dynamic";

export default async function HizliSiparisRedirect({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const slug = (await searchParams).product;
  redirect(slug ? `/urun/${encodeURIComponent(slug)}` : "/");
}
