// ============================================================================
// GLOBAL VİTRİN — Figma final ("duygu satıyoruz") hikâye katmanı, 13 dil.
// Kaynak: Figma Make ReMFV74b5NCnH49UVeFqSi (V4 brief) — bölüm sırası ve kopya
// birebir alındı, ÇiçekYolla marka diline uyarlandı.
//
// KURAL: burada YALNIZ sunum metni vardır. Ürün adı/fiyatı/kategori adı/ürün
// sayısı DAİMA production motorundan (localeCatalog) gelir — bu dosyada ürün,
// fiyat veya kategori verisi TUTULMAZ.
// ============================================================================
import type { GlobalLocale } from "./config";

export type Feel = { key: string; label: string; quote: string; img: string };

export interface StoryCopy {
  /** Hero altı güven şeridi (yalnız GERÇEKTEN sunduğumuz sözler). */
  trust: { local: [string, string]; hand: [string, string]; pay: [string, string]; proof: [string, string] };
  /** "Ne hissetmesini istersiniz?" — duygu ile seçim. */
  emotion: { eyebrow: string; title: string; sub: string; feels: { label: string; quote: string }[] };
  /** Uzaklık → yakınlık. */
  distance: { title: [string, string]; sub: string; steps: [string, string][] };
  /** İnsan kanıtı: İstanbul atölyesi. */
  atelier: { eyebrow: string; title: [string, string]; body: string; points: string[] };
  /** WhatsApp = kişisel florist (ikon değil, satış kanalı). */
  concierge: { eyebrow: string; title: [string, string]; sub: string; chatName: string; chatStatus: string; chatUser: string; chatFlorist: string; cta: string; note: string };
  /** Teslimat kanıtı — 3 adım. */
  proof: { eyebrow: string; quote: string; title: string; steps: { n: string; t: string; d: string }[]; caption: string };
  /** Kart mesajı. */
  message: { eyebrow: string; title: [string, string]; quote: string; note: string };
  /** Kapanış. */
  final: { eyebrow: string; title: [string, string]; sub: string; cta: string; ctaAlt: string };
}

/** Duygu kartı görselleri — Figma final seçimleri (public/global/*.jpg). */
export const FEEL_IMAGES: string[] = [
  "/global/feel-loved.jpg",
  "/global/feel-missed.jpg",
  "/global/feel-remembered.jpg",
  "/global/feel-celebrated.jpg",
  "/global/feel-appreciated.jpg",
  "/global/feel-comforted.jpg",
  "/global/feel-surprised.jpg",
  "/global/feel-forgiven.jpg",
  "/global/feel-close.jpg",
];

const en: StoryCopy = {
  trust: {
    local: ["Istanbul delivery", "Prepared and delivered locally"],
    hand: ["Hand-arranged", "By our Istanbul florists"],
    pay: ["International cards", "Visa & Mastercard accepted"],
    proof: ["Delivery confirmation", "We let you know it arrived"],
  },
  emotion: {
    eyebrow: "Intent",
    title: "What do you want them to feel?",
    sub: "Sometimes choosing the feeling is easier than choosing the flowers.",
    feels: [
      { label: "Loved", quote: "I love you." },
      { label: "Missed", quote: "I miss you." },
      { label: "Remembered", quote: "I'm thinking of you." },
      { label: "Celebrated", quote: "Congratulations." },
      { label: "Appreciated", quote: "Thank you." },
      { label: "Comforted", quote: "Get well soon." },
      { label: "Surprised", quote: "Just because." },
      { label: "Forgiven", quote: "I'm sorry." },
      { label: "Close to you", quote: "Remember me." },
    ],
  },
  distance: {
    title: ["Far from Istanbul.", "Close to them."],
    sub: "You choose the feeling. Our Istanbul florists prepare it by hand. We deliver it to the person you love.",
    steps: [
      ["Far away, thinking of you.", "Anywhere in the world"],
      ["Our Istanbul atelier.", "Nişantaşı, İstanbul"],
      ["The person you love.", "Istanbul, Türkiye"],
    ],
  },
  atelier: {
    eyebrow: "Human proof",
    title: ["Made in Istanbul.", "Delivered in Istanbul."],
    body: "Every bouquet is arranged fresh by our Istanbul florists, then hand-delivered within the city. Not shipped from another country. Not forwarded to a marketplace seller.",
    points: [
      "Prepared locally by our Istanbul florists.",
      "Not shipped from another country.",
      "Delivered with care and confirmation.",
    ],
  },
  concierge: {
    eyebrow: "Personal help",
    title: ["Not sure what", "to send?"],
    sub: "Tell us about them. Our Istanbul florists will help you choose something meaningful.",
    chatName: "ÇiçekYolla",
    chatStatus: "Online · Istanbul",
    chatUser: "“My mother's birthday is in Istanbul.”",
    chatFlorist: "Tell us a little about her. We'll choose something meaningful together.",
    cta: "Ask your Istanbul florist",
    note: "A real conversation can make choosing easier.",
  },
  proof: {
    eyebrow: "The moment",
    quote: "They are not buying a bouquet. They are buying this moment.",
    title: "You'll know it arrived.",
    steps: [
      { n: "01", t: "You choose", d: "Select the flowers and write your message from anywhere in the world." },
      { n: "02", t: "We prepare", d: "Our Istanbul florists arrange your order by hand, with care." },
      { n: "03", t: "We deliver", d: "Delivered in Istanbul, with confirmation sent directly to you." },
    ],
    caption: "Delivered with confirmation.",
  },
  message: {
    eyebrow: "The message",
    title: ["Sometimes the message", "means as much as the flowers."],
    quote: "“Even from far away, I wanted you to know I'm thinking of you.”",
    note: "Included with every order",
  },
  final: {
    eyebrow: "Send today",
    title: ["Make them feel", "remembered today."],
    sub: "Wherever you are, we'll prepare and deliver your flowers in Istanbul.",
    cta: "Send flowers",
    ctaAlt: "Ask your Istanbul florist",
  },
};

