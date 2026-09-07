// GLOBAL VERSION 80 — varsayılan sunum metinleri: EN · DE · FR · NL.
// Kaynak: Figma Version 80 TR kopyası, ÇiçekYolla gerçeklerine göre uyarlandı
// (saat/dakika vaadi YOK, uydurma sipariş sayısı YOK, iade vaadi YOK).
import type { V80Copy } from "./copyTypes";

export const en: V80Copy = {
  header: {
    search: "Search flowers or categories", searchHint: "Type at least two letters", whatsapp: "WhatsApp", cart: "Open cart", menu: "Open menu", closeMenu: "Close menu",
    currency: "Currency", noResults: "We couldn't find that flower", popular: "Popular searches", seeAll: "See all results →", products: "Products", categories: "Categories", skip: "Skip to content",
  },
  hero: {
    eyebrow: "Flowers & gifts to Türkiye · Felt from afar", title1: "Send your feeling", title2: "to the people you love", titleEm: "in Türkiye.",
    body: "Wherever you are in the world — our local atelier prepares it and leaves it at their door. You only tell us who you love and where they are.",
    cta: "See the flowers", cta2: "How it works?",
    occasion: "Occasion", occasionAny: "Choose an occasion", date: "Delivery date", datePick: "Pick a date", where: "Where to", whereEmpty: "Choose a delivery address", whereChange: "Change address",
    sameDay: "Same-day delivery in eligible Istanbul districts", cargo: "Türkiye-wide cargo · 1–3 business days", founded: "Since 1986 — with local ateliers across Türkiye",
    statusOpen: "Same-day delivery is still open today for this address", statusClosed: "Today's same-day orders are closed — next-day delivery is open",
  },
  ticker: { hand: "Hand-tied · from a local atelier", since: "Since 1986 · to Türkiye", fresh: "Freshly cut · same-day fresh", world: "Ordered worldwide · delivered to the door", types: "Roses · Peonies · Tulips · Seasonal", care: "Every bouquet prepared with care" },
  trustMini: { ssl: "SSL-encrypted payment", whatsapp: "WhatsApp support", since: "Since 1986" },
  discovery: {
    eyebrow: "Let's find it together",
    groups: { who: "Who is it for?", occasion: "What's the occasion?", what: "What would you like to send?", where: "Where in Türkiye?" },
    chips: { mother: "My mother", partner: "My partner", friend: "My friend", colleague: "A colleague", sibling: "My sibling", family: "Family", birthday: "Birthday", anniversary: "Anniversary", condolence: "Condolence", thanks: "Thank you", sorry: "I'm sorry", surprise: "Surprise" },
    show: "Show the selection →", match: "{n} picks match your choice", clear: "Clear filters",
  },
  shop: {
    eyebrow: "Selections", eyebrowFor: "Picked for you", title: "Most sent", titleFor: "Picks for {x}", all: "All products →", tabAll: "All", unit: "products", more: "Show more ({n} products)",
    promoTitle: "Every bouquet is made by hand after your order.", promoBody: "Freshly cut, prepared on the day. From the atelier to their door, without waiting.", promoCta: "See how it works →", cardCta: "Send this",
    sameDay: "Same-day · Istanbul", cargo: "Türkiye-wide · 1–3 days", bestseller: "Bestseller", new: "New", sale: "Offer", empty: "No products match this selection yet.",
  },
  categories: { eyebrow: "Categories", title: "Explore by type", pick: "Choose a collection →", kinds: "{n} varieties", from: "from {price}" },
  delivery: {
    eyebrow: "Delivery options", title: "Prepared today,", titleEm: "delivered with care.", selected: "Selected location", noSelection: "No address selected yet",
    items: {
      istanbul: { label: "Istanbul · Same-day courier", title: "Same-day delivery", sub: "In eligible Istanbul districts. Order today, our courier delivers today — the exact time slots are shown on the product page." },
      cargo: { label: "All of Türkiye", title: "Cargo delivery · 1–3 business days", sub: "Far cities are possible too. Prepared with care, packed fresh, tracked cargo." },
      cities: { label: "Antalya · Muğla · İzmir", title: "Coastal cities", sub: "Freshly packed flowers to the Mediterranean and the Aegean, delivered by cargo to the address you choose." },
    },
  },
  collections: { eyebrow: "Collections", title: "Let's find what you're looking for", sub: "Our local ateliers prepare every bouquet by hand. It leaves the atelier on delivery day and reaches the door of the people you love.", view: "View →" },
  mood: {
    eyebrow: "Feeling & occasion", title: "What do you want to say?",
    items: {
      love: { word: "Love", line: "I love you so much.", sub: "Always, every day.", cta: "Roses for love" },
      birthday: { word: "Birthday", line: "Happy birthday.", sub: "Celebrated from afar, too.", cta: "Birthday bouquet" },
      sorry: { word: "Sorry", line: "I'm sorry, truly.", sub: "Sometimes flowers say it better.", cta: "White arrangement" },
      thanks: { word: "Thank you", line: "It wouldn't have happened without you.", sub: "For someone who made a difference.", cta: "Thank-you bouquet" },
      condolence: { word: "Condolence", line: "I'm with you.", sub: "When words are not enough.", cta: "Simple white arrangement" },
    },
  },
  card: {
    eyebrow: "Handwritten card — free", title: "What should we write on your card?", sub: "You write your message at checkout; we hand-write it on a card and tuck it into the bouquet.", note: "Message is added at checkout · up to 200 characters", preview: "Your message will appear here…", brand: "ÇiçekYolla", cta: "Choose flowers with this feeling →",
    occasions: { love: "Love", birthday: "Birthday", sorry: "Sorry", thanks: "Thank you", condolence: "Condolence", getwell: "Get well" },
    lines: {
      love: ["Thinking of you.", "So glad you exist.", "I'm far away, but my heart is there.", "Today is yours."],
      birthday: ["Happy birthday.", "Today is your day.", "Many happy returns.", "I love you so much."],
      sorry: ["I'm sorry, truly.", "I was wrong, forgive me.", "I want to be by your side.", "Will you forgive me?"],
      thanks: ["It wouldn't have happened without you.", "It means so much.", "Thank you for everything.", "With all my heart."],
      condolence: ["I'm with you.", "I share your sorrow.", "I'm always here.", "My deepest condolences."],
      getwell: ["Get well soon.", "You'll be up in no time.", "I'm with you.", "It will pass, you'll be fine."],
    },
  },
  destinations: { eyebrow: "Delivery destinations", title: "Where shall we send it?", sameDay: "Same day", cargo: "Cargo delivery", districts: "{n} districts", subs: { istanbul: "Europe & Anatolia", antalya: "Mediterranean coast", mugla: "Bodrum, Marmaris, Fethiye", izmir: "Pearl of the Aegean" } },
  journey: {
    title1: "Order from anywhere in the world.", title2: "Delivered in Türkiye.", body: "Wherever you are — place the order, let our atelier prepare it.",
    bullets: ["SSL-encrypted payment · secure checkout", "WhatsApp support · order tracking", "Since 1986, across Türkiye"], cta: "Order now",
    steps: [
      { t: "It starts in the world", d: "Wherever you are. Your order begins." },
      { t: "Prepared in Türkiye", d: "Our nearest local atelier prepares it with care. Freshly cut, on the day." },
      { t: "Reaches their door", d: "Packed fresh, made by hand. To the address you choose, at the speed you choose." },
      { t: "You know, too", d: "Prepared · On the way · Delivered. We keep you informed." },
    ],
    quote: "Since 1986 we have worked with local florists across Türkiye. Your order is prepared in local hands and delivered to the door of the people you love.",
    help: "Help & support", wa: "Write on WhatsApp", waNote: "TR/EN · Türkiye time", facts: { founded: "Founded", local: "Atelier system" },
  },
  reviews: { eyebrow: "Customer reviews", title: "In their words.", source: "Real Google reviews" },
  cta: { eyebrow: "Ready?", title1: "Send something today.", titleEm: "Distance is no obstacle to love.", body: "Wherever you are, place your order. Flowers prepared in our Istanbul atelier are delivered the same day in eligible districts, and by cargo across Türkiye.", button: "Send now →", bullets: ["Istanbul · Same-day delivery", "All of Türkiye · Fresh flowers by cargo"] },
  trust: {
    pay: { title: "Secure payment", desc: "3D Secure, SSL-encrypted" },
    sameday: { title: "Same-day delivery", desc: "Eligible Istanbul districts" },
    whatsapp: { title: "WhatsApp support", desc: "Track your order live" },
    fresh: { title: "Freshness guarantee", desc: "Hand-tied after your order" },
  },
  content: { faq: "Frequently asked questions", more: "Read more" },
};

