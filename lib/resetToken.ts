// ---------------------------------------------------------------------------
// resetToken.ts — şifre belirleme bağlantısındaki tek kullanımlık token'ın
// URL'den OKUNMASI ve URL'den SİLİNMESİ (DESIGN §3.A.9).
//
// NEDEN VAR: bağlantı bugün `/sifre-belirle?token=…` biçiminde geliyor. Query
// string'deki token (a) sunucu erişim kayıtlarına, (b) `Referer` başlığıyla
// üçüncü taraflara, (c) GTM/GA4'ün `page_location` alanına düşer. Yani tek
// kullanımlık bir hesap devralma anahtarı analitik sistemine yazılır.
//
// API tarafı (passwordResetService.resetLinkUsesFragment) `RESET_LINK_FRAGMENT`
// bayrağıyla `#token=` biçimine geçer; fragment sunucuya ve Referer'a HİÇ
// gitmez. Bayrak yalnız BU okuyucu canlı olduktan sonra açılabilir, bu yüzden
// burada İKİ biçim de okunur: önce `#token=`, sonra `?token=`.
//
// Okunduktan sonra token `history.replaceState` ile adres çubuğundan silinir.
// Silme işini sayfanın gövdesindeki satır içi script yapar (GTM'in async
// gtm.js'i page_view yollamadan önce, HTML ayrıştırma sırasında çalışır);
// React tarafı yalnız script'in bıraktığı değeri okur ve kendi yedeğini çalıştırır.
// ---------------------------------------------------------------------------

/** Token `randomBytes(32).toString('base64url')` → 43 karakter, URL-güvenli. */
const TOKEN_RE = /^[A-Za-z0-9_-]{20,200}$/;

/** Satır içi script'in token'ı bıraktığı global. Okunduktan sonra silinir. */
export const RESET_TOKEN_GLOBAL = "__cyResetToken";

export function isPlausibleResetToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_RE.test(value);
}

/** `#token=abc` / `#abc` / `?token=abc` → 'abc'. Geçersiz biçim → null. */
export function extractResetToken(location: { hash?: string; search?: string }): string | null {
  const hash = (location.hash ?? "").replace(/^#/, "");
  if (hash) {
    const fromHash = new URLSearchParams(hash).get("token");
    if (isPlausibleResetToken(fromHash)) return fromHash;
    // Bazı istemciler `#<token>` biçiminde de paylaşabiliyor.
    if (isPlausibleResetToken(hash)) return hash;
  }
  const fromQuery = new URLSearchParams((location.search ?? "").replace(/^\?/, "")).get("token");
  return isPlausibleResetToken(fromQuery) ? fromQuery : null;
}

/**
 * Token silinmiş, geri kalan sorgu parametreleri KORUNMUŞ adres.
 * (utm_* gibi parametreler kaybolursa atıf bozulur.)
 */
export function urlWithoutResetToken(location: {
  pathname?: string;
  search?: string;
  hash?: string;
}): string {
  const params = new URLSearchParams((location.search ?? "").replace(/^\?/, ""));
  params.delete("token");
  const query = params.toString();
  const hashParams = new URLSearchParams((location.hash ?? "").replace(/^#/, ""));
  hashParams.delete("token");
  const hashRest = hashParams.toString();
  const path = location.pathname || "/";
  return `${path}${query ? `?${query}` : ""}${hashRest ? `#${hashRest}` : ""}`;
}

/**
 * Sayfanın EN BAŞINA basılan satır içi script. Tek işi: token'ı bir global'e
 * taşımak ve adres çubuğundan silmek. React yüklenmesini beklemez.
 *
 * Not: `history.replaceState` erişilemezse (eski tarayıcı, sandbox) sessizce
 * geçer — sayfa yine çalışır, yalnız adres temizlenmez.
 */
export function resetTokenStripScript(): string {
  return [
    "(function(){try{",
    "var l=window.location;",
    "var h=(l.hash||'').replace(/^#/,'');",
    "var t=new URLSearchParams(h).get('token')||'';",
    "if(!t&&/^[A-Za-z0-9_-]{20,200}$/.test(h))t=h;",
    "if(!t)t=new URLSearchParams(l.search||'').get('token')||'';",
    "if(!/^[A-Za-z0-9_-]{20,200}$/.test(t))return;",
    `window.${RESET_TOKEN_GLOBAL}=t;`,
    "var p=new URLSearchParams(l.search||'');p.delete('token');",
    "var hp=new URLSearchParams(h);hp.delete('token');",
    "var q=p.toString();var hr=hp.toString();",
    "history.replaceState(null,'',l.pathname+(q?'?'+q:'')+(hr?'#'+hr:''));",
    "}catch(e){}})();",
  ].join("");
}

/**
 * İstemci tarafı okuma: önce satır içi script'in bıraktığı global, sonra URL.
 * Global okunur okunmaz SİLİNİR (sayfada gereksiz yere durmasın).
 */
export function takeResetToken(win: Record<string, unknown> & { location?: { hash?: string; search?: string } }): string | null {
  const fromScript = win[RESET_TOKEN_GLOBAL];
  if (isPlausibleResetToken(fromScript)) {
    delete win[RESET_TOKEN_GLOBAL];
    return fromScript;
  }
  return win.location ? extractResetToken(win.location) : null;
}