const de: StoryCopy = {
  trust: {
    local: ["Lieferung in Istanbul", "Vor Ort gebunden und zugestellt"],
    hand: ["Von Hand gebunden", "Von unseren Floristen in Istanbul"],
    pay: ["Internationale Karten", "Visa & Mastercard akzeptiert"],
    proof: ["Zustellbestätigung", "Wir sagen Ihnen, wenn es angekommen ist"],
  },
  emotion: {
    eyebrow: "Absicht",
    title: "Was soll sie oder er fühlen?",
    sub: "Manchmal ist das Gefühl leichter zu wählen als die Blumen.",
    feels: [
      { label: "Geliebt", quote: "Ich liebe dich." },
      { label: "Vermisst", quote: "Du fehlst mir." },
      { label: "Erinnert", quote: "Ich denke an dich." },
      { label: "Gefeiert", quote: "Herzlichen Glückwunsch." },
      { label: "Geschätzt", quote: "Danke." },
      { label: "Getröstet", quote: "Gute Besserung." },
      { label: "Überrascht", quote: "Einfach so." },
      { label: "Versöhnt", quote: "Es tut mir leid." },
      { label: "Nah bei dir", quote: "Denk an mich." },
    ],
  },
  distance: {
    title: ["Weit weg von Istanbul.", "Ganz nah bei ihr."],
    sub: "Sie wählen das Gefühl. Unsere Floristen in Istanbul binden es von Hand. Wir bringen es zu dem Menschen, den Sie lieben.",
    steps: [
      ["Weit weg – und in Gedanken bei ihr.", "Überall auf der Welt"],
      ["Unser Atelier in Istanbul.", "Nişantaşı, Istanbul"],
      ["Der Mensch, den Sie lieben.", "Istanbul, Türkei"],
    ],
  },
  atelier: {
    eyebrow: "Menschlicher Beweis",
    title: ["In Istanbul gebunden.", "In Istanbul zugestellt."],
    body: "Jeder Strauß wird frisch von unseren Floristen in Istanbul gebunden und persönlich in der Stadt zugestellt. Kein Versand aus einem anderen Land. Keine Weitergabe an einen Marktplatz-Händler.",
    points: [
      "Vor Ort von unseren Floristen in Istanbul gebunden.",
      "Kein Versand aus einem anderen Land.",
      "Mit Sorgfalt zugestellt – inklusive Bestätigung.",
    ],
  },
  concierge: {
    eyebrow: "Persönliche Hilfe",
    title: ["Unsicher, was Sie", "schicken sollen?"],
    sub: "Erzählen Sie uns von ihr oder ihm. Unsere Floristen in Istanbul helfen Ihnen, etwas Passendes zu wählen.",
    chatName: "ÇiçekYolla",
    chatStatus: "Online · Istanbul",
    chatUser: "„Meine Mutter hat in Istanbul Geburtstag.“",
    chatFlorist: "Erzählen Sie uns ein wenig von ihr. Wir finden gemeinsam etwas Persönliches.",
    cta: "Floristen in Istanbul fragen",
    note: "Ein echtes Gespräch macht die Wahl leichter.",
  },
  proof: {
    eyebrow: "Der Moment",
    quote: "Man kauft keinen Strauß. Man kauft diesen Moment.",
    title: "Sie erfahren, wenn er ankommt.",
    steps: [
      { n: "01", t: "Sie wählen", d: "Blumen aussuchen und Ihre Nachricht schreiben – von überall auf der Welt." },
      { n: "02", t: "Wir binden", d: "Unsere Floristen in Istanbul arbeiten Ihre Bestellung von Hand aus." },
      { n: "03", t: "Wir liefern", d: "Zustellung in Istanbul – mit Bestätigung direkt an Sie." },
    ],
    caption: "Zugestellt – mit Bestätigung.",
  },
  message: {
    eyebrow: "Die Nachricht",
    title: ["Manchmal bedeutet die Nachricht", "so viel wie die Blumen."],
    quote: "„Auch aus der Ferne solltest du wissen, dass ich an dich denke.“",
    note: "Bei jeder Bestellung dabei",
  },
  final: {
    eyebrow: "Heute senden",
    title: ["Lassen Sie sie heute spüren,", "dass Sie an sie denken."],
    sub: "Wo immer Sie sind – wir binden Ihre Blumen in Istanbul und liefern sie dort aus.",
    cta: "Blumen senden",
    ctaAlt: "Floristen in Istanbul fragen",
  },
};

const fr: StoryCopy = {
  trust: {
    local: ["Livraison à Istanbul", "Préparé et livré sur place"],
    hand: ["Composé à la main", "Par nos fleuristes à Istanbul"],
    pay: ["Cartes internationales", "Visa et Mastercard acceptées"],
    proof: ["Confirmation de livraison", "Nous vous prévenons à l'arrivée"],
  },
  emotion: {
    eyebrow: "Intention",
    title: "Que voulez-vous lui faire ressentir ?",
    sub: "Parfois, choisir l'émotion est plus simple que choisir les fleurs.",
    feels: [
      { label: "Aimé·e", quote: "Je t'aime." },
      { label: "Manqué·e", quote: "Tu me manques." },
      { label: "Pensé·e", quote: "Je pense à toi." },
      { label: "Célébré·e", quote: "Félicitations." },
      { label: "Apprécié·e", quote: "Merci." },
      { label: "Réconforté·e", quote: "Prompt rétablissement." },
      { label: "Surpris·e", quote: "Juste comme ça." },
      { label: "Pardonné·e", quote: "Je suis désolé·e." },
      { label: "Proche de toi", quote: "Souviens-toi de moi." },
    ],
  },
  distance: {
    title: ["Loin d'Istanbul.", "Tout près d'elle."],
    sub: "Vous choisissez l'émotion. Nos fleuristes à Istanbul la composent à la main. Nous la livrons à la personne que vous aimez.",
    steps: [
      ["Loin, et pourtant je pense à toi.", "Partout dans le monde"],
      ["Notre atelier à Istanbul.", "Nişantaşı, Istanbul"],
      ["La personne que vous aimez.", "Istanbul, Turquie"],
    ],
  },
  atelier: {
    eyebrow: "Preuve humaine",
    title: ["Composé à Istanbul.", "Livré à Istanbul."],
    body: "Chaque bouquet est composé frais par nos fleuristes à Istanbul, puis livré en main propre dans la ville. Pas d'expédition depuis un autre pays. Aucun transfert à un vendeur de place de marché.",
    points: [
      "Préparé sur place par nos fleuristes à Istanbul.",
      "Aucune expédition depuis un autre pays.",
      "Livré avec soin et confirmation.",
    ],
  },
  concierge: {
    eyebrow: "Aide personnelle",
    title: ["Vous hésitez sur", "ce qu'il faut offrir ?"],
    sub: "Parlez-nous d'elle ou de lui. Nos fleuristes à Istanbul vous aideront à choisir quelque chose qui a du sens.",
    chatName: "ÇiçekYolla",
    chatStatus: "En ligne · Istanbul",
    chatUser: "« C'est l'anniversaire de ma mère, elle vit à Istanbul. »",
    chatFlorist: "Parlez-nous un peu d'elle. Nous choisirons ensemble quelque chose de personnel.",
    cta: "Demander à votre fleuriste à Istanbul",
    note: "Une vraie conversation facilite le choix.",
  },
  proof: {
    eyebrow: "L'instant",
    quote: "On n'achète pas un bouquet. On achète cet instant.",
    title: "Vous saurez qu'il est arrivé.",
    steps: [
      { n: "01", t: "Vous choisissez", d: "Sélectionnez les fleurs et écrivez votre message, où que vous soyez." },
      { n: "02", t: "Nous préparons", d: "Nos fleuristes à Istanbul composent votre commande à la main, avec soin." },
      { n: "03", t: "Nous livrons", d: "Livré à Istanbul, avec une confirmation envoyée directement." },
    ],
    caption: "Livré avec confirmation.",
  },
  message: {
    eyebrow: "Le message",
    title: ["Parfois le message compte", "autant que les fleurs."],
    quote: "« Même de loin, je voulais que tu saches que je pense à toi. »",
    note: "Inclus avec chaque commande",
  },
  final: {
    eyebrow: "Envoyer aujourd'hui",
    title: ["Faites-lui sentir", "qu'on pense à elle aujourd'hui."],
    sub: "Où que vous soyez, nous préparons et livrons vos fleurs à Istanbul.",
    cta: "Envoyer des fleurs",
    ctaAlt: "Demander à votre fleuriste",
  },
};

