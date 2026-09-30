// ---------------------------------------------------------------------------
// COUPON STATE — kupon isteğinin SAF gövde kurucuları + API yanıtı okuyucusu.
//
// NEDEN AYRI MODÜL: indirim tutarı, geçerlilik ve müşteriye gösterilen metin
// DAİMA backend indirim motorundan gelir. Burada hiçbir iş kuralı yeniden
// hesaplanmaz; yalnız (a) motora gönderilecek gövde kurulur, (b) motorun
// yanıtı güvenle okunur, (c) sepet parmak izi karşılaştırılır. Böylece bileşen
// ince kalır ve bu mantık node:test ile doğrulanabilir.
//
// KÖK NEDENLER (ADDENDUM #1 / #2):
//   1. Önizleme ana ürün fiyatıyla, sipariş VARYANT fiyatıyla hesaplanıyordu →
//      indirim sipariş tutarını aşabiliyordu (₺0 sipariş). Çözüm: önizleme
//      gövdesi de `variant_id` taşır (backend tabanı siparişle aynı olur).
//   2. Bölge kuponu için sayısal il/ilçe kimliği hiç gönderilmiyordu. Sayısal
//      kimlik YALNIZ gerçekten biliniyorsa gönderilir — uydurulmaz (backend
//      doğrulanmamış kimliğe göre kupon açmaz, bkz. DESIGN §3.C.6).
// ---------------------------------------------------------------------------

/** Sepet/checkout satırının kupon için anlamlı alanları. */
export type CouponLine = {
  productId: number | null | undefined;
  variantId?: number | null;
  quantity: number;
};

/** `POST /api/coupon` ve sipariş gövdesindeki kalem şekli. */
export type CouponRequestItem = {
  product_id: number;
  quantity: number;
  variant_id: number | null;
};

