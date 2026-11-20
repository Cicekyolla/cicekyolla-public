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

/** Çerez dizgesinden (document.cookie biçimi) tek çerezin değeri. Saf: test edilebilir. */
function cerezDegeri(cerezler: string, ad: string): string | null {
  const m = cerezler.match(new RegExp("(?:^|; )" + ad + "=([^;]*)"));
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------------------
 * ONAY DURUMU
 *
 * Tek kaynak ConsentManager'ın yazdığı `cy_cookie_prefs` kaydıdır
 * ({"analytics":bool,"marketing":bool,"ts":number}); app/layout.tsx'teki
 * Consent Mode varsayılanı da aynı kaydı okur. Karar yoksa ya da kayıt
 * bozuksa ikisi de REDDEDİLMİŞ sayılır.
 * ------------------------------------------------------------------------ */

/** ConsentManager PREFS_KEY ile BİREBİR aynı olmalı. */
export const COOKIE_PREFS_KEY = "cy_cookie_prefs";

export interface ConsentFlags {
  analytics: boolean;
  marketing: boolean;
}

export function parseConsentPrefs(raw: string | null | undefined): ConsentFlags {
  if (!raw) return { analytics: false, marketing: false };
  try {
    const p = JSON.parse(raw) as { analytics?: unknown; marketing?: unknown } | null;
    return { analytics: p?.analytics === true, marketing: p?.marketing === true };
  } catch {
    return { analytics: false, marketing: false };
  }
}

function onayDurumu(): ConsentFlags {
  try {
    return parseConsentPrefs(window.localStorage.getItem(COOKIE_PREFS_KEY));
  } catch {
    return { analytics: false, marketing: false };
  }
}

/* --------------------------------------------------------------------------
 * gbraid / wbraid OTURUM KAYDI
 *
 * `wbraid` için Dönüşüm Bağlayıcı çerezi okumuyoruz; değer yalnız reklamdan
 * inilen ilk sayfanın URL'inde durur ve sonraki sayfada kaybolurdu. URL'de
 * görüldüğü anda sessionStorage'a yazılır (sekme kapanınca silinir).
 *
 * KURAL: yalnız PAZARLAMA ONAYI VARKEN yazılır ve okunur. Onay yoksa hiçbir
 * şey saklanmaz; onay geri çekilmişse eski kayıt silinir.
 * ------------------------------------------------------------------------ */

export const ADS_CLICK_STORAGE_KEY = "cicekyolla:ads-click";

export interface StoredAdsClick {
  gbraid: string | null;
  wbraid: string | null;
}

type Depo = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function parseStoredAdsClick(raw: string | null | undefined): StoredAdsClick {
  if (!raw) return { gbraid: null, wbraid: null };
  try {
    const p = JSON.parse(raw) as { gbraid?: unknown; wbraid?: unknown } | null;
    return {
      gbraid: gecerliTiklamaKimligi(typeof p?.gbraid === "string" ? p.gbraid : null),
      wbraid: gecerliTiklamaKimligi(typeof p?.wbraid === "string" ? p.wbraid : null),
    };
  } catch {
    return { gbraid: null, wbraid: null };
  }
}

/**
 * URL'deki gbraid / wbraid değerini oturum deposuna yazar. Dönüş: depodaki güncel
 * kayıt; onay yoksa ya da depo kullanılamıyorsa null.
 *  • pazarlama onayı YOK → hiçbir şey yazılmaz, varsa eski kayıt SİLİNİR.
 *  • URL'de geçerli değer yok → depoya dokunulmaz (mevcut kayıt korunur).
 *  • yeni tıklama (URL'de yeni değer) eskisinin üzerine yazar; diğer alan korunur.
 */
export function captureAdsClick(search: string, marketing: boolean, depo: Depo | null): StoredAdsClick | null {
  if (!depo) return null;
  try {
    if (!marketing) {
      depo.removeItem(ADS_CLICK_STORAGE_KEY);
      return null;
    }
    const mevcut = parseStoredAdsClick(depo.getItem(ADS_CLICK_STORAGE_KEY));
    const url = new URLSearchParams(search);
    const gbraid = gecerliTiklamaKimligi(url.get("gbraid"));
    const wbraid = gecerliTiklamaKimligi(url.get("wbraid"));
    if (!gbraid && !wbraid) return mevcut;
    const yeni: StoredAdsClick = { gbraid: gbraid ?? mevcut.gbraid, wbraid: wbraid ?? mevcut.wbraid };
    depo.setItem(ADS_CLICK_STORAGE_KEY, JSON.stringify(yeni));
    return yeni;
  } catch {
    return null;
  }
}

function oturumDeposu(): Depo | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Sayfa açılışında ve onay verildiği anda çağrılır (AdsWhatsAppRef, ConsentManager):
 * URL'deki gbraid / wbraid, ziyaretçi başka sayfaya geçmeden kaydedilsin.
 * Onay yoksa hiçbir şey yazmaz. Asla fırlatmaz.
 */
export function captureAdsClickFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    captureAdsClick(window.location.search, onayDurumu().marketing, oturumDeposu());
  } catch {
    /* depo engelli — akış etkilenmez */
  }
}

