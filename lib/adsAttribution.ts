/* Google Ads tıklama kimliğini sipariş anında okur.
 *
 * Neden gerekli: reklamdan gelen ziyaretçinin URL'indeki `gclid` yalnız o
 * sayfada durur. Sipariş checkout'ta oluşur, ödeme onayı ise havalede saatler
 * sonra (tarayıcı yokken) gelir. Değeri siparişle birlikte saklamazsak tıklama
 * ile satış arasındaki bağ kopar.
 *
 * Kaynak: GTM Conversion Linker'ın yazdığı `_gcl_aw` çerezi — `GCL.<ts>.<gclid>`
 * biçiminde. Çerez yalnız pazarlama onayı verildiğinde yazılır; onay yoksa
 * null döner ve sipariş bugünkü gibi akar. metaPixel.ts'teki readMetaAttribution
 * ile aynı desen, ayrı bir attribution sistemi DEĞİL.
 */
export interface AdsAttribution {
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
}

const BOS: AdsAttribution = { gclid: null, gbraid: null, wbraid: null };

function cerez(ad: string): string | null {
  const m = document.cookie.match(new RegExp("(?:^|; )" + ad + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

/** `GCL.1724750000.Cj0KCQ...` → `Cj0KCQ...` (ilk iki parça zaman damgasıdır). */
function gclDegeri(ham: string | null): string | null {
  if (!ham) return null;
  const parcalar = ham.split(".");
  const deger = parcalar.length >= 3 ? parcalar.slice(2).join(".") : ham;
  return deger ? deger.slice(0, 255) : null;
}

export function readAdsAttribution(): AdsAttribution {
  if (typeof document === "undefined") return BOS;
  try {
    // gbraid/wbraid çerezleştirilmiyor; hâlâ URL'deyse aynı anda yakalanır.
    const url = new URLSearchParams(window.location.search);
    const urlDeger = (ad: string): string | null => {
      const v = url.get(ad);
      return v ? v.slice(0, 255) : null;
    };
    return {
      gclid: gclDegeri(cerez("_gcl_aw")) ?? urlDeger("gclid"),
      gbraid: gclDegeri(cerez("_gcl_gb")) ?? urlDeger("gbraid"),
      wbraid: urlDeger("wbraid"),
    };
  } catch {
    return BOS;
  }
}