const nl: StoryCopy = {
  trust: {
    local: ["Bezorging in Istanbul", "Ter plaatse gebonden en bezorgd"],
    hand: ["Met de hand gebonden", "Door onze bloemisten in Istanbul"],
    pay: ["Internationale kaarten", "Visa & Mastercard geaccepteerd"],
    proof: ["Bezorgbevestiging", "Wij laten weten dat het is aangekomen"],
  },
  emotion: {
    eyebrow: "Bedoeling",
    title: "Wat wilt u dat zij voelt?",
    sub: "Soms is het gevoel makkelijker te kiezen dan de bloemen.",
    feels: [
      { label: "Geliefd", quote: "Ik hou van je." },
      { label: "Gemist", quote: "Ik mis je." },
      { label: "Herinnerd", quote: "Ik denk aan je." },
      { label: "Gevierd", quote: "Gefeliciteerd." },
      { label: "Gewaardeerd", quote: "Dank je wel." },
      { label: "Getroost", quote: "Beterschap." },
      { label: "Verrast", quote: "Zomaar." },
      { label: "Vergeven", quote: "Het spijt me." },
      { label: "Dicht bij jou", quote: "Denk aan mij." },
    ],
  },
  distance: {
    title: ["Ver van Istanbul.", "Dichtbij haar."],
    sub: "U kiest het gevoel. Onze bloemisten in Istanbul binden het met de hand. Wij bezorgen het bij de persoon van wie u houdt.",
    steps: [
      ["Ver weg, en toch aan je denken.", "Overal ter wereld"],
      ["Ons atelier in Istanbul.", "Nişantaşı, Istanbul"],
      ["De persoon van wie u houdt.", "Istanbul, Turkije"],
    ],
  },
  atelier: {
    eyebrow: "Menselijk bewijs",
    title: ["Gebonden in Istanbul.", "Bezorgd in Istanbul."],
    body: "Elk boeket wordt vers gebonden door onze bloemisten in Istanbul en persoonlijk in de stad bezorgd. Niet verzonden vanuit een ander land. Niet doorgegeven aan een marktplaatsverkoper.",
    points: [
      "Ter plaatse gebonden door onze bloemisten in Istanbul.",
      "Niet verzonden vanuit een ander land.",
      "Met zorg bezorgd, inclusief bevestiging.",
    ],
  },
  concierge: {
    eyebrow: "Persoonlijke hulp",
    title: ["Weet u niet goed", "wat u moet sturen?"],
    sub: "Vertel ons over haar of hem. Onze bloemisten in Istanbul helpen u iets betekenisvols te kiezen.",
    chatName: "ÇiçekYolla",
    chatStatus: "Online · Istanbul",
    chatUser: "„Mijn moeder is jarig, ze woont in Istanbul.”",
    chatFlorist: "Vertel ons iets over haar. Samen kiezen we iets persoonlijks.",
    cta: "Vraag uw bloemist in Istanbul",
    note: "Een echt gesprek maakt kiezen makkelijker.",
  },
  proof: {
    eyebrow: "Het moment",
    quote: "Men koopt geen boeket. Men koopt dit moment.",
    title: "U weet wanneer het is aangekomen.",
    steps: [
      { n: "01", t: "U kiest", d: "Kies de bloemen en schrijf uw boodschap, waar u ook bent." },
      { n: "02", t: "Wij binden", d: "Onze bloemisten in Istanbul maken uw bestelling met de hand." },
      { n: "03", t: "Wij bezorgen", d: "Bezorgd in Istanbul, met bevestiging rechtstreeks aan u." },
    ],
    caption: "Bezorgd met bevestiging.",
  },
  message: {
    eyebrow: "De boodschap",
    title: ["Soms betekent de boodschap", "net zoveel als de bloemen."],
    quote: "„Zelfs van ver wilde ik dat je wist dat ik aan je denk.”",
    note: "Bij elke bestelling inbegrepen",
  },
  final: {
    eyebrow: "Vandaag versturen",
    title: ["Laat haar vandaag voelen", "dat u aan haar denkt."],
    sub: "Waar u ook bent, wij binden en bezorgen uw bloemen in Istanbul.",
    cta: "Bloemen sturen",
    ctaAlt: "Vraag uw bloemist",
  },
};

const it: StoryCopy = {
  trust: {
    local: ["Consegna a Istanbul", "Preparato e consegnato in loco"],
    hand: ["Composto a mano", "Dai nostri fioristi a Istanbul"],
    pay: ["Carte internazionali", "Visa e Mastercard accettate"],
    proof: ["Conferma di consegna", "Vi avvisiamo quando arriva"],
  },
  emotion: {
    eyebrow: "Intenzione",
    title: "Che cosa volete farle provare?",
    sub: "A volte scegliere l'emozione è più facile che scegliere i fiori.",
    feels: [
      { label: "Amata", quote: "Ti amo." },
      { label: "Mancata", quote: "Mi manchi." },
      { label: "Ricordata", quote: "Ti penso." },
      { label: "Festeggiata", quote: "Congratulazioni." },
      { label: "Apprezzata", quote: "Grazie." },
      { label: "Confortata", quote: "Guarisci presto." },
      { label: "Sorpresa", quote: "Semplicemente perché sì." },
      { label: "Perdonata", quote: "Mi dispiace." },
      { label: "Vicina a te", quote: "Ricordati di me." },
    ],
  },
  distance: {
    title: ["Lontani da Istanbul.", "Vicini a lei."],
    sub: "Voi scegliete l'emozione. I nostri fioristi a Istanbul la compongono a mano. Noi la consegniamo alla persona che amate.",
    steps: [
      ["Lontano, eppure ti penso.", "Ovunque nel mondo"],
      ["Il nostro atelier a Istanbul.", "Nişantaşı, Istanbul"],
      ["La persona che amate.", "Istanbul, Turchia"],
    ],
  },
  atelier: {
    eyebrow: "Prova umana",
    title: ["Composto a Istanbul.", "Consegnato a Istanbul."],
    body: "Ogni bouquet è composto fresco dai nostri fioristi a Istanbul e consegnato a mano in città. Non spedito da un altro paese. Non girato a un venditore di un marketplace.",
    points: [
      "Preparato in loco dai nostri fioristi a Istanbul.",
      "Non spedito da un altro paese.",
      "Consegnato con cura e con conferma.",
    ],
  },
  concierge: {
    eyebrow: "Aiuto personale",
    title: ["Non sapete", "cosa inviare?"],
    sub: "Parlateci di lei o di lui. I nostri fioristi a Istanbul vi aiuteranno a scegliere qualcosa di significativo.",
    chatName: "ÇiçekYolla",
    chatStatus: "Online · Istanbul",
    chatUser: "«È il compleanno di mia madre, vive a Istanbul.»",
    chatFlorist: "Raccontateci qualcosa di lei. Sceglieremo insieme qualcosa di personale.",
    cta: "Chiedete al vostro fiorista a Istanbul",
    note: "Una conversazione vera rende la scelta più facile.",
  },
  proof: {
    eyebrow: "Il momento",
    quote: "Non si compra un bouquet. Si compra questo momento.",
    title: "Saprete che è arrivato.",
    steps: [
      { n: "01", t: "Voi scegliete", d: "Scegliete i fiori e scrivete il messaggio, ovunque siate nel mondo." },
      { n: "02", t: "Noi prepariamo", d: "I nostri fioristi a Istanbul compongono il vostro ordine a mano, con cura." },
      { n: "03", t: "Noi consegniamo", d: "Consegnato a Istanbul, con conferma inviata direttamente a voi." },
    ],
    caption: "Consegnato con conferma.",
  },
  message: {
    eyebrow: "Il messaggio",
    title: ["A volte il messaggio conta", "quanto i fiori."],
    quote: "«Anche da lontano, volevo che sapessi che ti penso.»",
    note: "Incluso in ogni ordine",
  },
  final: {
    eyebrow: "Invia oggi",
    title: ["Fatele sentire oggi", "che vi ricordate di lei."],
    sub: "Ovunque siate, prepariamo e consegniamo i vostri fiori a Istanbul.",
    cta: "Invia fiori",
    ctaAlt: "Chiedi al fiorista",
  },
};

