// ============================================================================
// GLOBAL — KARGO DESTİNASYONLARI (Antalya / Muğla / İzmir) arayüz metinleri.
//
// TESLİMAT GERÇEĞİ (kanun, 3 Eyl 2026): bu şehirlerde aynı gün kurye YOKTUR.
// Delivery Motor'un tek otoritesi teslimat profilidir: yalnız `cargo_capable`
// ürünler gider, süre TR sitesinde de yazan "1–3 iş günü"dür. Bu dosyadaki
// hiçbir cümle aynı gün / saat / 90 dk / gece vaadi TAŞIMAZ (test nöbet tutar).
//
// Bu dosya YALNIZ sunum metnidir (story.ts ile aynı kural): ürün/fiyat/kategori
// verisi tutulmaz; her şey production motorundan gelir. Şehir adı {city} ile
// o dildeki eksonimden (locationNav CITY_NAMES) doldurulur.
// ============================================================================
import type { GlobalLocale } from "./config";

export interface CargoCopy {
  /** Güven şeridi — 4 madde [başlık, alt satır]. */
  trust: (city: string) => [string, string][];
  /** Vitrin başlığı ve teslimat notu. */
  catalogTitle: (city: string) => string;
  catalogNote: string;
  /** Tüm kargolanabilir koleksiyona giden CTA (TR mağaza ailesine bilinçli köprü). */
  cta: string;
  /** Vitrinde bu dilde canlı ürün yoksa. */
  empty: (city: string) => string;
}