/**
 * Okuma önceliği (saf):
 *   gclid  : `_gcl_aw` çerezi → URL
 *   gbraid : `_gcl_gb` çerezi → URL → oturum kaydı
 *   wbraid : URL → oturum kaydı
 * Oturum kaydı YALNIZ pazarlama onayı varken dikkate alınır.
 */
export function resolveAdsAttribution(g: {
  cookie: string;
  search: string;
  stored: StoredAdsClick | null;
  marketing: boolean;
}): AdsAttribution {
  const url = new URLSearchParams(g.search);
  const urlDeger = (ad: string): string | null => gecerliTiklamaKimligi(url.get(ad));
  const kayit = g.marketing ? g.stored : null;
  return {
    gclid: gclDegeri(cerezDegeri(g.cookie, "_gcl_aw")) ?? urlDeger("gclid"),
    gbraid: gclDegeri(cerezDegeri(g.cookie, "_gcl_gb")) ?? urlDeger("gbraid") ?? kayit?.gbraid ?? null,
    wbraid: urlDeger("wbraid") ?? kayit?.wbraid ?? null,
  };
}

/** `GCL.1724750000.Cj0KCQ...` → `Cj0KCQ...` (ilk iki parça zaman damgasıdır). */
function gclDegeri(ham: string | null): string | null {
  if (!ham) return null;
  const parcalar = ham.split(".");
  const deger = parcalar.length >= 3 ? parcalar.slice(2).join(".") : ham;
  return gecerliTiklamaKimligi(deger);
}

/**
 * 15 Kas 2026: canlı siparişe gclid="test123" yazıldı — değer hiç doğrulanmıyordu. Gerçek Google tıklama kimlikleri
 * uzundur ve yalnız harf/rakam/'-'/'_'/'.' içerir; biçime uymayan değer (elle yazılmış test parametresi vb.) yok sayılır.
 * API aynı kuralı ikinci kez uygular (ordersValidation.cleanAdsClickId).
 */
export function gecerliTiklamaKimligi(deger: string | null | undefined): string | null {
  if (!deger) return null;
  const v = deger.trim();
  return /^[A-Za-z0-9._-]{20,255}$/.test(v) ? v : null;
}

/**
 * KULLANIM ANINDA çağrılır (sipariş gövdesi kurulurken, WhatsApp tıklamasında) —
 * mount'ta DEĞİL: `_gcl_aw` çerezi sayfa yüklendikten kısa süre sonra yazılır,
 * erken okuyan boş görür. Çerezler, URL ve oturum kaydı her çağrıda taze okunur.
 */
export function readAdsAttribution(): AdsAttribution {
  if (typeof document === "undefined") return BOS;
  try {
    const marketing = onayDurumu().marketing;
    // URL hâlâ gbraid / wbraid taşıyorsa (ve onay varsa) bu çağrı da kaydeder.
    const stored = captureAdsClick(window.location.search, marketing, oturumDeposu());
    return resolveAdsAttribution({ cookie: document.cookie, search: window.location.search, stored, marketing });
  } catch {
    return BOS;
  }
}

/* --------------------------------------------------------------------------
 * GA4 İSTEMCİ KİMLİĞİ
 *
 * Havale ödemesi günler sonra panelden onaylanır; API o anda GA4'e çevrimdışı
 * `purchase` gönderir. Müşterinin GA istemci kimliği siparişle birlikte giderse
 * o gelir müşterinin oturumuna / trafik kaynağına bağlanabilir.
 *
 * KURAL: yalnız ANALİTİK ONAYI VARKEN okunur ve gönderilir; onay yoksa alan
 * sipariş gövdesine HİÇ eklenmez. `_ga=GA1.1.<a>.<b>` → "<a>.<b>".
 * ------------------------------------------------------------------------ */

/** API'deki ordersValidation.cleanGaClientId ile aynı kural. */
export function gecerliGaIstemciKimligi(deger: string | null | undefined): string | null {
  if (!deger) return null;
  const v = deger.trim();
  return /^\d{1,12}\.\d{1,12}$/.test(v) ? v : null;
}