const es: StoryCopy = {
  trust: {
    local: ["Entrega en Estambul", "Preparado y entregado en la ciudad"],
    hand: ["Compuesto a mano", "Por nuestros floristas en Estambul"],
    pay: ["Tarjetas internacionales", "Visa y Mastercard aceptadas"],
    proof: ["Confirmación de entrega", "Le avisamos cuando llega"],
  },
  emotion: {
    eyebrow: "Intención",
    title: "¿Qué quiere que sienta?",
    sub: "A veces elegir el sentimiento es más fácil que elegir las flores.",
    feels: [
      { label: "Amada", quote: "Te quiero." },
      { label: "Echada de menos", quote: "Te echo de menos." },
      { label: "Recordada", quote: "Estoy pensando en ti." },
      { label: "Celebrada", quote: "Enhorabuena." },
      { label: "Apreciada", quote: "Gracias." },
      { label: "Reconfortada", quote: "Que te mejores." },
      { label: "Sorprendida", quote: "Porque sí." },
      { label: "Perdonada", quote: "Lo siento." },
      { label: "Cerca de ti", quote: "Acuérdate de mí." },
    ],
  },
  distance: {
    title: ["Lejos de Estambul.", "Cerca de ella."],
    sub: "Usted elige el sentimiento. Nuestros floristas en Estambul lo preparan a mano. Nosotros lo entregamos a la persona que quiere.",
    steps: [
      ["Lejos, pero pensando en ti.", "Desde cualquier lugar del mundo"],
      ["Nuestro taller en Estambul.", "Nişantaşı, Estambul"],
      ["La persona que quiere.", "Estambul, Turquía"],
    ],
  },
  atelier: {
    eyebrow: "Prueba humana",
    title: ["Preparado en Estambul.", "Entregado en Estambul."],
    body: "Cada ramo lo preparan frescos nuestros floristas en Estambul y se entrega en mano dentro de la ciudad. No se envía desde otro país. No se traspasa a un vendedor de un marketplace.",
    points: [
      "Preparado localmente por nuestros floristas en Estambul.",
      "No se envía desde otro país.",
      "Entregado con cuidado y con confirmación.",
    ],
  },
  concierge: {
    eyebrow: "Ayuda personal",
    title: ["¿No sabe qué", "enviar?"],
    sub: "Cuéntenos sobre ella o él. Nuestros floristas en Estambul le ayudarán a elegir algo con significado.",
    chatName: "ÇiçekYolla",
    chatStatus: "En línea · Estambul",
    chatUser: "«Es el cumpleaños de mi madre, vive en Estambul.»",
    chatFlorist: "Cuéntenos un poco sobre ella. Elegiremos juntos algo personal.",
    cta: "Pregunte a su florista en Estambul",
    note: "Una conversación real facilita la elección.",
  },
  proof: {
    eyebrow: "El momento",
    quote: "No se compra un ramo. Se compra este momento.",
    title: "Sabrá que ha llegado.",
    steps: [
      { n: "01", t: "Usted elige", d: "Elija las flores y escriba su mensaje desde cualquier lugar del mundo." },
      { n: "02", t: "Nosotros preparamos", d: "Nuestros floristas en Estambul preparan su pedido a mano, con cuidado." },
      { n: "03", t: "Nosotros entregamos", d: "Entregado en Estambul, con confirmación enviada directamente a usted." },
    ],
    caption: "Entregado con confirmación.",
  },
  message: {
    eyebrow: "El mensaje",
    title: ["A veces el mensaje importa", "tanto como las flores."],
    quote: "«Incluso desde lejos, quería que supieras que pienso en ti.»",
    note: "Incluido en cada pedido",
  },
  final: {
    eyebrow: "Enviar hoy",
    title: ["Hágale sentir hoy", "que la recuerda."],
    sub: "Esté donde esté, preparamos y entregamos sus flores en Estambul.",
    cta: "Enviar flores",
    ctaAlt: "Preguntar al florista",
  },
};

