// ============================================================================
// GLOBAL — SINIR / BELİRSİZ ERİŞİM (İstanbul ilçe/mahalle) arayüz metinleri (ADDITIVE, 24 Eyl 2026).
//
// Delivery Motor bir İstanbul ilçesini band KENARINA yakın ('mixed') ya da çözülemez ('unknown')
// bulduğunda sayfa ne aynı gün VAAT eder ne de kataloğu KAPATIR: ürünler görünür, adres için
// kesin karar ödemede (checkout) verilir. Bu dosyadaki hiçbir cümle aynı gün / saat / dakika
// GARANTİSİ taşımaz; "ödemede doğrulanır" dili zorunludur (test nöbet tutar).
// Yalnız sunum metnidir; ürün/fiyat/kategori verisi tutulmaz.
// ============================================================================
import type { GlobalLocale } from "./config";

export interface ReachCopy {
  /** Güven şeridi — 4 madde [başlık, alt satır]; {place} = ilçe/mahalle adı. */
  trust: (place: string) => [string, string][];
  /** Ürün alanı üst notu (sayfanın kendi şehir başlığı korunur). */
  catalogNote: (place: string) => string;
}

export const REACH: Record<GlobalLocale, ReachCopy> = {
  en: {
    trust: (p) => [
      [`Delivery to ${p}`, "Delivery options are confirmed for the exact address at checkout"],
      ["Prepared in our Istanbul atelier", "Hand-arranged by our own florists"],
      ["International cards", "Visa & Mastercard accepted"],
      ["Personal message", "Your card travels with the gift"],
    ],
    catalogNote: (p) => `Same-day courier where our Istanbul bands reach ${p}; elsewhere, items that can be shipped travel by tracked courier in 1–3 business days — the checkout shows what your address can receive.`,
  },
  de: {
    trust: (p) => [
      [`Lieferung nach ${p}`, "Die Lieferoptionen werden im Checkout für die genaue Adresse bestätigt"],
      ["In unserem Istanbuler Atelier gebunden", "Von unseren eigenen Floristen"],
      ["Internationale Karten", "Visa & Mastercard werden akzeptiert"],
      ["Persönliche Grußkarte", "Ihre Karte reist mit dem Geschenk"],
    ],
    catalogNote: (p) => `Taggleicher Kurier, wo unsere Istanbuler Zonen ${p} erreichen; sonst reisen versandfähige Artikel per Kurier mit Sendungsverfolgung in 1–3 Werktagen — der Checkout zeigt, was Ihre Adresse empfangen kann.`,
  },
  fr: {
    trust: (p) => [
      [`Livraison à ${p}`, "Les options de livraison sont confirmées pour l'adresse exacte au paiement"],
      ["Préparé dans notre atelier d'Istanbul", "Composé par nos propres fleuristes"],
      ["Cartes internationales", "Visa & Mastercard acceptées"],
      ["Message personnel", "Votre carte voyage avec le cadeau"],
    ],
    catalogNote: (p) => `Coursier le jour même là où nos zones d'Istanbul atteignent ${p} ; ailleurs, les articles expédiables voyagent par transporteur suivi sous 1 à 3 jours ouvrés — le paiement indique ce que votre adresse peut recevoir.`,
  },
  nl: {
    trust: (p) => [
      [`Bezorging in ${p}`, "De bezorgopties worden bij het afrekenen voor het exacte adres bevestigd"],
      ["Gemaakt in ons atelier in Istanbul", "Door onze eigen bloemisten"],
      ["Internationale kaarten", "Visa & Mastercard geaccepteerd"],
      ["Persoonlijk kaartje", "Je kaartje reist mee met het cadeau"],
    ],
    catalogNote: (p) => `Koerier op dezelfde dag waar onze Istanbulse zones ${p} bereiken; elders gaan verzendbare artikelen met een koerier met track & trace binnen 1–3 werkdagen — bij het afrekenen zie je wat jouw adres kan ontvangen.`,
  },
  it: {
    trust: (p) => [
      [`Consegna a ${p}`, "Le opzioni di consegna vengono confermate per l'indirizzo esatto al checkout"],
      ["Preparato nel nostro atelier di Istanbul", "Dai nostri fioristi"],
      ["Carte internazionali", "Visa & Mastercard accettate"],
      ["Messaggio personale", "Il tuo biglietto viaggia con il regalo"],
    ],
    catalogNote: (p) => `Corriere in giornata dove le nostre zone di Istanbul raggiungono ${p}; altrove gli articoli spedibili viaggiano con corriere tracciato in 1–3 giorni lavorativi — il checkout mostra cosa può ricevere il tuo indirizzo.`,
  },
  es: {
    trust: (p) => [
      [`Entrega en ${p}`, "Las opciones de entrega se confirman para la dirección exacta al pagar"],
      ["Preparado en nuestro taller de Estambul", "Por nuestros propios floristas"],
      ["Tarjetas internacionales", "Se aceptan Visa y Mastercard"],
      ["Mensaje personal", "Tu tarjeta viaja con el regalo"],
    ],
    catalogNote: (p) => `Mensajero el mismo día donde nuestras zonas de Estambul llegan a ${p}; en el resto, los artículos aptos para envío viajan por mensajería con seguimiento en 1–3 días laborables — al pagar verás qué puede recibir tu dirección.`,
  },
  pt: {
    trust: (p) => [
      [`Entrega em ${p}`, "As opções de entrega são confirmadas para a morada exata no checkout"],
      ["Preparado no nosso atelier em Istambul", "Pelos nossos próprios floristas"],
      ["Cartões internacionais", "Visa & Mastercard aceites"],
      ["Mensagem pessoal", "O seu cartão viaja com o presente"],
    ],
    catalogNote: (p) => `Estafeta no mesmo dia onde as nossas zonas de Istambul chegam a ${p}; noutros pontos, os artigos expedíveis seguem por transportadora com seguimento em 1–3 dias úteis — o checkout mostra o que a sua morada pode receber.`,
  },
  az: {
    trust: (p) => [
      [`${p} üçün çatdırılma`, "Çatdırılma variantları ödəniş mərhələsində dəqiq ünvan üçün təsdiqlənir"],
      ["İstanbuldakı emalatxanamızda hazırlanır", "Öz floristlərimiz tərəfindən"],
      ["Beynəlxalq kartlar", "Visa və Mastercard qəbul olunur"],
      ["Şəxsi mesaj", "Kartınız hədiyyə ilə birlikdə gedir"],
    ],
    catalogNote: (p) => `İstanbul zonalarımızın ${p} ərazisinə çatdığı yerlərdə eyni gün kuryer; digər yerlərdə göndərilə bilən məhsullar izlənən kuryerlə 1–3 iş günündə — ödəniş mərhələsi ünvanınızın nə ala biləcəyini göstərir.`,
  },
  ru: {
    trust: (p) => [
      [`Доставка в ${p}`, "Варианты доставки подтверждаются для точного адреса при оформлении заказа"],
      ["Собрано в нашей мастерской в Стамбуле", "Нашими собственными флористами"],
      ["Международные карты", "Принимаются Visa и Mastercard"],
      ["Личное сообщение", "Ваша открытка едет вместе с подарком"],
    ],
    catalogNote: (p) => `Курьер в тот же день там, куда наши стамбульские зоны доходят в ${p}; в остальных местах товары, пригодные к пересылке, едут курьером с отслеживанием за 1–3 рабочих дня — при оформлении видно, что может получить ваш адрес.`,
  },
  ar: {
    trust: (p) => [
      [`التوصيل إلى ${p}`, "تُؤكَّد خيارات التوصيل للعنوان بالضبط عند الدفع"],
      ["يُجهَّز في مشغلنا بإسطنبول", "بأيدي منسّقي الزهور لدينا"],
      ["بطاقات دولية", "نقبل Visa وMastercard"],
      ["رسالة شخصية", "بطاقتك تسافر مع الهدية"],
    ],
    catalogNote: (p) => `توصيل في نفس اليوم حيث تصل نطاقاتنا في إسطنبول إلى ${p}؛ وفي غير ذلك تُشحن المنتجات القابلة للشحن بشحن متتبَّع خلال 1–3 أيام عمل — تُظهر صفحة الدفع ما يمكن لعنوانك استلامه.`,
  },
  zh: {
    trust: (p) => [
      [`配送至${p}`, "配送方式在结账时按具体地址确认"],
      ["由我们的伊斯坦布尔工作室制作", "自有花艺师手工制作"],
      ["国际银行卡", "接受Visa和Mastercard"],
      ["个性化留言", "卡片随礼物一起送达"],
    ],
    catalogNote: (p) => `伊斯坦布尔配送范围覆盖${p}的区域可当日送达；其他区域，可寄送的商品由可追踪快递在1–3个工作日内送达——结账时会显示您的地址可以收到的服务。`,
  },
  ja: {
    trust: (p) => [
      [`${p}への配達`, "配達方法は決済時に正確な住所で確認されます"],
      ["イスタンブールの自社アトリエで制作", "自社フローリストが手作り"],
      ["海外発行カード", "Visa・Mastercardをご利用いただけます"],
      ["メッセージカード", "カードはギフトと一緒に届きます"],
    ],
    catalogNote: (p) => `イスタンブールの配達エリアが${p}に届く範囲は当日配達、それ以外は発送可能な商品のみ追跡可能な宅配便で1〜3営業日。お届け先で利用できる方法は決済時に表示されます。`,
  },
  ko: {
    trust: (p) => [
      [`${p} 배송`, "배송 방식은 결제 시 정확한 주소 기준으로 확인됩니다"],
      ["이스탄불 자체 작업실에서 제작", "자체 플로리스트가 직접 제작"],
      ["해외 카드", "Visa 및 Mastercard 사용 가능"],
      ["개인 메시지", "카드가 선물과 함께 전달됩니다"],
    ],
    catalogNote: (p) => `이스탄불 배송 구역이 ${p}에 닿는 곳은 당일 배송, 그 외 지역은 발송 가능한 상품에 한해 추적 가능한 택배로 영업일 기준 1–3일. 결제 시 해당 주소에서 가능한 방식이 표시됩니다.`,
  },
};