export const CARGO: Record<GlobalLocale, CargoCopy> = {
  en: {
    trust: (c) => [
      [`Delivery to ${c}`, "Tracked courier across Türkiye"],
      ["Prepared in Türkiye", "Arranged by our own florists, packed to travel"],
      ["International cards", "Visa & Mastercard accepted"],
      ["Personal message", "Your card travels with the gift"],
    ],
    catalogTitle: (c) => `Gifts that ship to ${c}`,
    catalogNote: "Delivered by courier in 1–3 business days.",
    cta: "See everything that ships →",
    empty: (c) => `Browse our shipping-ready collection for ${c}:`,
  },
  de: {
    trust: (c) => [
      [`Lieferung nach ${c}`, "Per Kurier mit Sendungsverfolgung in der ganzen Türkei"],
      ["In der Türkei gebunden", "Von unseren eigenen Floristen, reisesicher verpackt"],
      ["Internationale Karten", "Visa & Mastercard werden akzeptiert"],
      ["Persönliche Karte", "Ihre Nachricht reist mit dem Geschenk"],
    ],
    catalogTitle: (c) => `Geschenke mit Versand nach ${c}`,
    catalogNote: "Zustellung per Kurier in 1–3 Werktagen.",
    cta: "Alle versandfähigen Geschenke ansehen →",
    empty: (c) => `Unsere versandfertige Kollektion für ${c}:`,
  },
  fr: {
    trust: (c) => [
      [`Livraison à ${c}`, "Par transporteur suivi, partout en Turquie"],
      ["Préparé en Turquie", "Composé par nos propres fleuristes, emballé pour le voyage"],
      ["Cartes internationales", "Visa et Mastercard acceptées"],
      ["Message personnel", "Votre carte voyage avec le cadeau"],
    ],
    catalogTitle: (c) => `Cadeaux expédiés vers ${c}`,
    catalogNote: "Livraison par transporteur sous 1 à 3 jours ouvrés.",
    cta: "Voir tout ce qui peut être expédié →",
    empty: (c) => `Notre collection prête à expédier pour ${c} :`,
  },
  nl: {
    trust: (c) => [
      [`Bezorging in ${c}`, "Per koerier met track & trace, door heel Turkije"],
      ["Gemaakt in Turkije", "Door onze eigen bloembinders, reisklaar verpakt"],
      ["Internationale kaarten", "Visa & Mastercard geaccepteerd"],
      ["Persoonlijk kaartje", "Uw boodschap reist mee met het cadeau"],
    ],
    catalogTitle: (c) => `Cadeaus die naar ${c} verzonden worden`,
    catalogNote: "Bezorging per koerier binnen 1–3 werkdagen.",
    cta: "Bekijk alles wat verzonden kan worden →",
    empty: (c) => `Onze verzendklare collectie voor ${c}:`,
  },
  it: {
    trust: (c) => [
      [`Consegna a ${c}`, "Con corriere tracciato in tutta la Turchia"],
      ["Preparato in Turchia", "Dai nostri fioristi, imballato per il viaggio"],
      ["Carte internazionali", "Visa e Mastercard accettate"],
      ["Messaggio personale", "Il tuo biglietto viaggia con il regalo"],
    ],
    catalogTitle: (c) => `Regali spediti a ${c}`,
    catalogNote: "Consegna con corriere in 1–3 giorni lavorativi.",
    cta: "Vedi tutto ciò che possiamo spedire →",
    empty: (c) => `La nostra collezione pronta per la spedizione a ${c}:`,
  },
  es: {
    trust: (c) => [
      [`Entrega en ${c}`, "Por mensajería con seguimiento en toda Turquía"],
      ["Preparado en Turquía", "Por nuestras propias floristas, embalado para viajar"],
      ["Tarjetas internacionales", "Se aceptan Visa y Mastercard"],
      ["Mensaje personal", "Tu tarjeta viaja con el regalo"],
    ],
    catalogTitle: (c) => `Regalos con envío a ${c}`,
    catalogNote: "Entrega por mensajería en 1–3 días laborables.",
    cta: "Ver todo lo que enviamos →",
    empty: (c) => `Nuestra colección lista para enviar a ${c}:`,
  },
  pt: {
    trust: (c) => [
      [`Entrega em ${c}`, "Por transportadora com rastreio em toda a Turquia"],
      ["Preparado na Turquia", "Pelos nossos próprios floristas, embalado para viajar"],
      ["Cartões internacionais", "Visa e Mastercard aceites"],
      ["Mensagem pessoal", "O seu cartão viaja com a prenda"],
    ],
    catalogTitle: (c) => `Presentes com envio para ${c}`,
    catalogNote: "Entrega por transportadora em 1–3 dias úteis.",
    cta: "Ver tudo o que enviamos →",
    empty: (c) => `A nossa coleção pronta a enviar para ${c}:`,
  },
  az: {
    trust: (c) => [
      [`${c} şəhərinə çatdırılma`, "Türkiyə daxilində izlənilən kuryer ilə"],
      ["Türkiyədə hazırlanır", "Öz floristlərimiz tərəfindən, səfərə uyğun qablaşdırılır"],
      ["Beynəlxalq kartlar", "Visa və Mastercard qəbul edilir"],
      ["Şəxsi mesaj", "Kartınız hədiyyə ilə birlikdə gedir"],
    ],
    catalogTitle: (c) => `${c} şəhərinə göndərilən hədiyyələr`,
    catalogNote: "Kuryer ilə 1–3 iş günü ərzində çatdırılır.",
    cta: "Göndərilə bilən bütün hədiyyələrə bax →",
    empty: (c) => `${c} üçün göndərilməyə hazır kolleksiyamız:`,
  },
  ru: {
    trust: (c) => [
      [`Доставка в ${c}`, "Курьерской службой с отслеживанием по всей Турции"],
      ["Собрано в Турции", "Нашими флористами, упаковано для перевозки"],
      ["Международные карты", "Принимаем Visa и Mastercard"],
      ["Личное послание", "Ваша открытка едет вместе с подарком"],
    ],
    catalogTitle: (c) => `Подарки с доставкой в ${c}`,
    catalogNote: "Доставка курьерской службой за 1–3 рабочих дня.",
    cta: "Смотреть всё, что можно отправить →",
    empty: (c) => `Наша коллекция, готовая к отправке в ${c}:`,
  },
  ar: {
    trust: (c) => [
      [`التوصيل إلى ${c}`, "عبر شركة شحن مع تتبع الشحنة في جميع أنحاء تركيا"],
      ["يُحضَّر في تركيا", "بأيدي منسّقي الزهور لدينا ويُغلَّف ليتحمّل الرحلة"],
      ["بطاقات دولية", "نقبل Visa و Mastercard"],
      ["رسالة شخصية", "بطاقتك ترافق الهدية"],
    ],
    catalogTitle: (c) => `هدايا تُشحن إلى ${c}`,
    catalogNote: "التوصيل عبر شركة الشحن خلال 1–3 أيام عمل.",
    cta: "تصفّح كل ما يمكن شحنه ←",
    empty: (c) => `تشكيلتنا الجاهزة للشحن إلى ${c}:`,
  },
  zh: {
    trust: (c) => [
      [`配送至${c}`, "土耳其全境快递配送，可追踪"],
      ["土耳其本地制作", "由我们自己的花艺师制作并做好运输包装"],
      ["国际银行卡", "支持 Visa 与 Mastercard"],
      ["个人留言", "您的卡片随礼物一同送达"],
    ],
    catalogTitle: (c) => `可寄送至${c}的礼物`,
    catalogNote: "快递配送，1–3 个工作日送达。",
    cta: "查看全部可寄送礼物 →",
    empty: (c) => `我们为${c}准备的可寄送系列：`,
  },
  ja: {
    trust: (c) => [
      [`${c}へお届け`, "トルコ全土、追跡可能な宅配便で"],
      ["トルコで制作", "自社のフローリストが制作し、輸送用に梱包"],
      ["海外発行カード", "Visa・Mastercard対応"],
      ["メッセージカード", "お手紙はギフトと一緒にお届け"],
    ],
    catalogTitle: (c) => `${c}へ発送できるギフト`,
    catalogNote: "宅配便で1〜3営業日以内にお届けします。",
    cta: "発送可能なギフトをすべて見る →",
    empty: (c) => `${c}向けの発送対応コレクション：`,
  },
  ko: {
    trust: (c) => [
      [`${c} 배송`, "튀르키예 전역, 추적 가능한 택배로"],
      ["튀르키예 현지 제작", "자체 플로리스트가 제작하고 운송용으로 포장"],
      ["해외 발급 카드", "Visa · Mastercard 결제 가능"],
      ["개인 메시지", "메시지 카드가 선물과 함께 전달됩니다"],
    ],
    catalogTitle: (c) => `${c}(으)로 보낼 수 있는 선물`,
    catalogNote: "택배로 영업일 기준 1–3일 내 배송됩니다.",
    cta: "배송 가능한 선물 모두 보기 →",
    empty: (c) => `${c} 배송 가능 컬렉션:`,
  },
};

/** TR mağaza ailesindeki kargolanabilir koleksiyon (bilinçli commerce köprüsü —
    ürün adı/fiyatı/teslimat kontrolü orada tek kaynaktan çalışır). */
export const CARGO_COLLECTION_PATH = "/kategori/turkiye-geneli-kargo";