const pt: StoryCopy = {
  trust: {
    local: ["Entrega em Istambul", "Preparado e entregue localmente"],
    hand: ["Feito à mão", "Pelos nossos floristas em Istambul"],
    pay: ["Cartões internacionais", "Visa e Mastercard aceites"],
    proof: ["Confirmação de entrega", "Avisamos quando chega"],
  },
  emotion: {
    eyebrow: "Intenção",
    title: "O que quer que ela sinta?",
    sub: "Às vezes escolher o sentimento é mais fácil do que escolher as flores.",
    feels: [
      { label: "Amada", quote: "Amo-te." },
      { label: "Com saudade", quote: "Tenho saudades tuas." },
      { label: "Lembrada", quote: "Estou a pensar em ti." },
      { label: "Celebrada", quote: "Parabéns." },
      { label: "Apreciada", quote: "Obrigado." },
      { label: "Confortada", quote: "As melhoras." },
      { label: "Surpreendida", quote: "Só porque sim." },
      { label: "Perdoada", quote: "Desculpa." },
      { label: "Perto de ti", quote: "Lembra-te de mim." },
    ],
  },
  distance: {
    title: ["Longe de Istambul.", "Perto dela."],
    sub: "Você escolhe o sentimento. Os nossos floristas em Istambul preparam-no à mão. Nós entregamo-lo à pessoa que ama.",
    steps: [
      ["Longe, e a pensar em ti.", "Em qualquer parte do mundo"],
      ["O nosso atelier em Istambul.", "Nişantaşı, Istambul"],
      ["A pessoa que ama.", "Istambul, Turquia"],
    ],
  },
  atelier: {
    eyebrow: "Prova humana",
    title: ["Feito em Istambul.", "Entregue em Istambul."],
    body: "Cada ramo é preparado fresco pelos nossos floristas em Istambul e entregue em mão dentro da cidade. Não é enviado de outro país. Não é passado a um vendedor de marketplace.",
    points: [
      "Preparado localmente pelos nossos floristas em Istambul.",
      "Não enviado de outro país.",
      "Entregue com cuidado e com confirmação.",
    ],
  },
  concierge: {
    eyebrow: "Ajuda pessoal",
    title: ["Não sabe o que", "enviar?"],
    sub: "Fale-nos dela ou dele. Os nossos floristas em Istambul ajudam-no a escolher algo com significado.",
    chatName: "ÇiçekYolla",
    chatStatus: "Online · Istambul",
    chatUser: "«É o aniversário da minha mãe, ela vive em Istambul.»",
    chatFlorist: "Conte-nos um pouco sobre ela. Vamos escolher juntos algo pessoal.",
    cta: "Pergunte ao seu florista em Istambul",
    note: "Uma conversa real torna a escolha mais fácil.",
  },
  proof: {
    eyebrow: "O momento",
    quote: "Não se compra um ramo. Compra-se este momento.",
    title: "Vai saber que chegou.",
    steps: [
      { n: "01", t: "Você escolhe", d: "Escolha as flores e escreva a sua mensagem, esteja onde estiver." },
      { n: "02", t: "Nós preparamos", d: "Os nossos floristas em Istambul preparam o seu pedido à mão, com cuidado." },
      { n: "03", t: "Nós entregamos", d: "Entregue em Istambul, com confirmação enviada diretamente para si." },
    ],
    caption: "Entregue com confirmação.",
  },
  message: {
    eyebrow: "A mensagem",
    title: ["Às vezes a mensagem vale", "tanto como as flores."],
    quote: "«Mesmo de longe, queria que soubesses que penso em ti.»",
    note: "Incluído em cada encomenda",
  },
  final: {
    eyebrow: "Enviar hoje",
    title: ["Faça-a sentir hoje", "que se lembra dela."],
    sub: "Onde quer que esteja, preparamos e entregamos as suas flores em Istambul.",
    cta: "Enviar flores",
    ctaAlt: "Perguntar ao florista",
  },
};

const az: StoryCopy = {
  trust: {
    local: ["İstanbula çatdırılma", "Yerində hazırlanır və çatdırılır"],
    hand: ["Əl ilə hazırlanır", "İstanbuldakı floristlərimiz tərəfindən"],
    pay: ["Beynəlxalq kartlar", "Visa və Mastercard qəbul olunur"],
    proof: ["Çatdırılma təsdiqi", "Çatdığını sizə bildiririk"],
  },
  emotion: {
    eyebrow: "Niyyət",
    title: "Onun nə hiss etməsini istəyirsiniz?",
    sub: "Bəzən hissi seçmək çiçəyi seçməkdən asandır.",
    feels: [
      { label: "Sevilən", quote: "Səni sevirəm." },
      { label: "Darıxılan", quote: "Səndən ötrü darıxıram." },
      { label: "Xatırlanan", quote: "Səni düşünürəm." },
      { label: "Təbrik olunan", quote: "Təbrik edirəm." },
      { label: "Dəyər verilən", quote: "Təşəkkür edirəm." },
      { label: "Təsəlli tapan", quote: "Tez sağalın." },
      { label: "Təəccüblənən", quote: "Sadəcə elə-belə." },
      { label: "Bağışlanan", quote: "Üzr istəyirəm." },
      { label: "Sənə yaxın", quote: "Məni xatırla." },
    ],
  },
  distance: {
    title: ["İstanbuldan uzaqda.", "Ona yaxın."],
    sub: "Siz hissi seçirsiniz. İstanbuldakı floristlərimiz onu əl ilə hazırlayır. Biz sevdiyiniz insana çatdırırıq.",
    steps: [
      ["Uzaqda, amma səni düşünürəm.", "Dünyanın istənilən yerindən"],
      ["İstanbuldakı emalatxanamız.", "Nişantaşı, İstanbul"],
      ["Sevdiyiniz insan.", "İstanbul, Türkiyə"],
    ],
  },
  atelier: {
    eyebrow: "İnsan sübutu",
    title: ["İstanbulda hazırlanır.", "İstanbulda çatdırılır."],
    body: "Hər buket İstanbuldakı floristlərimiz tərəfindən təzə hazırlanır və şəhər daxilində əldən-ələ çatdırılır. Başqa ölkədən göndərilmir. Marketplace satıcısına ötürülmür.",
    points: [
      "İstanbuldakı floristlərimiz tərəfindən yerində hazırlanır.",
      "Başqa ölkədən göndərilmir.",
      "Qayğı ilə və təsdiqlə çatdırılır.",
    ],
  },
  concierge: {
    eyebrow: "Şəxsi kömək",
    title: ["Nə göndərəcəyinizə", "qərar verə bilmirsiniz?"],
    sub: "Bizə ondan danışın. İstanbuldakı floristlərimiz mənalı bir seçim etməyinizə kömək edəcək.",
    chatName: "ÇiçekYolla",
    chatStatus: "Onlayn · İstanbul",
    chatUser: "«Anamın ad günüdür, İstanbulda yaşayır.»",
    chatFlorist: "Bizə onun haqqında bir az danışın. Birlikdə mənalı bir şey seçək.",
    cta: "İstanbuldakı floristinizdən soruşun",
    note: "Real söhbət seçimi asanlaşdırır.",
  },
  proof: {
    eyebrow: "An",
    quote: "İnsan buket almır. Bu anı alır.",
    title: "Çatdığını biləcəksiniz.",
    steps: [
      { n: "01", t: "Siz seçirsiniz", d: "Çiçəkləri seçin və mesajınızı yazın — dünyanın istənilən yerindən." },
      { n: "02", t: "Biz hazırlayırıq", d: "İstanbuldakı floristlərimiz sifarişinizi əl ilə, qayğı ilə hazırlayır." },
      { n: "03", t: "Biz çatdırırıq", d: "İstanbulda çatdırılır, təsdiq birbaşa sizə göndərilir." },
    ],
    caption: "Təsdiqlə çatdırıldı.",
  },
  message: {
    eyebrow: "Mesaj",
    title: ["Bəzən mesaj", "çiçək qədər dəyərlidir."],
    quote: "«Uzaqdan da olsa, səni düşündüyümü bilməyini istədim.»",
    note: "Hər sifarişə daxildir",
  },
  final: {
    eyebrow: "Bu gün göndərin",
    title: ["Bu gün ona xatırlandığını", "hiss etdirin."],
    sub: "Harada olursunuzsa olun, çiçəklərinizi İstanbulda hazırlayıb çatdırırıq.",
    cta: "Çiçək göndər",
    ctaAlt: "Floristdən soruş",
  },
};