export const de: V80Copy = {
  header: {
    search: "Blumen oder Kategorien suchen", searchHint: "Mindestens zwei Buchstaben eingeben", whatsapp: "WhatsApp", cart: "Warenkorb öffnen", menu: "Menü öffnen", closeMenu: "Menü schließen",
    currency: "Währung", noResults: "Diese Blume haben wir nicht gefunden", popular: "Beliebte Suchen", seeAll: "Alle Ergebnisse →", products: "Produkte", categories: "Kategorien", skip: "Zum Inhalt springen",
  },
  hero: {
    eyebrow: "Blumen & Geschenke in die Türkei · Aus der Ferne spürbar", title1: "Schick dein Gefühl", title2: "an deine Liebsten", titleEm: "in der Türkei.",
    body: "Wo auch immer du bist — unser lokales Atelier bereitet es vor und bringt es an ihre Tür. Du sagst uns nur, wen du liebst und wo er ist.",
    cta: "Blumen ansehen", cta2: "Wie funktioniert es?",
    occasion: "Anlass", occasionAny: "Anlass wählen", date: "Lieferdatum", datePick: "Datum wählen", where: "Wohin", whereEmpty: "Lieferadresse wählen", whereChange: "Adresse ändern",
    sameDay: "Taggleiche Lieferung in geeigneten Istanbuler Bezirken", cargo: "Türkeiweiter Versand · 1–3 Werktage", founded: "Seit 1986 — mit lokalen Ateliers in der ganzen Türkei",
    statusOpen: "Die taggleiche Lieferung ist für diese Adresse heute noch möglich", statusClosed: "Die taggleichen Bestellungen sind für heute geschlossen — Lieferung am nächsten Tag ist möglich",
  },
  ticker: { hand: "Handgebunden · aus dem lokalen Atelier", since: "Seit 1986 · in die Türkei", fresh: "Frisch geschnitten · tagesfrisch", world: "Weltweit bestellt · an die Tür geliefert", types: "Rosen · Pfingstrosen · Tulpen · Saisonal", care: "Jeder Strauß mit Sorgfalt gebunden" },
  trustMini: { ssl: "SSL-verschlüsselte Zahlung", whatsapp: "WhatsApp-Support", since: "Seit 1986" },
  discovery: {
    eyebrow: "Finden wir es gemeinsam",
    groups: { who: "Für wen ist es?", occasion: "Zu welchem Anlass?", what: "Was möchtest du schicken?", where: "Wohin in der Türkei?" },
    chips: { mother: "Meine Mutter", partner: "Mein Schatz", friend: "Mein Freund", colleague: "Kollege", sibling: "Geschwister", family: "Familie", birthday: "Geburtstag", anniversary: "Jahrestag", condolence: "Beileid", thanks: "Danke", sorry: "Entschuldigung", surprise: "Überraschung" },
    show: "Auswahl anzeigen →", match: "{n} Vorschläge passen zu deiner Wahl", clear: "Filter zurücksetzen",
  },
  shop: {
    eyebrow: "Auswahl", eyebrowFor: "Für dich ausgewählt", title: "Am häufigsten verschickt", titleFor: "Auswahl für {x}", all: "Alle Produkte →", tabAll: "Alle", unit: "Produkte", more: "Mehr anzeigen ({n} Produkte)",
    promoTitle: "Jeder Strauß wird nach deiner Bestellung von Hand gebunden.", promoBody: "Frisch geschnitten, am selben Tag vorbereitet. Vom Atelier bis an die Tür, ohne Wartezeit.", promoCta: "So funktioniert es →", cardCta: "Das schicken",
    sameDay: "Taggleich · Istanbul", cargo: "Türkeiweit · 1–3 Tage", bestseller: "Bestseller", new: "Neu", sale: "Angebot", empty: "Zu dieser Auswahl passen noch keine Produkte.",
  },
  categories: { eyebrow: "Kategorien", title: "Nach Art entdecken", pick: "Kollektion wählen →", kinds: "{n} Sorten", from: "ab {price}" },
  delivery: {
    eyebrow: "Lieferoptionen", title: "Heute vorbereitet,", titleEm: "mit Sorgfalt geliefert.", selected: "Gewählter Ort", noSelection: "Noch keine Adresse gewählt",
    items: {
      istanbul: { label: "Istanbul · Kurier am selben Tag", title: "Taggleiche Lieferung", sub: "In geeigneten Istanbuler Bezirken. Heute bestellen, unser Kurier liefert heute — die genauen Zeitfenster siehst du auf der Produktseite." },
      cargo: { label: "Ganze Türkei", title: "Versand · 1–3 Werktage", sub: "Auch ferne Städte sind möglich. Sorgfältig vorbereitet, frisch verpackt, mit Sendungsverfolgung." },
      cities: { label: "Antalya · Muğla · İzmir", title: "Küstenstädte", sub: "Frisch verpackte Blumen ans Mittelmeer und an die Ägäis, per Versand an die Adresse deiner Wahl." },
    },
  },
  collections: { eyebrow: "Kollektionen", title: "Finden wir, was du suchst", sub: "Unsere lokalen Ateliers binden jeden Strauß von Hand. Am Liefertag verlässt er das Atelier und erreicht die Tür deiner Liebsten.", view: "Ansehen →" },
  mood: {
    eyebrow: "Gefühl & Anlass", title: "Was möchtest du sagen?",
    items: {
      love: { word: "Liebe", line: "Ich liebe dich sehr.", sub: "Immer, jeden Tag.", cta: "Rosen für die Liebe" },
      birthday: { word: "Geburtstag", line: "Alles Gute zum Geburtstag.", sub: "Auch aus der Ferne gefeiert.", cta: "Geburtstagsstrauß" },
      sorry: { word: "Entschuldigung", line: "Es tut mir wirklich leid.", sub: "Manchmal sagen es Blumen besser.", cta: "Weißes Arrangement" },
      thanks: { word: "Danke", line: "Ohne dich wäre es nicht gegangen.", sub: "Für jemanden, der den Unterschied macht.", cta: "Dankesstrauß" },
      condolence: { word: "Beileid", line: "Ich bin bei dir.", sub: "Wenn Worte nicht reichen.", cta: "Schlichtes weißes Arrangement" },
    },
  },
  card: {
    eyebrow: "Handgeschriebene Karte — kostenlos", title: "Was sollen wir auf die Karte schreiben?", sub: "Deine Nachricht schreibst du beim Bezahlen; wir schreiben sie von Hand auf eine Karte und legen sie in den Strauß.", note: "Nachricht wird beim Bezahlen hinzugefügt · bis zu 200 Zeichen", preview: "Deine Nachricht erscheint hier…", brand: "ÇiçekYolla", cta: "Blumen mit diesem Gefühl wählen →",
    occasions: { love: "Liebe", birthday: "Geburtstag", sorry: "Entschuldigung", thanks: "Danke", condolence: "Beileid", getwell: "Gute Besserung" },
    lines: {
      love: ["Ich denke an dich.", "Schön, dass es dich gibt.", "Ich bin weit weg, aber mein Herz ist dort.", "Heute gehört dir."],
      birthday: ["Alles Gute zum Geburtstag.", "Heute ist dein Tag.", "Auf viele glückliche Jahre.", "Ich liebe dich sehr."],
      sorry: ["Es tut mir wirklich leid.", "Ich lag falsch, verzeih mir.", "Ich möchte bei dir sein.", "Verzeihst du mir?"],
      thanks: ["Ohne dich wäre es nicht gegangen.", "Es bedeutet mir so viel.", "Danke für alles.", "Von ganzem Herzen."],
      condolence: ["Ich bin bei dir.", "Ich teile deine Trauer.", "Ich bin immer da.", "Mein aufrichtiges Beileid."],
      getwell: ["Gute Besserung.", "Du bist bald wieder auf den Beinen.", "Ich bin bei dir.", "Das geht vorbei, dir wird es gut gehen."],
    },
  },
  destinations: { eyebrow: "Lieferorte", title: "Wohin sollen wir liefern?", sameDay: "Am selben Tag", cargo: "Versand", districts: "{n} Bezirke", subs: { istanbul: "Europa & Anatolien", antalya: "Mittelmeerküste", mugla: "Bodrum, Marmaris, Fethiye", izmir: "Perle der Ägäis" } },
  journey: {
    title1: "Bestelle von überall auf der Welt.", title2: "Geliefert in der Türkei.", body: "Wo auch immer du bist — gib die Bestellung auf, unser Atelier bereitet sie vor.",
    bullets: ["SSL-verschlüsselte Zahlung · sicherer Checkout", "WhatsApp-Support · Sendungsverfolgung", "Seit 1986 in der ganzen Türkei"], cta: "Jetzt bestellen",
    steps: [
      { t: "Es beginnt in der Welt", d: "Wo auch immer du bist. Deine Bestellung beginnt." },
      { t: "In der Türkei vorbereitet", d: "Unser nächstes lokales Atelier bereitet sie sorgfältig vor. Frisch geschnitten, am selben Tag." },
      { t: "Erreicht ihre Tür", d: "Frisch verpackt, von Hand gebunden. An die Adresse deiner Wahl, im Tempo deiner Wahl." },
      { t: "Du weißt Bescheid", d: "Vorbereitet · Unterwegs · Zugestellt. Wir halten dich auf dem Laufenden." },
    ],
    quote: "Seit 1986 arbeiten wir mit lokalen Floristen in der ganzen Türkei. Deine Bestellung wird in lokalen Händen vorbereitet und an die Tür deiner Liebsten geliefert.",
    help: "Hilfe & Support", wa: "Auf WhatsApp schreiben", waNote: "TR/EN · Türkische Zeit", facts: { founded: "Gegründet", local: "Atelier-System" },
  },
  reviews: { eyebrow: "Kundenstimmen", title: "Sie erzählen.", source: "Echte Google-Bewertungen" },
  cta: { eyebrow: "Bereit?", title1: "Schick heute etwas.", titleEm: "Entfernung ist kein Hindernis für Liebe.", body: "Wo auch immer du bist, gib deine Bestellung auf. Blumen aus unserem Istanbuler Atelier werden in geeigneten Bezirken am selben Tag geliefert, in die ganze Türkei per Versand.", button: "Jetzt schicken →", bullets: ["Istanbul · Taggleiche Lieferung", "Ganze Türkei · Frische Blumen per Versand"] },
  trust: {
    pay: { title: "Sichere Zahlung", desc: "3D Secure, SSL-verschlüsselt" },
    sameday: { title: "Taggleiche Lieferung", desc: "Geeignete Istanbuler Bezirke" },
    whatsapp: { title: "WhatsApp-Support", desc: "Bestellung live verfolgen" },
    fresh: { title: "Frischegarantie", desc: "Nach deiner Bestellung handgebunden" },
  },
  content: { faq: "Häufige Fragen", more: "Mehr lesen" },
};