// ============================================================================
// UZAK BÖLGE (API 108, reach 'far'): İstanbul 45 km+ fiyat eşikli band. Sayfa hiçbir gün/saat VAAT ETMEZ:
// "eşik ve üzeri ürünlerde, günün planı uygunsa, geniş gündüz aralığında özel araçla" — koşullu; diğer ürünler
// kargo (1–3 iş günü, kargolanabilir ürünler için). Eşik ({threshold}) API'den gelir, metne gömülmez; slot saati
// Admin'de değişebildiği için burada YAZILMAZ. "aynı gün" ibaresi bu blokta yasaktır (test nöbet tutar).
// ============================================================================
export interface FarCopy {
  /** Güven şeridi — 4 madde; {place} ilçe/mahalle adı, {threshold} biçimli eşik (ör. "₺2,500"). */
  trust: (place: string, threshold: string) => [string, string][];
  /** Ürün alanı üst notu. */
  catalogNote: (place: string, threshold: string) => string;
}

/** TL eşiği okuyucunun dil biçimiyle: en "₺2,500", de "₺2.500", fr "₺2 500". Eşik TL'dir (para birimi seçiminden bağımsız). */
export function formatThresholdTl(locale: GlobalLocale, minor: number | null | undefined): string {
  const v = Math.round(Number(minor ?? 0) / 100);
  let n: string;
  try { n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v); } catch { n = String(v); }
  return `₺${n}`;
}