const ru: StoryCopy = {
  trust: {
    local: ["Доставка по Стамбулу", "Собираем и доставляем на месте"],
    hand: ["Собрано вручную", "Нашими флористами в Стамбуле"],
    pay: ["Зарубежные карты", "Visa и Mastercard принимаются"],
    proof: ["Подтверждение доставки", "Сообщим, когда букет вручат"],
  },
  emotion: {
    eyebrow: "Намерение",
    title: "Что она должна почувствовать?",
    sub: "Иногда выбрать чувство проще, чем выбрать цветы.",
    feels: [
      { label: "Любимая", quote: "Я люблю тебя." },
      { label: "Та, по кому скучают", quote: "Я скучаю по тебе." },
      { label: "Та, о ком помнят", quote: "Я думаю о тебе." },
      { label: "Та, кого поздравляют", quote: "Поздравляю." },
      { label: "Та, кого ценят", quote: "Спасибо." },
      { label: "Та, кого поддержали", quote: "Выздоравливай." },
      { label: "Удивлённая", quote: "Просто так." },
      { label: "Прощённая", quote: "Прости меня." },
      { label: "Рядом с тобой", quote: "Помни обо мне." },
    ],
  },
  distance: {
    title: ["Далеко от Стамбула.", "Рядом с ней."],
    sub: "Вы выбираете чувство. Наши флористы в Стамбуле собирают его вручную. Мы вручаем его человеку, которого вы любите.",
    steps: [
      ["Далеко — и всё же думаю о тебе.", "Из любой точки мира"],
      ["Наша мастерская в Стамбуле.", "Нишанташи, Стамбул"],
      ["Человек, которого вы любите.", "Стамбул, Турция"],
    ],
  },
  atelier: {
    eyebrow: "Человеческое доказательство",
    title: ["Собрано в Стамбуле.", "Вручено в Стамбуле."],
    body: "Каждый букет собирают свежим наши флористы в Стамбуле, а затем вручают лично в черте города. Не пересылается из другой страны. Не передаётся продавцу маркетплейса.",
    points: [
      "Собрано на месте нашими флористами в Стамбуле.",
      "Не пересылается из другой страны.",
      "Вручается бережно и с подтверждением.",
    ],
  },
  concierge: {
    eyebrow: "Личная помощь",
    title: ["Не знаете,", "что отправить?"],
    sub: "Расскажите нам о ней. Наши флористы в Стамбуле помогут выбрать что-то по-настоящему уместное.",
    chatName: "ÇiçekYolla",
    chatStatus: "Онлайн · Стамбул",
    chatUser: "«У мамы день рождения, она живёт в Стамбуле.»",
    chatFlorist: "Расскажите немного о ней. Вместе подберём что-то личное.",
    cta: "Спросить флориста в Стамбуле",
    note: "Живой разговор облегчает выбор.",
  },
  proof: {
    eyebrow: "Момент",
    quote: "Покупают не букет. Покупают этот момент.",
    title: "Вы узнаете, что букет вручили.",
    steps: [
      { n: "01", t: "Вы выбираете", d: "Выберите цветы и напишите сообщение — из любой точки мира." },
      { n: "02", t: "Мы собираем", d: "Наши флористы в Стамбуле собирают заказ вручную, с вниманием к деталям." },
      { n: "03", t: "Мы вручаем", d: "Доставка по Стамбулу с подтверждением, отправленным лично вам." },
    ],
    caption: "Вручено с подтверждением.",
  },
  message: {
    eyebrow: "Сообщение",
    title: ["Иногда слова значат", "не меньше, чем цветы."],
    quote: "«Даже издалека я хотел, чтобы ты знала: я думаю о тебе.»",
    note: "Входит в каждый заказ",
  },
  final: {
    eyebrow: "Отправить сегодня",
    title: ["Пусть она сегодня почувствует,", "что о ней помнят."],
    sub: "Где бы вы ни были, мы соберём и доставим ваши цветы в Стамбуле.",
    cta: "Отправить цветы",
    ctaAlt: "Спросить флориста",
  },
};

const ar: StoryCopy = {
  trust: {
    local: ["توصيل داخل إسطنبول", "نُحضّره ونسلّمه محليًا"],
    hand: ["تنسيق يدوي", "على يد منسّقينا في إسطنبول"],
    pay: ["بطاقات دولية", "نقبل Visa وMastercard"],
    proof: ["تأكيد التسليم", "نُعلمك عند وصول الباقة"],
  },
  emotion: {
    eyebrow: "النية",
    title: "بماذا تريد أن تشعر؟",
    sub: "أحيانًا اختيار الشعور أسهل من اختيار الزهور.",
    feels: [
      { label: "محبوبة", quote: "أحبك." },
      { label: "مشتاق إليها", quote: "اشتقت إليك." },
      { label: "في البال", quote: "أفكر فيك." },
      { label: "مُهنّأة", quote: "مبروك." },
      { label: "مُقدّرة", quote: "شكرًا لك." },
      { label: "مُواسَاة", quote: "سلامتك." },
      { label: "مُفاجأة", quote: "بلا مناسبة." },
      { label: "مسامَحة", quote: "أعتذر." },
      { label: "قريبة منك", quote: "تذكّريني." },
    ],
  },
  distance: {
    title: ["بعيد عن إسطنبول.", "قريب منها."],
    sub: "أنت تختار الشعور. منسّقونا في إسطنبول يحضّرونه يدويًا. ونحن نسلّمه لمن تحب.",
    steps: [
      ["بعيد، ومع ذلك أفكر فيك.", "من أي مكان في العالم"],
      ["ورشتنا في إسطنبول.", "نيشانتاشي، إسطنبول"],
      ["الشخص الذي تحبه.", "إسطنبول، تركيا"],
    ],
  },
  atelier: {
    eyebrow: "دليل إنساني",
    title: ["يُحضَّر في إسطنبول.", "يُسلَّم في إسطنبول."],
    body: "كل باقة يُنسّقها منسّقونا في إسطنبول طازجة، ثم تُسلَّم باليد داخل المدينة. لا تُشحن من بلد آخر، ولا تُحوَّل إلى بائع في سوق إلكتروني.",
    points: [
      "يُحضَّر محليًا على يد منسّقينا في إسطنبول.",
      "لا يُشحن من بلد آخر.",
      "يُسلَّم بعناية مع تأكيد.",
    ],
  },
  concierge: {
    eyebrow: "مساعدة شخصية",
    title: ["لم تقرّر بعد", "ماذا ترسل؟"],
    sub: "حدّثنا عنها. سيساعدك منسّقونا في إسطنبول على اختيار شيء ذي معنى.",
    chatName: "ÇiçekYolla",
    chatStatus: "متصل · إسطنبول",
    chatUser: "«عيد ميلاد والدتي، وهي تعيش في إسطنبول.»",
    chatFlorist: "حدّثنا قليلًا عنها، وسنختار معًا شيئًا خاصًا.",
    cta: "اسأل منسّقك في إسطنبول",
    note: "الحوار الحقيقي يجعل الاختيار أسهل.",
  },
  proof: {
    eyebrow: "اللحظة",
    quote: "لا أحد يشتري باقة. الجميع يشترون هذه اللحظة.",
    title: "ستعرف أنها وصلت.",
    steps: [
      { n: "٠١", t: "أنت تختار", d: "اختر الزهور واكتب رسالتك من أي مكان في العالم." },
      { n: "٠٢", t: "نحن نُحضّر", d: "منسّقونا في إسطنبول ينسّقون طلبك يدويًا وبعناية." },
      { n: "٠٣", t: "نحن نُسلّم", d: "يُسلَّم في إسطنبول، ويصلك التأكيد مباشرة." },
    ],
    caption: "سُلِّم مع التأكيد.",
  },
  message: {
    eyebrow: "الرسالة",
    title: ["أحيانًا تكون الرسالة", "بأهمية الزهور نفسها."],
    quote: "«حتى من بعيد، أردتك أن تعرفي أنني أفكر فيك.»",
    note: "مرفقة مع كل طلب",
  },
  final: {
    eyebrow: "أرسل اليوم",
    title: ["اجعلها تشعر اليوم", "بأنك تتذكّرها."],
    sub: "أينما كنت، نحضّر زهورك ونسلّمها في إسطنبول.",
    cta: "أرسل الزهور",
    ctaAlt: "اسأل المنسّق",
  },
};

