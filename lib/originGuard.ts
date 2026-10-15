/* ADDITIVE (GÜVENLİK — yetkisiz ayna/ters proxy koruması, 14 Eki 2026 olayı).
   Üçüncü taraf bir ters proxy siteyi kendi alan adında canlı yayınladı; HTML ve
   JS içindeki alan adı metnini kendi adıyla değiştiriyordu. Bu modül iki dar
   katman sağlar; ikisi de saf fonksiyondur ve hata durumunda AÇIK kalır
   (fail-open) — gerçek müşteri akışı hiçbir koşulda bu yüzden kesilmez:

   1) isForeignOriginWrite — SUNUCU katmanı (middleware). Durum değiştiren bir
      /api isteği başka bir sitenin Origin'iyle gelirse reddedilir. Tarayıcı
      Origin başlığını sayfanın GERÇEK adresinden üretir; ayna sitedeki müşteri
      formu bu yüzden aynanın adını taşır. Proxy bu başlığı kendisi yeniden
      yazarsa bu katman tek başına yetmez (bkz. PR açıklaması).
      Origin'siz istekler (sunucudan sunucuya çağrılar, ödeme geri bildirimleri)
      ve aynı alan adından gelenler (production, preview, localhost) ETKİLENMEZ.

   2) hostGuardScript — İSTEMCİ katmanı. Sayfa izinli olmayan bir alan adında
      açılmışsa ziyaretçiyi aynı yol + sorguyla resmî siteye taşır. Üretilen
      betikte resmî alan adı METİN olarak geçmez (yalnız sayılar), böylece
      proxy'nin metin değiştirmesi betiği bozamaz. */

export const CANONICAL_HOSTS = ["www.cicekyolla.com.tr", "cicekyolla.com.tr"] as const;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type HeaderReader = { get(name: string): string | null };

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/** Yabancı Origin'in alan adını döndürür; istek meşruysa null. */
export function foreignOriginHost(method: string, headers: HeaderReader): string | null {
  if (SAFE_METHODS.has(method.toUpperCase())) return null;
  const originHost = hostOf(headers.get("origin"));
  // Origin yok / "null" / ayrıştırılamıyor → karar verilemez, istek geçer.
  if (!originHost) return null;
  const requestHost = (headers.get("host") ?? "").toLowerCase();
  if (requestHost && originHost === requestHost) return null;
  if ((CANONICAL_HOSTS as readonly string[]).includes(originHost)) return null;
  return originHost;
}

export function isForeignOriginWrite(method: string, headers: HeaderReader): boolean {
  return foreignOriginHost(method, headers) !== null;
}

/** FNV-1a 32 bit — yalnız alan adı eşlemesi için (güvenlik özeti değildir). */
export function hostHash(host: string): number {
  let hash = 2166136261;
  for (let i = 0; i < host.length; i++) {
    hash ^= host.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

export function hostGuardScript(): string {
  const hashes = CANONICAL_HOSTS.map(hostHash).join(",");
  const codes = Array.from(CANONICAL_HOSTS[0], (ch) => ch.charCodeAt(0)).join(",");
  return (
    "(function(){try{var h=location.hostname.toLowerCase();" +
    'if(h==="localhost"||h==="127.0.0.1"||h==="[::1]"||/\\.vercel\\.app$/.test(h)||/\\.translate\\.goog$/.test(h))return;' +
    "var x=2166136261;for(var i=0;i<h.length;i++){x^=h.charCodeAt(i);x=Math.imul(x,16777619)>>>0}" +
    `if([${hashes}].indexOf(x)>-1)return;` +
    `var t=String.fromCharCode(${codes});` +
    'location.replace("https://"+t+location.pathname+location.search)}catch(e){}})();'
  );
}
