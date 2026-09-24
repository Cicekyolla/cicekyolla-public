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