const zh: StoryCopy = {
  trust: {
    local: ["伊斯坦布尔配送", "本地制作，本地送达"],
    hand: ["手工制作", "由我们的伊斯坦布尔花艺师完成"],
    pay: ["国际银行卡", "接受 Visa 与 Mastercard"],
    proof: ["送达确认", "送到后我们会通知您"],
  },
  emotion: {
    eyebrow: "心意",
    title: "您希望她感受到什么？",
    sub: "有时候，选择心意比选择花束更容易。",
    feels: [
      { label: "被爱", quote: "我爱你。" },
      { label: "被想念", quote: "我想你。" },
      { label: "被惦记", quote: "我一直想着你。" },
      { label: "被祝贺", quote: "恭喜你。" },
      { label: "被感激", quote: "谢谢你。" },
      { label: "被安慰", quote: "早日康复。" },
      { label: "被惊喜", quote: "没有理由，就是想送你。" },
      { label: "被原谅", quote: "对不起。" },
      { label: "与你相近", quote: "记得我。" },
    ],
  },
  distance: {
    title: ["远在伊斯坦布尔之外。", "却离她很近。"],
    sub: "您选择心意，我们的伊斯坦布尔花艺师亲手完成，我们把它送到您爱的人手中。",
    steps: [
      ["身在远方，心在你处。", "世界任何角落"],
      ["我们在伊斯坦布尔的工作室。", "尼相塔什，伊斯坦布尔"],
      ["您所爱的人。", "土耳其，伊斯坦布尔"],
    ],
  },
  atelier: {
    eyebrow: "真实可见",
    title: ["在伊斯坦布尔制作。", "在伊斯坦布尔送达。"],
    body: "每一束花都由我们的伊斯坦布尔花艺师新鲜制作，并在城内亲手送达。不从其他国家寄送，也不转交给第三方平台卖家。",
    points: [
      "由我们的伊斯坦布尔花艺师本地制作。",
      "不从其他国家寄送。",
      "用心送达，并提供确认。",
    ],
  },
  concierge: {
    eyebrow: "专属协助",
    title: ["还没决定", "送什么？"],
    sub: "告诉我们她的故事，我们的伊斯坦布尔花艺师会帮您挑选有意义的礼物。",
    chatName: "ÇiçekYolla",
    chatStatus: "在线 · 伊斯坦布尔",
    chatUser: "「我母亲的生日，她住在伊斯坦布尔。」",
    chatFlorist: "和我们说说她吧，我们一起挑选一份贴心的礼物。",
    cta: "咨询您的伊斯坦布尔花艺师",
    note: "真人对话让选择更轻松。",
  },
  proof: {
    eyebrow: "那一刻",
    quote: "顾客买的不是花束，而是这一刻。",
    title: "您会知道花已送达。",
    steps: [
      { n: "01", t: "您选择", d: "在世界任何地方挑选鲜花并写下留言。" },
      { n: "02", t: "我们制作", d: "我们的伊斯坦布尔花艺师用心手工完成您的订单。" },
      { n: "03", t: "我们送达", d: "在伊斯坦布尔送达，并将确认直接发送给您。" },
    ],
    caption: "送达并确认。",
  },
  message: {
    eyebrow: "留言",
    title: ["有时候，那句话", "和花一样重要。"],
    quote: "「即使相隔很远，也想让你知道我在想你。」",
    note: "每笔订单均含贺卡",
  },
  final: {
    eyebrow: "今天送出",
    title: ["今天就让她感受到", "你一直记得她。"],
    sub: "无论您身在何处，我们都会在伊斯坦布尔为您制作并送达鲜花。",
    cta: "送出鲜花",
    ctaAlt: "咨询花艺师",
  },
};

