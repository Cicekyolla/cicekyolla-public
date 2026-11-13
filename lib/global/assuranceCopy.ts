// ============================================================================
// GLOBAL — SATIŞ ODAKLI GÜVENCE BLOĞU (C2, 5 Kas 2026, ADDITIVE) — saf modül (node --test).
//
// Kaynak: işletme sahibinin onayladığı metin (C2-GUVENCE-METNI-13-DIL-2026-11-05.md, master §22).
// Yalnız sunum metni; fiyat yok, ürün/teslimat verisi tutulmaz.
//
// İKİ ŞARTLI MADDE — Delivery Motor canlıda doğrulanmadan AÇILMAZ:
//   • slots   (S1): 09–12 · 12–17 · 17–22 · 20–23 aralıkları sepette görünmeli.
//                   Kapalıyken: saat listesi olmadan "aynı gün, seçtiğiniz saat aralığında".
//   • airport (S2): İstanbul Havalimanı adresi sepette kabul edilmeli (5 Kas: 68 km → hizmet dışı).
//                   Kapalıyken: havalimanı sözü yok, yalnız otel/hastane.
// Açmak: aşağıdaki ASSURANCE_FLAGS değeri true → test + deploy (motor kanıtıyla).
// ============================================================================
import type { GlobalLocale } from "./config";

export const ASSURANCE_FLAGS = Object.freeze({ slots: false, airport: false });
export type AssuranceFlags = { slots: boolean; airport: boolean };

/** İki WhatsApp hattı (uluslararası biçim); wa.me bağlantısı birinci hatta gider. */
export const ASSURANCE_PHONES = ["+90 545 881 34 50", "+90 507 441 34 74"] as const;
export const ASSURANCE_WA_NUMBER = "905458813450";

type Pair = readonly [title: string, text: string];
export interface AssuranceCopy {
  title: string;
  intro: string;
  pay: Pair;
  photo: Pair;
  slots: Pair;
  slotsFallback: Pair;
  refund: Pair;
  airport: Pair;
  airportFallback: Pair;
  mosque: Pair;
  /** WhatsApp maddesinin başlığı (metin = iki telefon). */
  wa: string;
  ctaShop: string;
  ctaWa: string;
  /** WhatsApp hazır mesajı (müşterinin dilinde). */
  waText: string;
}