export const FAR: Record<GlobalLocale, FarCopy> = {
  en: {
    trust: (p, t) => [
      [`Delivery to ${p}`, "Delivery options are confirmed for the exact address at checkout"],
      ["Our own vehicle for selected items", `Items priced ${t} and above can be hand-delivered in a wide daytime window when the day's schedule allows`],
      ["Tracked courier for the rest", "Items that can be shipped arrive in 1–3 business days"],
      ["International cards", "Visa & Mastercard accepted"],
    ],
    catalogNote: (p, t) => `${p} lies beyond our regular Istanbul courier bands. Items priced ${t} and above can be hand-delivered by our own vehicle in a wide daytime window when the day's schedule allows; other items that can be shipped travel by tracked courier in 1–3 business days — the checkout shows what your address can receive.`,
  },
  de: {
    trust: (p, t) => [
      [`Lieferung nach ${p}`, "Die Lieferoptionen werden im Checkout für die genaue Adresse bestätigt"],
      ["Eigenes Fahrzeug für ausgewählte Artikel", `Artikel ab ${t} können in einem breiten Tageszeitfenster persönlich zugestellt werden, wenn der Tagesplan es zulässt`],
      ["Kurier mit Sendungsverfolgung für alles Weitere", "Versandfähige Artikel kommen in 1–3 Werktagen an"],
      ["Internationale Karten", "Visa & Mastercard werden akzeptiert"],
    ],
    catalogNote: (p, t) => `${p} liegt außerhalb unserer regulären Istanbuler Kurierzonen. Artikel ab ${t} können mit unserem eigenen Fahrzeug in einem breiten Tageszeitfenster zugestellt werden, wenn der Tagesplan es zulässt; andere versandfähige Artikel reisen per Kurier mit Sendungsverfolgung in 1–3 Werktagen — der Checkout zeigt, was Ihre Adresse erhalten kann.`,
  },
  fr: {
    trust: (p, t) => [
      [`Livraison à ${p}`, "Les options de livraison sont confirmées pour l'adresse exacte au paiement"],
      ["Notre propre véhicule pour certains articles", `Les articles à partir de ${t} peuvent être remis en main propre dans un large créneau de journée, si le planning du jour le permet`],
      ["Transporteur suivi pour le reste", "Les articles expédiables arrivent sous 1 à 3 jours ouvrés"],
      ["Cartes internationales", "Visa & Mastercard acceptées"],
    ],
    catalogNote: (p, t) => `${p} se trouve au-delà de nos zones de coursiers habituelles à Istanbul. Les articles à partir de ${t} peuvent être livrés par notre propre véhicule dans un large créneau de journée si le planning du jour le permet ; les autres articles expédiables voyagent par transporteur suivi sous 1 à 3 jours ouvrés — le paiement indique ce que votre adresse peut recevoir.`,
  },
  nl: {
    trust: (p, t) => [
      [`Bezorging in ${p}`, "De bezorgopties worden bij het afrekenen voor het exacte adres bevestigd"],
      ["Eigen voertuig voor geselecteerde artikelen", `Artikelen vanaf ${t} kunnen persoonlijk worden bezorgd in een ruim dagvenster, als de planning van de dag het toelaat`],
      ["Koerier met track & trace voor de rest", "Verzendbare artikelen komen binnen 1–3 werkdagen aan"],
      ["Internationale kaarten", "Visa & Mastercard geaccepteerd"],
    ],
    catalogNote: (p, t) => `${p} ligt buiten onze gewone koerierszones in Istanbul. Artikelen vanaf ${t} kunnen met ons eigen voertuig in een ruim dagvenster worden bezorgd als de planning van de dag het toelaat; andere verzendbare artikelen gaan met een koerier met track & trace binnen 1–3 werkdagen — het afrekenen laat zien wat je adres kan ontvangen.`,
  },
  it: {
    trust: (p, t) => [
      [`Consegna a ${p}`, "Le opzioni di consegna sono confermate per l'indirizzo esatto al checkout"],
      ["Il nostro veicolo per articoli selezionati", `Gli articoli da ${t} in su possono essere consegnati a mano in un'ampia fascia diurna, se il programma della giornata lo consente`],
      ["Corriere tracciato per il resto", "Gli articoli spedibili arrivano in 1–3 giorni lavorativi"],
      ["Carte internazionali", "Visa & Mastercard accettate"],
    ],
    catalogNote: (p, t) => `${p} si trova oltre le nostre zone corriere abituali di Istanbul. Gli articoli da ${t} in su possono essere consegnati con il nostro veicolo in un'ampia fascia diurna se il programma della giornata lo consente; gli altri articoli spedibili viaggiano con corriere tracciato in 1–3 giorni lavorativi — il checkout mostra cosa può ricevere il tuo indirizzo.`,
  },
  es: {
    trust: (p, t) => [
      [`Entrega en ${p}`, "Las opciones de entrega se confirman para la dirección exacta al pagar"],
      ["Nuestro propio vehículo para artículos seleccionados", `Los artículos desde ${t} pueden entregarse en mano en una franja diurna amplia, si la planificación del día lo permite`],
      ["Mensajería con seguimiento para el resto", "Los artículos aptos para envío llegan en 1–3 días laborables"],
      ["Tarjetas internacionales", "Se aceptan Visa y Mastercard"],
    ],
    catalogNote: (p, t) => `${p} queda fuera de nuestras zonas de reparto habituales en Estambul. Los artículos desde ${t} pueden entregarse con nuestro propio vehículo en una franja diurna amplia si la planificación del día lo permite; los demás artículos aptos para envío viajan por mensajería con seguimiento en 1–3 días laborables — el pago muestra lo que puede recibir tu dirección.`,
  },
  pt: {
    trust: (p, t) => [
      [`Entrega em ${p}`, "As opções de entrega são confirmadas para a morada exata no checkout"],
      ["Veículo próprio para artigos selecionados", `Artigos a partir de ${t} podem ser entregues em mão numa janela diurna alargada, se o plano do dia o permitir`],
      ["Transportadora com seguimento para os restantes", "Os artigos expedíveis chegam em 1–3 dias úteis"],
      ["Cartões internacionais", "Visa e Mastercard aceites"],
    ],
    catalogNote: (p, t) => `${p} fica além das nossas zonas de estafetas habituais em Istambul. Artigos a partir de ${t} podem ser entregues com o nosso próprio veículo numa janela diurna alargada se o plano do dia o permitir; os restantes artigos expedíveis seguem por transportadora com seguimento em 1–3 dias úteis — o checkout mostra o que a sua morada pode receber.`,
  },
  az: {
    trust: (p, t) => [
      [`${p} üçün çatdırılma`, "Çatdırılma seçimləri ödəniş mərhələsində dəqiq ünvan üçün təsdiqlənir"],
      ["Seçilmiş məhsullar üçün öz nəqliyyatımız", `${t} və yuxarı qiymətli məhsullar günün planı imkan verdikdə geniş gündüz aralığında əldən təhvil verilə bilər`],
      ["Qalanlar üçün izlənən kuryer", "Göndərilə bilən məhsullar 1–3 iş günündə çatır"],
      ["Beynəlxalq kartlar", "Visa və Mastercard qəbul edilir"],
    ],
    catalogNote: (p, t) => `${p} İstanbuldakı adi kuryer zonalarımızdan kənardadır. ${t} və yuxarı qiymətli məhsullar günün planı imkan verdikdə öz nəqliyyatımızla geniş gündüz aralığında çatdırıla bilər; göndərilə bilən digər məhsullar izlənən kuryerlə 1–3 iş günündə gedir — ödəniş mərhələsi ünvanınızın nə ala biləcəyini göstərir.`,
  },
  ru: {
    trust: (p, t) => [
      [`Доставка в ${p}`, "Варианты доставки подтверждаются для точного адреса при оформлении заказа"],
      ["Собственный транспорт для отдельных товаров", `Товары от ${t} могут быть доставлены лично в широкий дневной интервал, если позволяет план дня`],
      ["Курьер с отслеживанием для остального", "Товары, пригодные к пересылке, приходят за 1–3 рабочих дня"],
      ["Международные карты", "Принимаются Visa и Mastercard"],
    ],
    catalogNote: (p, t) => `${p} находится за пределами наших обычных курьерских зон Стамбула. Товары от ${t} могут быть доставлены нашим транспортом в широкий дневной интервал, если позволяет план дня; остальные товары, пригодные к пересылке, едут курьером с отслеживанием за 1–3 рабочих дня — при оформлении заказа вы увидите, что может получить ваш адрес.`,
  },
  ar: {
    trust: (p, t) => [
      [`التوصيل إلى ${p}`, "تُؤكَّد خيارات التوصيل للعنوان الدقيق في صفحة الدفع"],
      ["سيارتنا الخاصة لمنتجات مختارة", `المنتجات بسعر ${t} فأكثر يمكن تسليمها يدًا بيد ضمن فترة نهارية واسعة إذا سمح جدول اليوم`],
      ["شحن متتبَّع للبقية", "المنتجات القابلة للشحن تصل خلال 1–3 أيام عمل"],
      ["بطاقات دولية", "نقبل Visa وMastercard"],
    ],
    catalogNote: (p, t) => `${p} تقع خارج نطاقات مندوبينا المعتادة في إسطنبول. المنتجات بسعر ${t} فأكثر يمكن تسليمها بسيارتنا الخاصة ضمن فترة نهارية واسعة إذا سمح جدول اليوم؛ أما المنتجات الأخرى القابلة للشحن فتُشحن بشحن متتبَّع خلال 1–3 أيام عمل — تعرض صفحة الدفع ما يمكن لعنوانك استلامه.`,
  },
  zh: {
    trust: (p, t) => [
      [`配送至${p}`, "配送方式在结账时按具体地址确认"],
      ["部分商品可由自有车辆配送", `售价${t}及以上的商品，在排程允许时可在较宽的白天时段内专人送达`],
      ["其余商品由可追踪快递配送", "可寄送的商品在1–3个工作日内送达"],
      ["国际银行卡", "接受Visa和Mastercard"],
    ],
    catalogNote: (p, t) => `${p}位于我们伊斯坦布尔常规配送范围之外。售价${t}及以上的商品，在排程允许时可由自有车辆在较宽的白天时段内送达；其他可寄送的商品由可追踪快递在1–3个工作日内送达——结账时会显示您的地址可以收到的选项。`,
  },
  ja: {
    trust: (p, t) => [
      [`${p}への配達`, "配達方法は決済時に正確な住所で確認されます"],
      ["一部商品は自社車両でお届け", `${t}以上の商品は、その日の予定が許す場合に日中の広い時間帯で手渡しできます`],
      ["その他は追跡可能な宅配便", "発送可能な商品は1〜3営業日でお届け"],
      ["海外発行カード", "Visa・Mastercardをご利用いただけます"],
    ],
    catalogNote: (p, t) => `${p}はイスタンブールの通常配達エリアの外にあります。${t}以上の商品は、その日の予定が許す場合に自社車両で日中の広い時間帯にお届けできます。その他の発送可能な商品は追跡可能な宅配便で1〜3営業日でお届けします。お届け先で利用できる方法は決済時に表示されます。`,
  },
  ko: {
    trust: (p, t) => [
      [`${p} 배송`, "배송 방식은 결제 시 정확한 주소 기준으로 확인됩니다"],
      ["일부 상품은 자체 차량으로 배송", `${t} 이상 상품은 그날의 일정이 허용하면 넓은 주간 시간대에 직접 전달할 수 있습니다`],
      ["나머지는 추적 가능한 택배", "발송 가능한 상품은 영업일 기준 1–3일 내 도착"],
      ["해외 카드", "Visa 및 Mastercard 사용 가능"],
    ],
    catalogNote: (p, t) => `${p}은(는) 이스탄불의 일반 배송 구역 밖에 있습니다. ${t} 이상 상품은 그날의 일정이 허용하면 자체 차량으로 넓은 주간 시간대에 배송할 수 있으며, 그 외 발송 가능한 상품은 추적 가능한 택배로 영업일 기준 1–3일 내 배송됩니다. 결제 시 해당 주소에서 받을 수 있는 방식이 표시됩니다.`,
  },
};