const ja: StoryCopy = {
  trust: {
    local: ["イスタンブール配達", "現地で制作し、現地でお届け"],
    hand: ["手作業で制作", "イスタンブールのフローリストが担当"],
    pay: ["海外発行カード", "Visa・Mastercard 対応"],
    proof: ["配達確認", "お届け完了をお知らせします"],
  },
  emotion: {
    eyebrow: "気持ち",
    title: "どんな気持ちを届けたいですか。",
    sub: "花を選ぶより、気持ちを選ぶほうがやさしいこともあります。",
    feels: [
      { label: "愛されている", quote: "愛しています。" },
      { label: "会いたい", quote: "会いたいです。" },
      { label: "想っている", quote: "あなたを想っています。" },
      { label: "祝福", quote: "おめでとうございます。" },
      { label: "感謝", quote: "ありがとう。" },
      { label: "励まし", quote: "お大事に。" },
      { label: "サプライズ", quote: "理由はなくても。" },
      { label: "ごめんね", quote: "ごめんなさい。" },
      { label: "そばにいる", quote: "忘れないで。" },
    ],
  },
  distance: {
    title: ["イスタンブールから遠く離れて。", "それでも、そばに。"],
    sub: "あなたが気持ちを選び、イスタンブールのフローリストが手で束ね、大切な方へお届けします。",
    steps: [
      ["遠くにいても、あなたを想って。", "世界のどこからでも"],
      ["イスタンブールの工房。", "ニシャンタシュ、イスタンブール"],
      ["あなたの大切な方。", "トルコ、イスタンブール"],
    ],
  },
  atelier: {
    eyebrow: "確かな手仕事",
    title: ["イスタンブールで制作。", "イスタンブールでお届け。"],
    body: "すべての花束はイスタンブールのフローリストがその日に束ね、市内へ手渡しでお届けします。他国からの発送でも、他社への委託でもありません。",
    points: [
      "イスタンブールのフローリストが現地で制作します。",
      "他国から発送はいたしません。",
      "丁寧にお届けし、確認をお送りします。",
    ],
  },
  concierge: {
    eyebrow: "個別のご相談",
    title: ["何を贈るか", "迷っていますか。"],
    sub: "その方のことをお聞かせください。イスタンブールのフローリストが、心のこもった一品をご提案します。",
    chatName: "ÇiçekYolla",
    chatStatus: "オンライン · イスタンブール",
    chatUser: "「母の誕生日です。イスタンブールに住んでいます。」",
    chatFlorist: "お母様のことを少し教えてください。一緒に心のこもった花を選びましょう。",
    cta: "イスタンブールのフローリストに相談",
    note: "会話があると、選ぶのはぐっと楽になります。",
  },
  proof: {
    eyebrow: "その瞬間",
    quote: "お客様が買うのは花束ではなく、この瞬間です。",
    title: "届いたことが、わかります。",
    steps: [
      { n: "01", t: "お選びいただく", d: "世界のどこからでも、花を選びメッセージを添えてください。" },
      { n: "02", t: "私たちが束ねる", d: "イスタンブールのフローリストが、ひとつずつ手作業で仕上げます。" },
      { n: "03", t: "私たちが届ける", d: "イスタンブール市内へお届けし、確認をお客様へ直接お送りします。" },
    ],
    caption: "確認付きでお届け。",
  },
  message: {
    eyebrow: "メッセージ",
    title: ["ときに言葉は、", "花と同じだけの意味を持ちます。"],
    quote: "「遠く離れていても、あなたを想っていることを伝えたくて。」",
    note: "すべてのご注文に添えられます",
  },
  final: {
    eyebrow: "今日贈る",
    title: ["今日、想われていることを", "感じてもらいましょう。"],
    sub: "どこにいらしても、イスタンブールで花をご用意しお届けします。",
    cta: "花を贈る",
    ctaAlt: "フローリストに相談",
  },
};

const ko: StoryCopy = {
  trust: {
    local: ["이스탄불 배송", "현지에서 제작하고 현지에서 전달"],
    hand: ["손으로 제작", "이스탄불 플로리스트가 직접"],
    pay: ["해외 카드", "Visa·Mastercard 사용 가능"],
    proof: ["배송 확인", "도착하면 알려드립니다"],
  },
  emotion: {
    eyebrow: "마음",
    title: "어떤 마음을 전하고 싶으신가요?",
    sub: "때로는 꽃보다 마음을 고르는 것이 더 쉽습니다.",
    feels: [
      { label: "사랑받는", quote: "사랑합니다." },
      { label: "그리운", quote: "보고 싶어요." },
      { label: "기억되는", quote: "당신을 생각하고 있어요." },
      { label: "축하받는", quote: "축하합니다." },
      { label: "감사한", quote: "고맙습니다." },
      { label: "위로받는", quote: "빨리 나으세요." },
      { label: "놀라운", quote: "그냥, 문득." },
      { label: "용서받는", quote: "미안합니다." },
      { label: "곁에 있는", quote: "저를 기억해 주세요." },
    ],
  },
  distance: {
    title: ["이스탄불에서 멀리.", "그 사람 곁에 가까이."],
    sub: "마음은 당신이 고르고, 이스탄불 플로리스트가 손으로 만들고, 저희가 사랑하는 분께 전합니다.",
    steps: [
      ["멀리 있어도, 당신을 생각합니다.", "세계 어디에서든"],
      ["이스탄불의 저희 작업실.", "니샨타시, 이스탄불"],
      ["당신이 사랑하는 사람.", "튀르키예 이스탄불"],
    ],
  },
  atelier: {
    eyebrow: "사람의 손길",
    title: ["이스탄불에서 만듭니다.", "이스탄불에서 전합니다."],
    body: "모든 꽃다발은 이스탄불 플로리스트가 그날 신선하게 만들고, 도시 안에서 직접 전달합니다. 다른 나라에서 발송하지 않으며, 오픈마켓 판매자에게 넘기지 않습니다.",
    points: [
      "이스탄불 플로리스트가 현지에서 제작합니다.",
      "다른 나라에서 발송하지 않습니다.",
      "정성껏 전달하고 확인을 보내드립니다.",
    ],
  },
  concierge: {
    eyebrow: "맞춤 도움",
    title: ["무엇을 보낼지", "고민되시나요?"],
    sub: "그분에 대해 알려주세요. 이스탄불 플로리스트가 의미 있는 선택을 도와드립니다.",
    chatName: "ÇiçekYolla",
    chatStatus: "온라인 · 이스탄불",
    chatUser: "“어머니 생신이에요. 이스탄불에 계세요.”",
    chatFlorist: "어머님에 대해 조금 들려주세요. 함께 의미 있는 꽃을 골라보겠습니다.",
    cta: "이스탄불 플로리스트에게 문의",
    note: "실제 대화가 선택을 훨씬 쉽게 만듭니다.",
  },
  proof: {
    eyebrow: "그 순간",
    quote: "고객이 사는 것은 꽃다발이 아니라 이 순간입니다.",
    title: "도착한 것을 알게 됩니다.",
    steps: [
      { n: "01", t: "고객이 선택", d: "세계 어디에서든 꽃을 고르고 메시지를 남겨주세요." },
      { n: "02", t: "저희가 제작", d: "이스탄불 플로리스트가 정성껏 손으로 완성합니다." },
      { n: "03", t: "저희가 전달", d: "이스탄불에서 전달하고, 확인을 직접 보내드립니다." },
    ],
    caption: "확인과 함께 전달합니다.",
  },
  message: {
    eyebrow: "메시지",
    title: ["때로는 그 한마디가", "꽃만큼 큰 의미가 됩니다."],
    quote: "“멀리 있어도 당신을 생각하고 있다는 걸 알려주고 싶었어요.”",
    note: "모든 주문에 포함됩니다",
  },
  final: {
    eyebrow: "오늘 보내기",
    title: ["오늘, 기억되고 있다는 마음을", "전해보세요."],
    sub: "어디에 계시든 이스탄불에서 꽃을 준비해 전해드립니다.",
    cta: "꽃 보내기",
    ctaAlt: "플로리스트에게 문의",
  },
};

export const STORY: Record<GlobalLocale, StoryCopy> = {
  en, de, fr, nl, it, es, pt, az, ru, ar, zh, ja, ko,
};