export const ASSURANCE: Record<GlobalLocale, AssuranceCopy> = {
  en: {
    title: "Order from abroad with complete peace of mind",
    intro: "We arrange your flowers in our own Istanbul atelier and deliver them with our own couriers. You choose — we keep you updated on WhatsApp, in your language.",
    pay: ["Pay by card from anywhere", "Pay securely from anywhere in the world via PayTR with 3-D Secure. You're charged in Turkish lira and your bank converts it. Prefer a bank transfer? Choose Bank Transfer at checkout. For Western Union, message us on WhatsApp and we'll arrange it."],
    photo: ["See it before it goes", "Just ask, and we'll send you a photo of your finished arrangement on WhatsApp before it leaves."],
    slots: ["Same day, at the time you choose", "Pick the window that suits you: 9–12, 12–5, 5–10 or 8–11 pm."],
    slotsFallback: ["Same day, at the time you choose", "Pick the delivery window that suits you at checkout."],
    refund: ["Can't deliver? Refund started the same day", "If we can't deliver your order, we cancel it and start your refund the same day. Card refunds reach your account on your bank's timeline."],
    airport: ["Airports, hotels and hospitals", "Same-day airport delivery: just give us the recipient's phone number and our courier will call to meet them."],
    airportFallback: ["Hotels and hospitals", "We deliver to hotels and hospitals across Istanbul — the recipient's phone number is all we need."],
    mosque: ["Same-day delivery to mosques", "We hand the flowers to a family member of the deceased, against name and signature."],
    wa: "WhatsApp in your language",
    ctaShop: "Choose flowers",
    ctaWa: "Message us on WhatsApp",
    waText: "Hello, I'd like to send flowers to Istanbul.",
  },
  de: {
    title: "Aus dem Ausland bestellen – ganz ohne Sorgen",
    intro: "Wir binden Ihre Blumen in unserem eigenen Atelier in Istanbul und liefern sie mit unseren eigenen Kurieren aus. Sie wählen aus – wir halten Sie per WhatsApp in Ihrer Sprache auf dem Laufenden.",
    pay: ["Von überall mit Karte bezahlen", "Bezahlen Sie von überall auf der Welt sicher über PayTR mit 3-D Secure. Abgebucht wird in Türkischer Lira, Ihre Bank rechnet um. Lieber per Überweisung? Wählen Sie beim Bezahlen „Überweisung“. Für Western Union schreiben Sie uns auf WhatsApp, wir regeln das mit Ihnen."],
    photo: ["Foto vor dem Versand", "Auf Wunsch schicken wir Ihnen per WhatsApp ein Foto des fertigen Straußes, bevor er losgeht."],
    slots: ["Taggleich, zur Wunschzeit", "Wählen Sie Ihr Zeitfenster: 9–12, 12–17, 17–22 oder 20–23 Uhr."],
    slotsFallback: ["Taggleich, zur Wunschzeit", "Wählen Sie Ihr passendes Zeitfenster im Checkout."],
    refund: ["Keine Zustellung möglich? Erstattung am selben Tag veranlasst", "Können wir Ihre Bestellung nicht zustellen, stornieren wir sie und veranlassen die Erstattung noch am selben Tag. Wann der Betrag auf Ihrer Karte ankommt, hängt von Ihrer Bank ab."],
    airport: ["Flughafen, Hotel, Krankenhaus", "Taggleiche Lieferung zum Flughafen: Die Telefonnummer des Empfängers genügt, unser Kurier ruft an und findet ihn."],
    airportFallback: ["Hotel und Krankenhaus", "Wir liefern an Hotels und Krankenhäuser in ganz Istanbul – die Telefonnummer des Empfängers genügt."],
    mosque: ["Taggleich zur Moschee", "Wir übergeben die Blumen einem Angehörigen des Verstorbenen, gegen Name und Unterschrift."],
    wa: "WhatsApp in Ihrer Sprache",
    ctaShop: "Blumen auswählen",
    ctaWa: "Per WhatsApp schreiben",
    waText: "Hallo, ich möchte Blumen nach Istanbul schicken.",
  },
  fr: {
    title: "Commandez depuis l'étranger en toute sérénité",
    intro: "Nous composons vos fleurs dans notre propre atelier à Istanbul et les livrons avec nos propres coursiers. Vous choisissez, nous vous tenons informé sur WhatsApp, dans votre langue.",
    pay: ["Payez par carte, où que vous soyez", "Payez en toute sécurité depuis le monde entier via PayTR, avec 3-D Secure. Le montant est débité en livres turques, votre banque fait la conversion. Vous préférez un virement ? Choisissez « Virement bancaire » au moment du paiement. Pour Western Union, écrivez-nous sur WhatsApp, nous l'organisons avec vous."],
    photo: ["Une photo avant l'envoi", "Sur simple demande, nous vous envoyons sur WhatsApp une photo de votre bouquet terminé avant son départ."],
    slots: ["Le jour même, à l'heure choisie", "Choisissez votre créneau : 9h–12h, 12h–17h, 17h–22h ou 20h–23h."],
    slotsFallback: ["Le jour même, à l'heure choisie", "Choisissez le créneau qui vous convient lors du paiement."],
    refund: ["Livraison impossible ? Remboursement lancé le jour même", "Si nous ne pouvons pas livrer votre commande, nous l'annulons et lançons votre remboursement le jour même. Le délai de crédit sur votre carte dépend de votre banque."],
    airport: ["Aéroports, hôtels, hôpitaux", "Livraison le jour même à l'aéroport : le numéro du destinataire suffit, notre coursier l'appelle pour le retrouver."],
    airportFallback: ["Hôtels et hôpitaux", "Nous livrons les hôtels et les hôpitaux de tout Istanbul — le numéro du destinataire suffit."],
    mosque: ["Le jour même à la mosquée", "Nous remettons les fleurs à un proche du défunt, contre nom et signature."],
    wa: "WhatsApp dans votre langue",
    ctaShop: "Choisir des fleurs",
    ctaWa: "Écrire sur WhatsApp",
    waText: "Bonjour, je souhaite envoyer des fleurs à Istanbul.",
  },
  nl: {
    title: "Zorgeloos bestellen vanuit het buitenland",
    intro: "We maken je bloemen in ons eigen atelier in Istanbul en bezorgen ze met onze eigen koeriers. Jij kiest, wij houden je via WhatsApp op de hoogte, in jouw taal.",
    pay: ["Betaal overal ter wereld met je kaart", "Betaal vanaf elke plek ter wereld veilig via PayTR met 3-D Secure. Het bedrag wordt in Turkse lira afgeschreven; je bank rekent het om. Liever overboeken? Kies bij het afrekenen „Bankoverschrijving”. Voor Western Union stuur je ons een bericht op WhatsApp, dan regelen we het samen."],
    photo: ["Eerst een foto", "Vraag het ons en we sturen je via WhatsApp een foto van het boeket voordat het vertrekt."],
    slots: ["Vandaag nog, op jouw tijd", "Kies je tijdvak: 9–12, 12–17, 17–22 of 20–23 uur."],
    slotsFallback: ["Vandaag nog, op jouw tijd", "Kies bij het afrekenen het tijdvak dat jou uitkomt."],
    refund: ["Bezorgen lukt niet? Terugbetaling dezelfde dag gestart", "Kunnen we je bestelling niet bezorgen, dan annuleren we die en starten we dezelfde dag de terugbetaling. Wanneer het bedrag op je kaart staat, hangt af van je bank."],
    airport: ["Luchthaven, hotel, ziekenhuis", "Bezorging op de luchthaven op dezelfde dag: het telefoonnummer van de ontvanger is genoeg, onze koerier belt en vindt hem."],
    airportFallback: ["Hotel en ziekenhuis", "We bezorgen bij hotels en ziekenhuizen in heel Istanbul — het telefoonnummer van de ontvanger is genoeg."],
    mosque: ["Dezelfde dag naar de moskee", "We geven de bloemen af aan een naaste van de overledene, tegen naam en handtekening."],
    wa: "WhatsApp in jouw taal",
    ctaShop: "Bloemen kiezen",
    ctaWa: "Stuur een WhatsApp",
    waText: "Hallo, ik wil graag bloemen naar Istanbul sturen.",
  },
  it: {
    title: "Ordina dall'estero in tutta tranquillità",
    intro: "Prepariamo i tuoi fiori nel nostro atelier di Istanbul e li consegniamo con i nostri corrieri. Tu scegli, noi ti aggiorniamo su WhatsApp nella tua lingua.",
    pay: ["Paga con carta da ovunque", "Paga in sicurezza da qualsiasi parte del mondo con PayTR e 3-D Secure. L'importo è addebitato in lire turche, la conversione la fa la tua banca. Preferisci un bonifico? Scegli «Bonifico bancario» al momento del pagamento. Per Western Union scrivici su WhatsApp e lo organizziamo insieme."],
    photo: ["Una foto prima della consegna", "Basta chiederlo: ti inviamo su WhatsApp una foto della composizione pronta prima che parta."],
    slots: ["In giornata, all'ora che scegli", "Scegli la fascia oraria: 9–12, 12–17, 17–22 o 20–23."],
    slotsFallback: ["In giornata, all'ora che scegli", "Scegli al pagamento la fascia oraria che preferisci."],
    refund: ["Consegna impossibile? Rimborso avviato in giornata", "Se non riusciamo a consegnare l'ordine, lo annulliamo e avviamo il rimborso in giornata. I tempi di accredito sulla carta dipendono dalla tua banca."],
    airport: ["Aeroporti, hotel, ospedali", "Consegna in aeroporto in giornata: basta il telefono del destinatario, il nostro corriere lo chiama e lo raggiunge."],
    airportFallback: ["Hotel e ospedali", "Consegniamo a hotel e ospedali in tutta Istanbul: basta il telefono del destinatario."],
    mosque: ["In giornata alla moschea", "Consegniamo i fiori a un familiare del defunto, con nome e firma."],
    wa: "WhatsApp nella tua lingua",
    ctaShop: "Scegli i fiori",
    ctaWa: "Scrivici su WhatsApp",
    waText: "Ciao, vorrei inviare dei fiori a Istanbul.",
  },
  es: {
    title: "Haz tu pedido desde el extranjero con total tranquilidad",
    intro: "Preparamos tus flores en nuestro propio taller de Estambul y las entregamos con nuestros propios mensajeros. Tú eliges; nosotros te avisamos por WhatsApp, en tu idioma.",
    pay: ["Paga con tarjeta desde cualquier lugar", "Paga con seguridad desde cualquier parte del mundo con PayTR y 3-D Secure. Se cobra en liras turcas y tu banco hace la conversión. ¿Prefieres transferencia? Elige «Transferencia bancaria» al pagar. Para Western Union, escríbenos por WhatsApp y lo organizamos contigo."],
    photo: ["Una foto antes del envío", "Solo tienes que pedirlo: te enviamos por WhatsApp una foto del ramo terminado antes de que salga."],
    slots: ["El mismo día, a la hora que elijas", "Elige tu franja: 9–12, 12–17, 17–22 o 20–23 h."],
    slotsFallback: ["El mismo día, a la hora que elijas", "Elige al pagar la franja horaria que mejor te venga."],
    refund: ["¿No podemos entregar? Reembolso iniciado el mismo día", "Si no podemos entregar tu pedido, lo cancelamos e iniciamos el reembolso el mismo día. El plazo para verlo en tu tarjeta depende de tu banco."],
    airport: ["Aeropuertos, hoteles, hospitales", "Entrega en el aeropuerto el mismo día: basta con el teléfono del destinatario; nuestro mensajero lo llama y lo encuentra."],
    airportFallback: ["Hoteles y hospitales", "Entregamos en hoteles y hospitales de todo Estambul: basta con el teléfono del destinatario."],
    mosque: ["El mismo día a la mezquita", "Entregamos las flores a un familiar del fallecido, con nombre y firma."],
    wa: "WhatsApp en tu idioma",
    ctaShop: "Elegir flores",
    ctaWa: "Escríbenos por WhatsApp",
    waText: "Hola, quiero enviar flores a Estambul.",
  },
  pt: {
    title: "Encomende do exterior com total tranquilidade",
    intro: "Preparamos as suas flores no nosso próprio ateliê em Istambul e entregamos com os nossos próprios estafetas. Você escolhe; nós damos notícias pelo WhatsApp, no seu idioma.",
    pay: ["Pague com cartão de qualquer lugar", "Pague com segurança de qualquer lugar do mundo via PayTR, com 3-D Secure. O valor é cobrado em liras turcas e o seu banco faz a conversão. Prefere transferência? Escolha «Transferência bancária» no pagamento. Para Western Union, fale connosco no WhatsApp e tratamos disso consigo."],
    photo: ["Uma foto antes do envio", "Basta pedir: enviamos pelo WhatsApp uma foto do arranjo pronto antes de ele sair."],
    slots: ["No mesmo dia, na hora que escolher", "Escolha o horário: 9–12, 12–17, 17–22 ou 20–23 h."],
    slotsFallback: ["No mesmo dia, na hora que escolher", "Escolha no pagamento o horário que mais lhe convém."],
    refund: ["Não foi possível entregar? Reembolso iniciado no mesmo dia", "Se não conseguirmos entregar o seu pedido, cancelamo-lo e iniciamos o reembolso no mesmo dia. O prazo para o valor chegar ao seu cartão depende do seu banco."],
    airport: ["Aeroportos, hotéis, hospitais", "Entrega no aeroporto no mesmo dia: basta o telefone do destinatário, o nosso estafeta liga e encontra-o."],
    airportFallback: ["Hotéis e hospitais", "Entregamos em hotéis e hospitais em toda Istambul: basta o telefone do destinatário."],
    mosque: ["No mesmo dia à mesquita", "Entregamos as flores a um familiar do falecido, mediante nome e assinatura."],
    wa: "WhatsApp no seu idioma",
    ctaShop: "Escolher flores",
    ctaWa: "Falar no WhatsApp",
    waText: "Olá, gostaria de enviar flores para Istambul.",
  },
  az: {
    title: "Xaricdən rahatlıqla sifariş verin",
    intro: "İstanbuldakı əzizlərinizə gülləri öz emalatxanamızda hazırlayır, öz kuryerlərimizlə çatdırırıq. Siz seçin, qalanını öz dilinizdə WhatsApp-da birlikdə izləyək.",
    pay: ["Dünyanın hər yerindən kartla ödəniş", "Dünyanın hər yerindən kartınızla PayTR vasitəsilə 3-D Secure ilə təhlükəsiz ödəyin. Məbləğ türk lirəsi ilə çıxılır, məzənnəni bankınız çevirir. Bank köçürməsi istəyirsiniz? Ödəniş addımında «Bank köçürməsi» seçin. Western Union üçün WhatsApp-da bizə yazın, birlikdə həll edək."],
    photo: ["Göndərmədən öncə foto", "İstəməyiniz kifayətdir: hazır gülün fotosunu yola düşməzdən əvvəl WhatsApp-da sizə göndəririk."],
    slots: ["Eyni gün, seçdiyiniz saatda", "Uyğun saat aralığını seçin: 09–12, 12–17, 17–22 və ya 20–23."],
    slotsFallback: ["Eyni gün, seçdiyiniz saatda", "Uyğun saat aralığını ödəniş zamanı seçin."],
    refund: ["Çatdıra bilməsək, geri ödəmə eyni gün başlayır", "Sifarişinizi çatdıra bilməsək, onu ləğv edir və geri ödəməni eyni gün başladırıq. Məbləğin kartınıza nə vaxt keçəcəyi bankınızdan asılıdır."],
    airport: ["Hava limanı, otel, xəstəxana", "Hava limanına eyni gün çatdırırıq: alıcının telefonu kifayətdir, kuryerimiz zəng edib onu tapır."],
    airportFallback: ["Otel və xəstəxana", "İstanbulun hər yerində otel və xəstəxanalara çatdırırıq — alıcının telefonu kifayətdir."],
    mosque: ["Məscidə eyni gün", "Gülləri mərhumun yaxınına ad və imza müqabilində təhvil veririk."],
    wa: "Öz dilinizdə WhatsApp",
    ctaShop: "Gül seçin",
    ctaWa: "WhatsApp-da yazın",
    waText: "Salam, İstanbula gül göndərmək istəyirəm.",
  },
  ru: {
    title: "Заказывайте из-за границы без лишних волнений",
    intro: "Мы собираем букеты в собственной мастерской в Стамбуле и доставляем их своими курьерами. Вы выбираете, а мы держим вас в курсе в WhatsApp на вашем языке.",
    pay: ["Оплата картой из любой страны", "Платите безопасно из любой точки мира через PayTR с 3-D Secure. Сумма списывается в турецких лирах, конвертацию делает ваш банк. Удобнее банковский перевод? Выберите «Банковский перевод» при оплате. Для Western Union напишите нам в WhatsApp — всё организуем."],
    photo: ["Фото перед отправкой", "Достаточно попросить — пришлём в WhatsApp фото готового букета до того, как он уедет к получателю."],
    slots: ["В тот же день, в удобное время", "Выберите интервал: 9–12, 12–17, 17–22 или 20–23."],
    slotsFallback: ["В тот же день, в удобное время", "Удобный интервал доставки выбирается при оформлении заказа."],
    refund: ["Не смогли доставить — возврат в тот же день", "Если мы не сможем доставить заказ, мы отменим его и в тот же день оформим возврат. Срок зачисления на карту зависит от вашего банка."],
    airport: ["Аэропорт, отель, больница", "Доставка в аэропорт в тот же день: достаточно телефона получателя, курьер позвонит и найдёт его."],
    airportFallback: ["Отель и больница", "Доставляем в отели и больницы по всему Стамбулу — достаточно телефона получателя."],
    mosque: ["В мечеть в тот же день", "Передаём цветы близкому родственнику усопшего под имя и подпись."],
    wa: "WhatsApp на вашем языке",
    ctaShop: "Выбрать цветы",
    ctaWa: "Написать в WhatsApp",
    waText: "Здравствуйте, хочу отправить цветы в Стамбул.",
  },
  // AR: Latin "3-D Secure" sağdan sola akışta "D Secure-3" görünmesin diye LRI…PDI (U+2066/U+2069) ile yalıtılır.
  ar: {
    title: "اطلب من الخارج براحة بال تامة",
    intro: "نُنسّق زهورك في مشغلنا الخاص في إسطنبول ونوصلها بواسطة مندوبينا. أنت تختار، ونحن نُطلعك على كل خطوة عبر واتساب وبلغتك.",
    pay: ["ادفع بالبطاقة من أي مكان", "ادفع بأمان من أي مكان في العالم عبر PayTR مع التحقق ⁦3-D Secure⁩. يُخصم المبلغ بالليرة التركية ويتولى بنكك التحويل. تفضّل التحويل البنكي؟ اختر «تحويل بنكي» عند الدفع. وللدفع عبر ويسترن يونيون راسلنا عبر واتساب ونرتّب ذلك معك."],
    photo: ["صورة قبل الإرسال", "يكفي أن تطلب ذلك، فنرسل لك عبر واتساب صورة الباقة الجاهزة قبل خروجها للتوصيل."],
    slots: ["في نفس اليوم وفي الوقت الذي تختاره", "اختر الفترة المناسبة: 9–12، 12–17، 17–22 أو 20–23."],
    slotsFallback: ["في نفس اليوم وفي الوقت الذي تختاره", "اختر فترة التوصيل المناسبة لك عند الدفع."],
    refund: ["تعذّر التوصيل؟ نبدأ الاسترداد في نفس اليوم", "إذا تعذّر علينا توصيل طلبك نلغيه ونبدأ إجراءات الاسترداد في نفس اليوم. يعتمد وقت وصول المبلغ إلى بطاقتك على بنكك."],
    airport: ["المطار والفندق والمستشفى", "توصيل إلى المطار في نفس اليوم: يكفي رقم هاتف المستلم، ويتصل به مندوبنا ليلتقيه."],
    airportFallback: ["الفندق والمستشفى", "نوصل إلى الفنادق والمستشفيات في جميع أنحاء إسطنبول، ويكفي رقم هاتف المستلم."],
    mosque: ["إلى المسجد في نفس اليوم", "نسلّم الزهور لأحد أقارب المتوفى مقابل الاسم والتوقيع."],
    wa: "واتساب بلغتك",
    ctaShop: "اختر الزهور",
    ctaWa: "راسلنا على واتساب",
    waText: "مرحباً، أريد إرسال زهور إلى إسطنبول.",
  },
  zh: {
    title: "身在海外，也能放心下单",
    intro: "我们在伊斯坦布尔自有花艺工作室制作花束，由自有快递员配送。您只需挑选，我们会用您的语言通过 WhatsApp 随时告知进度。",
    pay: ["全球各地均可刷卡支付", "无论身在何处，均可通过 PayTR 以 3-D Secure 安全支付。以土耳其里拉扣款，由您的银行自动换汇。想用银行转账？付款时选择「银行转账」即可。如需西联汇款，请通过 WhatsApp 联系我们，我们会为您安排。"],
    photo: ["发货前先看照片", "只需告诉我们，花束出发前我们会通过 WhatsApp 把成品照片发给您。"],
    slots: ["当日送达，时段任选", "可选时段：9–12、12–17、17–22 或 20–23 点。"],
    slotsFallback: ["当日送达，时段任选", "结账时选择适合您的配送时段。"],
    refund: ["无法送达？当天启动退款", "如果我们无法送达您的订单，我们会取消订单并在当天启动退款。款项退回卡内的时间取决于您的银行。"],
    airport: ["机场、酒店、医院", "机场当日送达：只需提供收花人电话，快递员会致电并找到对方。"],
    airportFallback: ["酒店和医院", "我们可配送至伊斯坦布尔各地的酒店和医院，只需提供收花人电话。"],
    mosque: ["当日送至清真寺", "鲜花将交给逝者亲属，凭姓名和签字签收。"],
    wa: "用您的语言联系 WhatsApp",
    ctaShop: "挑选鲜花",
    ctaWa: "WhatsApp 咨询",
    waText: "您好，我想往伊斯坦布尔送花。",
  },
  ja: {
    title: "海外からでも、安心してご注文いただけます",
    intro: "イスタンブールの自社アトリエで花束を仕立て、自社の配達員がお届けします。お選びいただくだけで、進み具合は WhatsApp でお客様の言語でお知らせします。",
    pay: ["世界中からカードでお支払い", "世界中どこからでも、PayTR で 3-D Secure による安全なお支払いが可能です。トルコリラで請求され、為替換算はお客様の銀行が行います。銀行振込をご希望の場合は、お支払い時に「銀行振込」をお選びください。Western Union をご希望の場合は、WhatsApp でご連絡ください。ご案内いたします。"],
    photo: ["お届け前に写真を確認", "ご希望いただければ、出発前に仕上がった花束の写真を WhatsApp でお送りします。"],
    slots: ["当日お届け、時間帯も選べます", "9〜12時、12〜17時、17〜22時、20〜23時からお選びください。"],
    slotsFallback: ["当日お届け、時間帯も選べます", "ご都合のよい配達時間帯はご注文手続きでお選びいただけます。"],
    refund: ["お届けできない場合は当日に返金手続き", "ご注文をお届けできない場合はキャンセルし、当日中に返金手続きを開始します。カードへの返金反映の時期はご利用の銀行によって異なります。"],
    airport: ["空港・ホテル・病院へ", "空港へも当日お届け。受取人の電話番号があれば、配達員が連絡してお会いします。"],
    airportFallback: ["ホテル・病院へ", "イスタンブール市内のホテルや病院へお届けします。受取人の電話番号があれば大丈夫です。"],
    mosque: ["モスクへも当日お届け", "お花は故人のご家族に、お名前とご署名と引き換えにお渡しします。"],
    wa: "お客様の言語で WhatsApp",
    ctaShop: "お花を選ぶ",
    ctaWa: "WhatsApp で相談",
    waText: "こんにちは。イスタンブールに花を贈りたいです。",
  },
  ko: {
    title: "해외에서도 안심하고 주문하세요",
    intro: "이스탄불의 자체 아틀리에에서 꽃을 만들고, 자체 배송 기사가 직접 전해 드립니다. 고르기만 하시면 진행 상황은 고객님의 언어로 WhatsApp으로 알려 드립니다.",
    pay: ["어디서나 카드로 결제", "전 세계 어디서나 PayTR을 통해 3-D Secure로 안전하게 결제하세요. 터키 리라로 청구되며 환전은 카드사에서 처리합니다. 계좌이체를 원하시면 결제 단계에서 '계좌이체'를 선택해 주세요. 웨스턴유니온을 원하시면 WhatsApp으로 연락 주세요. 함께 진행해 드립니다."],
    photo: ["보내기 전에 사진 확인", "요청만 하시면 꽃이 출발하기 전에 완성된 사진을 WhatsApp으로 보내 드립니다."],
    slots: ["당일 배송, 원하는 시간에", "9–12시, 12–17시, 17–22시, 20–23시 중에서 고르세요."],
    slotsFallback: ["당일 배송, 원하는 시간에", "결제 단계에서 원하는 배송 시간대를 고르세요."],
    refund: ["배송할 수 없으면 당일 환불 시작", "주문을 배송할 수 없는 경우 주문을 취소하고 당일에 환불 절차를 시작합니다. 카드로 환불되는 시점은 카드사에 따라 다릅니다."],
    airport: ["공항·호텔·병원", "공항도 당일 배송: 받는 분 전화번호만 있으면 배송 기사가 연락해 찾아갑니다."],
    airportFallback: ["호텔·병원", "이스탄불 전역의 호텔과 병원으로 배송합니다. 받는 분 전화번호만 있으면 됩니다."],
    mosque: ["모스크에도 당일 배송", "꽃은 고인의 가족께 성함과 서명을 받고 전달합니다."],
    wa: "고객님의 언어로 WhatsApp",
    ctaShop: "꽃 고르기",
    ctaWa: "WhatsApp 문의",
    waText: "안녕하세요, 이스탄불로 꽃을 보내고 싶어요.",
  },
};