export const fr: V80Copy = {
  header: {
    search: "Rechercher des fleurs ou des catégories", searchHint: "Saisissez au moins deux lettres", whatsapp: "WhatsApp", cart: "Ouvrir le panier", menu: "Ouvrir le menu", closeMenu: "Fermer le menu",
    currency: "Devise", noResults: "Nous n'avons pas trouvé cette fleur", popular: "Recherches populaires", seeAll: "Voir tous les résultats →", products: "Produits", categories: "Catégories", skip: "Aller au contenu",
  },
  hero: {
    eyebrow: "Fleurs & cadeaux vers la Turquie · Ressenti même de loin", title1: "Envoyez votre émotion", title2: "à ceux que vous aimez", titleEm: "en Turquie.",
    body: "Où que vous soyez dans le monde — notre atelier local prépare et dépose à leur porte. Dites-nous seulement qui vous aimez et où ils se trouvent.",
    cta: "Voir les fleurs", cta2: "Comment ça marche ?",
    occasion: "Occasion", occasionAny: "Choisir une occasion", date: "Date de livraison", datePick: "Choisir une date", where: "Où", whereEmpty: "Choisir une adresse de livraison", whereChange: "Changer d'adresse",
    sameDay: "Livraison le jour même dans les arrondissements éligibles d'Istanbul", cargo: "Expédition dans toute la Turquie · 1 à 3 jours ouvrés", founded: "Depuis 1986 — avec des ateliers locaux dans toute la Turquie",
    statusOpen: "La livraison le jour même est encore possible aujourd'hui pour cette adresse", statusClosed: "Les commandes du jour même sont closes — la livraison le lendemain est ouverte",
  },
  ticker: { hand: "Composé à la main · atelier local", since: "Depuis 1986 · vers la Turquie", fresh: "Fraîchement coupé · du jour", world: "Commandé du monde entier · livré à la porte", types: "Roses · Pivoines · Tulipes · De saison", care: "Chaque bouquet préparé avec soin" },
  trustMini: { ssl: "Paiement chiffré SSL", whatsapp: "Support WhatsApp", since: "Depuis 1986" },
  discovery: {
    eyebrow: "Trouvons ensemble",
    groups: { who: "Pour qui ?", occasion: "Quelle occasion ?", what: "Que voulez-vous envoyer ?", where: "Où en Turquie ?" },
    chips: { mother: "Ma mère", partner: "Mon amour", friend: "Mon ami(e)", colleague: "Un collègue", sibling: "Frère / sœur", family: "Famille", birthday: "Anniversaire", anniversary: "Anniversaire de mariage", condolence: "Condoléances", thanks: "Merci", sorry: "Pardon", surprise: "Surprise" },
    show: "Voir la sélection →", match: "{n} propositions correspondent à votre choix", clear: "Effacer les filtres",
  },
  shop: {
    eyebrow: "Sélections", eyebrowFor: "Choisi pour vous", title: "Les plus envoyés", titleFor: "Sélection pour {x}", all: "Tous les produits →", tabAll: "Tout", unit: "produits", more: "Voir plus ({n} produits)",
    promoTitle: "Chaque bouquet est composé à la main après votre commande.", promoBody: "Fraîchement coupé, préparé le jour même. De l'atelier à leur porte, sans attendre.", promoCta: "Voir comment ça marche →", cardCta: "Envoyer celui-ci",
    sameDay: "Jour même · Istanbul", cargo: "Toute la Turquie · 1–3 jours", bestseller: "Best-seller", new: "Nouveau", sale: "Promo", empty: "Aucun produit ne correspond encore à cette sélection.",
  },
  categories: { eyebrow: "Catégories", title: "Explorer par type", pick: "Choisir une collection →", kinds: "{n} variétés", from: "dès {price}" },
  delivery: {
    eyebrow: "Options de livraison", title: "Préparé aujourd'hui,", titleEm: "livré avec soin.", selected: "Lieu sélectionné", noSelection: "Aucune adresse sélectionnée",
    items: {
      istanbul: { label: "Istanbul · Coursier le jour même", title: "Livraison le jour même", sub: "Dans les arrondissements éligibles d'Istanbul. Commandez aujourd'hui, notre coursier livre aujourd'hui — les créneaux exacts s'affichent sur la page produit." },
      cargo: { label: "Toute la Turquie", title: "Expédition · 1 à 3 jours ouvrés", sub: "Les villes lointaines aussi. Préparé avec soin, emballé frais, expédition suivie." },
      cities: { label: "Antalya · Muğla · İzmir", title: "Villes côtières", sub: "Des fleurs emballées fraîches vers la Méditerranée et l'Égée, expédiées à l'adresse de votre choix." },
    },
  },
  collections: { eyebrow: "Collections", title: "Trouvons ce que vous cherchez", sub: "Nos ateliers locaux composent chaque bouquet à la main. Il quitte l'atelier le jour de la livraison et arrive à la porte de ceux que vous aimez.", view: "Voir →" },
  mood: {
    eyebrow: "Émotion & occasion", title: "Que voulez-vous dire ?",
    items: {
      love: { word: "Amour", line: "Je t'aime tellement.", sub: "Toujours, chaque jour.", cta: "Roses pour l'amour" },
      birthday: { word: "Anniversaire", line: "Joyeux anniversaire.", sub: "Fêté même de loin.", cta: "Bouquet d'anniversaire" },
      sorry: { word: "Pardon", line: "Je suis désolé, vraiment.", sub: "Parfois les fleurs le disent mieux.", cta: "Composition blanche" },
      thanks: { word: "Merci", line: "Sans toi, ça n'aurait pas été possible.", sub: "Pour quelqu'un qui fait la différence.", cta: "Bouquet de remerciement" },
      condolence: { word: "Condoléances", line: "Je suis là pour toi.", sub: "Quand les mots ne suffisent pas.", cta: "Composition blanche sobre" },
    },
  },
  card: {
    eyebrow: "Carte manuscrite — offerte", title: "Que voulez-vous écrire sur la carte ?", sub: "Vous écrivez votre message au moment du paiement ; nous le recopions à la main sur une carte glissée dans le bouquet.", note: "Message ajouté au paiement · jusqu'à 200 caractères", preview: "Votre message apparaîtra ici…", brand: "ÇiçekYolla", cta: "Choisir des fleurs pour ce message →",
    occasions: { love: "Amour", birthday: "Anniversaire", sorry: "Pardon", thanks: "Merci", condolence: "Condoléances", getwell: "Bon rétablissement" },
    lines: {
      love: ["Je pense à toi.", "Heureux que tu existes.", "Je suis loin, mais mon cœur est là-bas.", "Aujourd'hui est à toi."],
      birthday: ["Joyeux anniversaire.", "C'est ton jour.", "Encore de belles années.", "Je t'aime tellement."],
      sorry: ["Je suis désolé, vraiment.", "J'avais tort, pardonne-moi.", "Je veux être à tes côtés.", "Me pardonnes-tu ?"],
      thanks: ["Sans toi, rien n'aurait été possible.", "Cela compte énormément.", "Merci pour tout.", "De tout cœur."],
      condolence: ["Je suis là pour toi.", "Je partage ta peine.", "Je suis toujours là.", "Mes sincères condoléances."],
      getwell: ["Bon rétablissement.", "Tu seras vite sur pied.", "Je suis avec toi.", "Ça passera, tu iras bien."],
    },
  },
  destinations: { eyebrow: "Destinations de livraison", title: "Où voulez-vous envoyer ?", sameDay: "Jour même", cargo: "Expédition", districts: "{n} arrondissements", subs: { istanbul: "Europe & Anatolie", antalya: "Côte méditerranéenne", mugla: "Bodrum, Marmaris, Fethiye", izmir: "Perle de l'Égée" } },
  journey: {
    title1: "Commandez de n'importe où dans le monde.", title2: "Livré en Turquie.", body: "Où que vous soyez — passez la commande, notre atelier la prépare.",
    bullets: ["Paiement chiffré SSL · commande sécurisée", "Support WhatsApp · suivi de commande", "Depuis 1986, dans toute la Turquie"], cta: "Commander",
    steps: [
      { t: "Ça commence dans le monde", d: "Où que vous soyez. Votre commande commence." },
      { t: "Préparé en Turquie", d: "Notre atelier local le plus proche prépare avec soin. Fraîchement coupé, le jour même." },
      { t: "Arrive à leur porte", d: "Emballé frais, composé à la main. À l'adresse de votre choix, au rythme de votre choix." },
      { t: "Vous le savez aussi", d: "Préparé · En route · Livré. Nous vous tenons informé." },
    ],
    quote: "Depuis 1986, nous travaillons avec des fleuristes locaux dans toute la Turquie. Votre commande est préparée par des mains locales et livrée à la porte de ceux que vous aimez.",
    help: "Aide & support", wa: "Écrire sur WhatsApp", waNote: "TR/EN · Heure de Turquie", facts: { founded: "Fondé en", local: "Réseau d'ateliers" },
  },
  reviews: { eyebrow: "Avis clients", title: "Ils racontent.", source: "Vrais avis Google" },
  cta: { eyebrow: "Prêt ?", title1: "Envoyez quelque chose aujourd'hui.", titleEm: "La distance n'est pas un obstacle à l'amour.", body: "Où que vous soyez, passez votre commande. Les fleurs préparées dans notre atelier d'Istanbul sont livrées le jour même dans les arrondissements éligibles, et par expédition dans toute la Turquie.", button: "Envoyer maintenant →", bullets: ["Istanbul · Livraison le jour même", "Toute la Turquie · Fleurs fraîches par expédition"] },
  trust: {
    pay: { title: "Paiement sécurisé", desc: "3D Secure, chiffré SSL" },
    sameday: { title: "Livraison le jour même", desc: "Arrondissements éligibles d'Istanbul" },
    whatsapp: { title: "Support WhatsApp", desc: "Suivez votre commande en direct" },
    fresh: { title: "Garantie fraîcheur", desc: "Composé à la main après votre commande" },
  },
  content: { faq: "Questions fréquentes", more: "Lire la suite" },
};