/** Çerez dizgesinden GA istemci kimliği; `_ga` yoksa / biçim bozuksa null. `_ga_<ID>` çerezleri sayılmaz. */
export function parseGaClientId(cerezler: string | null | undefined): string | null {
  const ham = cerezDegeri(cerezler ?? "", "_ga");
  if (!ham) return null;
  const m = /^GA\d+\.\d+\.(\d+\.\d+)$/.exec(ham.trim());
  return m ? gecerliGaIstemciKimligi(m[1]) : null;
}

/** Sipariş gövdesine yayılır: analitik onayı ve geçerli kimlik varsa `{ ga_client_id }`, yoksa `{}`. */
export function gaClientIdField(cerezler: string | null | undefined, analytics: boolean): { ga_client_id?: string } {
  if (!analytics) return {};
  const id = parseGaClientId(cerezler);
  return id ? { ga_client_id: id } : {};
}

/** Kullanım anında (sipariş gövdesi kurulurken) çağrılır. Asla fırlatmaz. */
export function readGaClientIdField(): { ga_client_id?: string } {
  if (typeof document === "undefined") return {};
  try {
    return gaClientIdField(document.cookie, onayDurumu().analytics);
  } catch {
    return {};
  }
}

/* --------------------------------------------------------------------------
 * WhatsApp geçişinde reklam kaynağını taşıma.
 *
 * Sitedeki wa.me bağlantıları sunucuda üretiliyor; tıklama kimliği ise yalnız
 * tarayıcıda bilinir. Bu yüzden bağlantı tıklama anında zenginleştirilir.
 * Etiket biçimi API tarafındaki `bridgeExtractAdsRef` deseniyle BİREBİR aynı.
 * ------------------------------------------------------------------------ */

/**
 * Etikete yazılacak değer. gclid ÖNEKSİZ gider (eski biçim; eski API de anlar).
 * gbraid "gb.", wbraid "wb." önekiyle gider ki API türü ayırabilsin
 * (bridgeExtractAdsClick) — eskiden üçü de gclid sanılıyordu.
 * Öncelik: açılış sayfasındaki URL gclid'i → gclid → gbraid → wbraid.
 */
export function whatsAppRefFor(attr: AdsAttribution, urlGclid?: string | null): string | null {
  const gclid = gecerliTiklamaKimligi(urlGclid) || attr.gclid;
  if (gclid) return gclid;
  if (attr.gbraid) return `gb.${attr.gbraid}`;
  if (attr.wbraid) return `wb.${attr.wbraid}`;
  return null;
}

/** WhatsApp hazır mesajına eklenen etiketin başlangıcı. */
export const WA_REF_ETIKETI = "[ref:";

function waBaglantisiMi(url: URL): boolean {
  return url.hostname === "wa.me" || url.hostname === "api.whatsapp.com";
}

/**
 * Verilen href bir WhatsApp bağlantısı mı?
 *
 * `withWhatsAppRef` yalnız REKLAMDAN gelen ziyaretçide iş yapar (referans
 * yoksa null döner), ama dönüşüm ölçümü HER WhatsApp tıklamasını görmelidir.
 * Bu yüzden tespit ayrı bir fonksiyon olarak dışa açıldı; iki tarafın da aynı
 * host listesini kullanması şart, yoksa ölçülen ile zenginleştirilen tıklama
 * kümesi ayrışır.
 */
export function isWhatsAppHref(href: string, taban: string): boolean {
  try {
    return waBaglantisiMi(new URL(href, taban));
  } catch {
    return false;
  }
}

/**
 * `href` bir WhatsApp bağlantısıysa hazır metnin sonuna referans satırı
 * eklenmiş yeni URL'i döndürür. WhatsApp bağlantısı değilse, çözümlenemiyorsa
 * veya etiket zaten varsa `null` döner — çağıran taraf o zaman hiçbir şey
 * değiştirmez.
 */
export function withWhatsAppRef(href: string, ref: string, taban: string): string | null {
  let url: URL;
  try {
    url = new URL(href, taban);
  } catch {
    return null;
  }
  if (!waBaglantisiMi(url)) return null;

  const mevcut = url.searchParams.get("text") ?? "";
  if (mevcut.includes(WA_REF_ETIKETI)) return null; // ikinci kez eklenmesin

  // ONEMLI: referans AYNI SATIRA eklenir. Alt satir denendi ve canlida basarisiz
  // oldu: WhatsApp hazir metni gonderirken ilk satirdan sonrasini dusuruyor —
  // yazma ekraninda iki satir gorunuyor, karsi tarafa yalniz ilk satir ulasiyordu
  // (27 Agu 2026, uc gercek mesajla dogrulandi).
  url.searchParams.set("text", `${mevcut}${mevcut ? " " : ""}${WA_REF_ETIKETI} ${ref}]`);
  return url.toString();
}
