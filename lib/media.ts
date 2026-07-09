// ---------------------------------------------------------------------------
// MEDYA URL ÇÖZÜCÜ — Cloudflare R2 public "dev" URL'i (pub-*.r2.dev) Türkiye
// ağlarında/ISP'lerinde bağlantı reset'i (ERR_CONNECTION_RESET) alıyor. Dosya
// R2'de MEVCUT ve dünyaca erişilebilir; yalnız r2.dev alan adı TR'de bloklanıyor.
//
// Çözüm (DNS'e dokunmadan, additive): r2.dev URL'lerini same-origin bir yola
// (`/r2/...`) çeviriyoruz. next.config.js'teki rewrite bu yolu Vercel edge
// üzerinden R2'ye proxy'liyor. Böylece TR müşterisi yalnız Vercel'i görür,
// r2.dev'e hiç bağlanmaz → görsel/video açılır.
//
// Kalıcı ideal çözüm: R2 bucket'a özel alan adı (cdn.cicekyolla.com.tr) bağlayıp
// MEDIA_CDN_BASE ile servis etmek. DNS başka sağlayıcıda olduğu için şimdilik
// bu proxy kullanılıyor; özel domain hazır olunca bu helper devre dışı bırakılır.
//
// Harici URL'ler (unsplash vb.) ve göreli yollar (/uploads, /r2) AYNEN korunur.
// ---------------------------------------------------------------------------

/** r2.dev mutlak URL'ini same-origin `/r2/<key>` yoluna çevirir; diğer her şeyi olduğu gibi bırakır. */
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  // Göreli/same-origin ya da zaten proxy'lenmiş yol → dokunma.
  if (url.startsWith("/")) return url;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith(".r2.dev")) {
      return `/r2${u.pathname}${u.search}`;
    }
  } catch {
    // Parse edilemeyen (zaten göreli olabilir) değeri olduğu gibi döndür.
    return url;
  }
  return url; // harici (unsplash/CDN) URL'ler değişmeden geçer
}

/** null'ı koruyan varyant: liste öğelerinde cover_image_url: string | null için. */
export function mediaUrlOrNull(url: string | null | undefined): string | null {
  if (url == null || url === "") return url ?? null;
  return mediaUrl(url);
}