export const nl: V80Copy = {
  header: {
    search: "Zoek bloemen of categorieën", searchHint: "Typ minstens twee letters", whatsapp: "WhatsApp", cart: "Winkelwagen openen", menu: "Menu openen", closeMenu: "Menu sluiten",
    currency: "Valuta", noResults: "Die bloem hebben we niet gevonden", popular: "Populaire zoekopdrachten", seeAll: "Alle resultaten →", products: "Producten", categories: "Categorieën", skip: "Naar de inhoud",
  },
  hero: {
    eyebrow: "Bloemen & cadeaus naar Turkije · Voelbaar van ver", title1: "Stuur je gevoel", title2: "naar je dierbaren", titleEm: "in Turkije.",
    body: "Waar je ook bent — ons lokale atelier maakt het en zet het bij hen voor de deur. Jij zegt alleen van wie je houdt en waar ze zijn.",
    cta: "Bekijk de bloemen", cta2: "Hoe werkt het?",
    occasion: "Gelegenheid", occasionAny: "Kies een gelegenheid", date: "Bezorgdatum", datePick: "Kies een datum", where: "Waarheen", whereEmpty: "Kies een bezorgadres", whereChange: "Adres wijzigen",
    sameDay: "Bezorging dezelfde dag in geschikte districten van Istanbul", cargo: "Verzending door heel Turkije · 1–3 werkdagen", founded: "Sinds 1986 — met lokale ateliers in heel Turkije",
    statusOpen: "Bezorging dezelfde dag is vandaag nog mogelijk voor dit adres", statusClosed: "De bestellingen voor vandaag zijn gesloten — bezorging morgen is mogelijk",
  },
  ticker: { hand: "Handgebonden · uit een lokaal atelier", since: "Sinds 1986 · naar Turkije", fresh: "Vers gesneden · dagvers", world: "Wereldwijd besteld · aan de deur bezorgd", types: "Rozen · Pioenrozen · Tulpen · Seizoensbloemen", care: "Elk boeket met zorg gemaakt" },
  trustMini: { ssl: "SSL-versleutelde betaling", whatsapp: "WhatsApp-support", since: "Sinds 1986" },
  discovery: {
    eyebrow: "Laten we het samen vinden",
    groups: { who: "Voor wie is het?", occasion: "Welke gelegenheid?", what: "Wat wil je sturen?", where: "Waar in Turkije?" },
    chips: { mother: "Mijn moeder", partner: "Mijn lief", friend: "Mijn vriend(in)", colleague: "Collega", sibling: "Broer / zus", family: "Familie", birthday: "Verjaardag", anniversary: "Jubileum", condolence: "Condoleance", thanks: "Bedankt", sorry: "Sorry", surprise: "Verrassing" },
    show: "Toon de selectie →", match: "{n} keuzes passen bij jouw wens", clear: "Filters wissen",
  },
  shop: {
    eyebrow: "Selecties", eyebrowFor: "Voor jou gekozen", title: "Meest verstuurd", titleFor: "Selectie voor {x}", all: "Alle producten →", tabAll: "Alles", unit: "producten", more: "Meer tonen ({n} producten)",
    promoTitle: "Elk boeket wordt na je bestelling met de hand gemaakt.", promoBody: "Vers gesneden, op de dag zelf gemaakt. Van het atelier tot aan de deur, zonder wachten.", promoCta: "Zo werkt het →", cardCta: "Dit versturen",
    sameDay: "Dezelfde dag · Istanbul", cargo: "Heel Turkije · 1–3 dagen", bestseller: "Bestseller", new: "Nieuw", sale: "Aanbieding", empty: "Nog geen producten voor deze selectie.",
  },
  categories: { eyebrow: "Categorieën", title: "Ontdek per soort", pick: "Kies een collectie →", kinds: "{n} soorten", from: "vanaf {price}" },
  delivery: {
    eyebrow: "Bezorgopties", title: "Vandaag gemaakt,", titleEm: "met zorg bezorgd.", selected: "Gekozen locatie", noSelection: "Nog geen adres gekozen",
    items: {
      istanbul: { label: "Istanbul · Koerier dezelfde dag", title: "Bezorging dezelfde dag", sub: "In geschikte districten van Istanbul. Vandaag bestellen, onze koerier bezorgt vandaag — de exacte tijdvakken zie je op de productpagina." },
      cargo: { label: "Heel Turkije", title: "Verzending · 1–3 werkdagen", sub: "Ook verre steden zijn mogelijk. Met zorg gemaakt, vers verpakt, verzending met tracking." },
      cities: { label: "Antalya · Muğla · İzmir", title: "Kuststeden", sub: "Vers verpakte bloemen naar de Middellandse Zee en de Egeïsche kust, verzonden naar het adres dat jij kiest." },
    },
  },
  collections: { eyebrow: "Collecties", title: "Laten we vinden wat je zoekt", sub: "Onze lokale ateliers maken elk boeket met de hand. Op de bezorgdag verlaat het het atelier en bereikt het de deur van je dierbaren.", view: "Bekijken →" },
  mood: {
    eyebrow: "Gevoel & gelegenheid", title: "Wat wil je zeggen?",
    items: {
      love: { word: "Liefde", line: "Ik hou zoveel van je.", sub: "Altijd, elke dag.", cta: "Rozen voor de liefde" },
      birthday: { word: "Verjaardag", line: "Gefeliciteerd met je verjaardag.", sub: "Ook van ver gevierd.", cta: "Verjaardagsboeket" },
      sorry: { word: "Sorry", line: "Het spijt me, echt.", sub: "Soms zeggen bloemen het beter.", cta: "Wit arrangement" },
      thanks: { word: "Bedankt", line: "Zonder jou was het niet gelukt.", sub: "Voor iemand die het verschil maakt.", cta: "Bedankboeket" },
      condolence: { word: "Condoleance", line: "Ik ben bij je.", sub: "Als woorden tekortschieten.", cta: "Sober wit arrangement" },
    },
  },
  card: {
    eyebrow: "Handgeschreven kaart — gratis", title: "Wat schrijven we op je kaart?", sub: "Je schrijft je bericht bij het afrekenen; wij schrijven het met de hand op een kaart en steken die in het boeket.", note: "Bericht wordt bij het afrekenen toegevoegd · maximaal 200 tekens", preview: "Je bericht verschijnt hier…", brand: "ÇiçekYolla", cta: "Kies bloemen bij dit gevoel →",
    occasions: { love: "Liefde", birthday: "Verjaardag", sorry: "Sorry", thanks: "Bedankt", condolence: "Condoleance", getwell: "Beterschap" },
    lines: {
      love: ["Ik denk aan je.", "Fijn dat je er bent.", "Ik ben ver weg, maar mijn hart is daar.", "Vandaag is van jou."],
      birthday: ["Gefeliciteerd met je verjaardag.", "Vandaag is jouw dag.", "Nog vele gelukkige jaren.", "Ik hou zoveel van je."],
      sorry: ["Het spijt me, echt.", "Ik had ongelijk, vergeef me.", "Ik wil bij je zijn.", "Vergeef je me?"],
      thanks: ["Zonder jou was het niet gelukt.", "Het betekent zoveel.", "Bedankt voor alles.", "Uit de grond van mijn hart."],
      condolence: ["Ik ben bij je.", "Ik deel je verdriet.", "Ik ben er altijd.", "Gecondoleerd."],
      getwell: ["Beterschap.", "Je bent zo weer op de been.", "Ik ben bij je.", "Het gaat voorbij, het komt goed."],
    },
  },
  destinations: { eyebrow: "Bezorglocaties", title: "Waar sturen we het naartoe?", sameDay: "Dezelfde dag", cargo: "Verzending", districts: "{n} districten", subs: { istanbul: "Europa & Anatolië", antalya: "Middellandse Zeekust", mugla: "Bodrum, Marmaris, Fethiye", izmir: "Parel van de Egeïsche Zee" } },
  journey: {
    title1: "Bestel vanuit elke plek ter wereld.", title2: "Bezorgd in Turkije.", body: "Waar je ook bent — plaats de bestelling, ons atelier maakt het.",
    bullets: ["SSL-versleutelde betaling · veilig afrekenen", "WhatsApp-support · bestelling volgen", "Sinds 1986, in heel Turkije"], cta: "Bestellen",
    steps: [
      { t: "Het begint in de wereld", d: "Waar je ook bent. Je bestelling begint." },
      { t: "Gemaakt in Turkije", d: "Ons dichtstbijzijnde lokale atelier maakt het met zorg. Vers gesneden, op de dag zelf." },
      { t: "Bereikt hun deur", d: "Vers verpakt, met de hand gemaakt. Op het adres dat jij kiest, in het tempo dat jij kiest." },
      { t: "Jij weet het ook", d: "Gemaakt · Onderweg · Bezorgd. We houden je op de hoogte." },
    ],
    quote: "Sinds 1986 werken we met lokale bloemisten in heel Turkije. Je bestelling wordt door lokale handen gemaakt en bij je dierbaren aan de deur bezorgd.",
    help: "Hulp & support", wa: "Schrijf via WhatsApp", waNote: "TR/EN · Turkse tijd", facts: { founded: "Opgericht", local: "Ateliersysteem" },
  },
  reviews: { eyebrow: "Klantbeoordelingen", title: "Zij vertellen het.", source: "Echte Google-reviews" },
  cta: { eyebrow: "Klaar?", title1: "Stuur vandaag iets.", titleEm: "Afstand staat liefde niet in de weg.", body: "Waar je ook bent, plaats je bestelling. Bloemen uit ons atelier in Istanbul worden in geschikte districten dezelfde dag bezorgd en door heel Turkije verzonden.", button: "Nu versturen →", bullets: ["Istanbul · Bezorging dezelfde dag", "Heel Turkije · Verse bloemen per verzending"] },
  trust: {
    pay: { title: "Veilig betalen", desc: "3D Secure, SSL-versleuteld" },
    sameday: { title: "Bezorging dezelfde dag", desc: "Geschikte districten van Istanbul" },
    whatsapp: { title: "WhatsApp-support", desc: "Volg je bestelling live" },
    fresh: { title: "Versheidsgarantie", desc: "Handgebonden na je bestelling" },
  },
  content: { faq: "Veelgestelde vragen", more: "Lees meer" },
};