/**
 * Bloğun maddeleri — şartlı maddeler bayrak kapalıyken güvenli karşılığına düşer.
 * `sameDay=false` (ör. aynı gün teslim edilemeyen ürün): aynı gün sözü taşıyan 3 madde
 * (saat aralığı, havalimanı/otel/hastane, cami) basılmaz → 4 madde.
 */
export function assuranceItems(locale: GlobalLocale, opts: { sameDay?: boolean; flags?: AssuranceFlags } = {}): Pair[] {
  const c = ASSURANCE[locale];
  const flags = opts.flags ?? ASSURANCE_FLAGS;
  const sameDay = opts.sameDay ?? true;
  const wa: Pair = [c.wa, ASSURANCE_PHONES.join(" · ")];
  if (!sameDay) return [c.pay, c.photo, c.refund, wa];
  return [
    c.pay,
    c.photo,
    flags.slots ? c.slots : c.slotsFallback,
    c.refund,
    flags.airport ? c.airport : c.airportFallback,
    c.mosque,
    wa,
  ];
}

/** WhatsApp bağlantısı — müşterinin dilinde hazır mesajla. */
export function assuranceWaHref(locale: GlobalLocale): string {
  return `https://wa.me/${ASSURANCE_WA_NUMBER}?text=${encodeURIComponent(ASSURANCE[locale].waText)}`;
}
