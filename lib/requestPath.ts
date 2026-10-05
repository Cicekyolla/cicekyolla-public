// =============================================================================
// İsteğin yolu — kök layout'ta, sayfayı DİNAMİK yapmadan.
//
// Kök layout bir sunucu bileşenidir ve belgelenmiş API'lerle (headers(), cookies())
// yolu okumak BÜTÜN rotaları dinamik çizime zorlar (Türkçe sayfaların ISR / statik
// üretimi biter). Bunun yerine Next'in çizim sırasında zaten tuttuğu depodan
// (staticGenerationAsyncStorage) yalnız `urlPathname` OKUNUR: okuma pasiftir,
// rotanın statik / ISR / dinamik kararını DEĞİŞTİRMEZ.
//
// DİKKAT — Next İÇ modülüdür (sürüm: next@14.2.5, package.json'da sabit):
//   • Modül yolu kalkarsa derleme HATA verir (sessizce bozulmaz).
//   • Depo / alan yoksa ya da okuma hata verirse null döner → çağıran "tr" basar
//     (düzeltmeden önceki davranış). Baştaki dil betiği (app/layout.tsx cy-lang-dir)
//     yerinde durur ve istemcide aynı değeri kurar.
//   • Next sürümü yükseltilirken lib/htmlLang.test.ts içindeki bağlantı denetimi ve
//     tam evren taraması (13 dil × ürün / kategori / lokasyon) yeniden koşulmalıdır.
// =============================================================================
import { staticGenerationAsyncStorage } from "next/dist/client/components/static-generation-async-storage.external";

/** Çizilen isteğin yolu (sorgu dizesi içerebilir); okunamazsa null. */
export function currentRequestPath(): string | null {
  try {
    const path = staticGenerationAsyncStorage.getStore()?.urlPathname;
    return typeof path === "string" && path.startsWith("/") ? path : null;
  } catch {
    return null;
  }
}