function positiveInt(value: unknown): number | null {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function nonNegativeInt(value: unknown): number | null {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Kupon önizlemesi için kalem listesi. Ürün kimliği olmayan satır atlanır
 * (backend `product_id` zorunlu tutar); adet en az 1'e yuvarlanır; varyant
 * kimliği biliniyorsa GEÇER — bu, motorun fiyat tabanını siparişin
 * faturaladığı fiyata eşitler.
 */
export function buildCouponItems(lines: CouponLine[]): CouponRequestItem[] {
  const out: CouponRequestItem[] = [];
  for (const line of lines ?? []) {
    const productId = positiveInt(line?.productId);
    if (productId == null) continue;
    const quantity = positiveInt(line?.quantity) ?? 1;
    out.push({ product_id: productId, quantity, variant_id: positiveInt(line?.variantId) });
  }
  return out;
}

/** Bölge kimlikleri — yalnız gerçekten bilinen değerler. */
export type RegionIds = { city_id: number | null; district_id: number | null };

/**
 * Teslimat kaydından SAYISAL il/ilçe kimliğini oku. Bugünkü teslimat kaydı
 * (pendingDelivery) yalnız Google yer ADLARINI taşır; sayısal kimlik eklendiği
 * gün bu okuyucu onu kendiliğinden görür. Ad'dan kimlik TÜRETİLMEZ: yanlış
 * kimlik bölge kuponunu haksız yere açardı.
 */
export function readRegionIds(delivery: unknown): RegionIds {
  const d = (delivery ?? {}) as Record<string, unknown>;
  return {
    city_id: positiveInt(d.cityId ?? d.city_id ?? d.delivery_city_id),
    district_id: positiveInt(d.districtId ?? d.district_id ?? d.delivery_district_id),
  };
}

/** Kupon önizleme gövdesi: bilinmeyen bölge alanı GÖNDERİLMEZ (null bile değil). */
export function buildCouponRequestBody(
  code: string,
  lines: CouponLine[],
  delivery?: unknown,
): { code: string; items: CouponRequestItem[]; city_id?: number; district_id?: number } {
  const region = readRegionIds(delivery);
  return {
    code: String(code ?? '').trim(),
    items: buildCouponItems(lines),
    ...(region.city_id != null ? { city_id: region.city_id } : {}),
    ...(region.district_id != null ? { district_id: region.district_id } : {}),
  };
}

/** Sipariş gövdesine eklenecek bölge alanları (aynı kaynak, aynı kural). */
export function buildOrderRegionFields(
  delivery?: unknown,
): { delivery_city_id?: number; delivery_district_id?: number } {
  const region = readRegionIds(delivery);
  return {
    ...(region.city_id != null ? { delivery_city_id: region.city_id } : {}),
    ...(region.district_id != null ? { delivery_district_id: region.district_id } : {}),
  };
}

/** Motorun yanıtının okunmuş hâli — TÜM sayılar sunucudan gelir. */
export type CouponPreview = {
  valid: boolean;
  code: string;
  discountMinor: number;
  totalMinor: number | null;
  message: string | null;
};

/**
 * `POST /api/coupon` yanıtını oku. Geçerlilik ve tutar İSTEMCİDE
 * HESAPLANMAZ: `valid` yalnız sunucu `valid:true` dediğinde ve sunucunun
 * yazdığı indirim 0'dan büyükken true olur.
 */
export function readCouponPreview(payload: unknown, requestedCode: string): CouponPreview {
  const data = ((payload ?? {}) as { data?: unknown }).data as Record<string, unknown> | undefined;
  const code = typeof data?.code === 'string' && data.code.trim() ? data.code.trim() : String(requestedCode ?? '').trim();
  const discount = nonNegativeInt(data?.discount_minor) ?? 0;
  const totalRaw = nonNegativeInt(data?.total_minor ?? data?.final_total);
  const message = typeof data?.message === 'string' && data.message.trim() ? data.message.trim() : null;
  return {
    valid: data?.valid === true && discount > 0,
    code,
    discountMinor: data?.valid === true ? discount : 0,
    totalMinor: totalRaw,
    message,
  };
}

/**
 * Sepet parmak izi — sepet değişince uygulanmış kupon geçersiz sayılır ve
 * yeniden doğrulanır. Fiyat da parmak izinin parçasıdır: fiyat değişimi
 * siparişte "price_changed" reddine yol açar, müşteri bunu ödeme adımında
 * öğrenmesin.
 */
export function cartFingerprint(
  lines: Array<CouponLine & { unitPriceMinor?: number }>,
): string {
  const parts = (lines ?? [])
    .map((line) => {
      const productId = positiveInt(line?.productId);
      if (productId == null) return null;
      const quantity = positiveInt(line?.quantity) ?? 1;
      const variant = positiveInt(line?.variantId) ?? 0;
      const price = nonNegativeInt(line?.unitPriceMinor) ?? 0;
      return `${productId}:${variant}:${quantity}:${price}`;
    })
    .filter((part): part is string => part !== null)
    .sort();
  return parts.join('|');
}

/**
 * SUNUCU TOPLAMI KAZANIR (baseline S).
 *
 * KÖK NEDEN: havale başarı ekranı ve PayTR çerçeve etiketi istemcinin
 * hesapladığı toplamı yazıyordu (PDP fiyatı − önizleme indirimi). Sunucu
 * fiyatı/indirimi yeniden hesapladığı ve para kıskacı uyguladığı için bu iki
 * sayı ayrışabiliyordu: müşteri "₺600" görüp bankaya farklı tutar yatırıyordu.
 *
 * KURAL: sipariş/ödeme yanıtındaki `total_amount_minor` VARSA daima o
 * gösterilir. Yalnız alan hiç gelmezse (yeni alanları göndermeyen eski API)
 * istemci toplamına düşülür — gösterilecek hiçbir şey olmaması daha kötüdür.
 * `0` geçerli bir sunucu toplamıdır ve fallback'i TETİKLEMEZ.
 */
export function readServerTotalMinor(
  serverValue: unknown,
  clientFallbackMinor: number,
): { minor: number; fromServer: boolean } {
  // `null`/`undefined` = alan YOK → fallback. (Number(null) === 0 olduğu için
  // bu guard olmadan eksik alan "sunucu ₺0 dedi" gibi okunurdu.)
  const server = serverValue == null ? null : nonNegativeInt(serverValue);
  if (server != null) return { minor: server, fromServer: true };
  return { minor: Math.max(0, Math.round(Number(clientFallbackMinor) || 0)), fromServer: false };
}

/**
 * SEPETTE ÇOK TESLİMAT: her satırın kendi teslimatı olabilir. Bölge kimliği
 * ancak TÜM satırlar AYNI bölgeyi gösterdiğinde taşınır; satırlar ayrışıyorsa
 * hiç gönderilmez — tek satırın şehrine göre bölge kuponu açmak haksız indirim
 * (ve siparişte ret) demektir.
 *
 * Dönüş şekli `readRegionIds`'in okuduğu alan adlarını kullanır, bu yüzden
 * sonucu doğrudan `buildCouponRequestBody`/`buildOrderRegionFields`'e verebilir.
 */
export function unanimousRegionIds(deliveries: unknown[]): RegionIds {
  const all = (deliveries ?? []).map(readRegionIds);
  if (all.length === 0) return { city_id: null, district_id: null };
  const agreed = (key: keyof RegionIds): number | null => {
    const first = all[0][key];
    if (first == null) return null;
    return all.every((row) => row[key] === first) ? first : null;
  };
  const city = agreed('city_id');
  // İl ayrışıyorsa ilçe kimliği de GÜVENİLMEZ: gerçek ilçe kimlikleri tekildir,
  // iki ayrı ilde aynı ilçe kimliği çelişkili veridir. Bütün bölge düşer.
  if (city == null) return { city_id: null, district_id: null };
  return { city_id: city, district_id: agreed('district_id') };
}
