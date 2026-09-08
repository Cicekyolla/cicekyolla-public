// GLOBAL VERSION 80 — varsayılan sunum metinleri: IT · ES · PT · AZ.
import type { V80Copy } from "./copyTypes";

export const it: V80Copy = {
  header: {
    search: "Cerca fiori o categorie", searchHint: "Digita almeno due lettere", whatsapp: "WhatsApp", cart: "Apri il carrello", menu: "Apri il menu", closeMenu: "Chiudi il menu",
    currency: "Valuta", noResults: "Non abbiamo trovato quel fiore", popular: "Ricerche popolari", seeAll: "Vedi tutti i risultati →", products: "Prodotti", categories: "Categorie", skip: "Vai al contenuto",
  },
  hero: {
    eyebrow: "Fiori e regali in Turchia · Si sente anche da lontano", title1: "Manda il tuo sentimento", title2: "a chi ami", titleEm: "in Turchia.",
    body: "Ovunque tu sia nel mondo — il nostro atelier locale lo prepara e lo lascia alla loro porta. Tu dici solo chi ami e dove si trova.",
    cta: "Vedi i fiori", cta2: "Come funziona?",
    occasion: "Occasione", occasionAny: "Scegli un'occasione", date: "Data di consegna", datePick: "Scegli una data", where: "Dove", whereEmpty: "Scegli un indirizzo di consegna", whereChange: "Cambia indirizzo",
    sameDay: "Consegna in giornata nei quartieri idonei di Istanbul", cargo: "Spedizione in tutta la Turchia · 1–3 giorni lavorativi", founded: "Dal 1986 — con atelier locali in tutta la Turchia",
    statusOpen: "La consegna in giornata è ancora disponibile oggi per questo indirizzo", statusClosed: "Gli ordini in giornata di oggi sono chiusi — la consegna per domani è aperta",
  },
  ticker: { hand: "Legato a mano · da un atelier locale", since: "Dal 1986 · verso la Turchia", fresh: "Appena tagliato · fresco di giornata", world: "Ordinato dal mondo · consegnato alla porta", types: "Rose · Peonie · Tulipani · Di stagione", care: "Ogni bouquet preparato con cura" },
  trustMini: { ssl: "Pagamento crittografato SSL", whatsapp: "Assistenza WhatsApp", since: "Dal 1986" },
  discovery: {
    eyebrow: "Troviamolo insieme",
    groups: { who: "Per chi è?", occasion: "Per quale occasione?", what: "Cosa vuoi mandare?", where: "Dove in Turchia?" },
    chips: { mother: "Mia madre", partner: "Il mio amore", friend: "Un amico", colleague: "Un collega", sibling: "Fratello / sorella", family: "Famiglia", birthday: "Compleanno", anniversary: "Anniversario", condolence: "Condoglianze", thanks: "Grazie", sorry: "Scusa", surprise: "Sorpresa" },
    show: "Mostra la selezione →", match: "{n} proposte corrispondono alla tua scelta", clear: "Azzera i filtri",
  },
  shop: {
    eyebrow: "Selezioni", eyebrowFor: "Scelti per te", title: "I più inviati", titleFor: "Selezione per {x}", all: "Tutti i prodotti →", tabAll: "Tutti", unit: "prodotti", more: "Mostra altri ({n} prodotti)",
    promoTitle: "Ogni bouquet è preparato a mano dopo il tuo ordine.", promoBody: "Appena tagliato, preparato in giornata. Dall'atelier alla loro porta, senza attese.", promoCta: "Scopri come funziona →", cardCta: "Manda questo",
    sameDay: "In giornata · Istanbul", cargo: "Tutta la Turchia · 1–3 giorni", bestseller: "Bestseller", new: "Novità", sale: "Offerta", empty: "Nessun prodotto corrisponde ancora a questa selezione.",
  },
  categories: { eyebrow: "Categorie", title: "Esplora per tipo", pick: "Scegli una collezione →", kinds: "{n} varietà", from: "da {price}" },
  delivery: {
    eyebrow: "Opzioni di consegna", title: "Preparato oggi,", titleEm: "consegnato con cura.", selected: "Località selezionata", noSelection: "Nessun indirizzo selezionato",
    items: {
      istanbul: { label: "Istanbul · Corriere in giornata", title: "Consegna in giornata", sub: "Nei quartieri idonei di Istanbul. Ordina oggi, il nostro corriere consegna oggi — le fasce orarie esatte sono nella pagina prodotto." },
      cargo: { label: "Tutta la Turchia", title: "Spedizione · 1–3 giorni lavorativi", sub: "Anche le città lontane. Preparato con cura, confezionato fresco, spedizione tracciata." },
      cities: { label: "Antalya · Muğla · İzmir", title: "Città costiere", sub: "Fiori confezionati freschi verso il Mediterraneo e l'Egeo, spediti all'indirizzo che scegli." },
    },
  },
  collections: { eyebrow: "Collezioni", title: "Troviamo quello che cerchi", sub: "I nostri atelier locali preparano ogni bouquet a mano. Il giorno della consegna lascia l'atelier e raggiunge la porta di chi ami.", view: "Vedi →" },
  mood: {
    eyebrow: "Sentimento e occasione", title: "Cosa vuoi dire?",
    items: {
      love: { word: "Amore", line: "Ti amo tanto.", sub: "Sempre, ogni giorno.", cta: "Rose per l'amore" },
      birthday: { word: "Compleanno", line: "Buon compleanno.", sub: "Si festeggia anche da lontano.", cta: "Bouquet di compleanno" },
      sorry: { word: "Scusa", line: "Mi dispiace, davvero.", sub: "A volte i fiori lo dicono meglio.", cta: "Composizione bianca" },
      thanks: { word: "Grazie", line: "Senza di te non sarebbe stato possibile.", sub: "Per chi fa la differenza.", cta: "Bouquet di ringraziamento" },
      condolence: { word: "Condoglianze", line: "Ti sono vicino.", sub: "Quando le parole non bastano.", cta: "Composizione bianca essenziale" },
    },
  },
  card: {
    eyebrow: "Biglietto scritto a mano — gratuito", title: "Cosa scriviamo sul tuo biglietto?", sub: "Scrivi il tuo messaggio al momento del pagamento; noi lo ricopiamo a mano su un biglietto inserito nel bouquet.", note: "Messaggio aggiunto al pagamento · fino a 200 caratteri", preview: "Il tuo messaggio apparirà qui…", brand: "ÇiçekYolla", cta: "Scegli i fiori con questo messaggio →",
    occasions: { love: "Amore", birthday: "Compleanno", sorry: "Scusa", thanks: "Grazie", condolence: "Condoglianze", getwell: "Guarisci presto" },
    lines: {
      love: ["Ti penso.", "Che bello che esisti.", "Sono lontano, ma il mio cuore è lì.", "Oggi è tuo."],
      birthday: ["Buon compleanno.", "Oggi è il tuo giorno.", "Tanti anni felici.", "Ti amo tanto."],
      sorry: ["Mi dispiace, davvero.", "Avevo torto, perdonami.", "Voglio starti accanto.", "Mi perdoni?"],
      thanks: ["Senza di te non sarebbe stato possibile.", "Significa tantissimo.", "Grazie di tutto.", "Con tutto il cuore."],
      condolence: ["Ti sono vicino.", "Condivido il tuo dolore.", "Ci sono sempre.", "Sentite condoglianze."],
      getwell: ["Guarisci presto.", "Sarai in piedi in un attimo.", "Sono con te.", "Passerà, starai bene."],
    },
  },
  destinations: { eyebrow: "Destinazioni di consegna", title: "Dove lo mandiamo?", sameDay: "In giornata", cargo: "Spedizione", districts: "{n} quartieri", subs: { istanbul: "Europa e Anatolia", antalya: "Costa mediterranea", mugla: "Bodrum, Marmaris, Fethiye", izmir: "Perla dell'Egeo" } },
  journey: {
    title1: "Ordina da qualsiasi parte del mondo.", title2: "Consegnato in Turchia.", body: "Ovunque tu sia — fai l'ordine, il nostro atelier lo prepara.",
    bullets: ["Pagamento crittografato SSL · checkout sicuro", "Assistenza WhatsApp · tracciamento ordine", "Dal 1986, in tutta la Turchia"], cta: "Ordina ora",
    steps: [
      { t: "Inizia nel mondo", d: "Ovunque tu sia. Il tuo ordine inizia." },
      { t: "Preparato in Turchia", d: "Il nostro atelier locale più vicino lo prepara con cura. Appena tagliato, in giornata." },
      { t: "Arriva alla loro porta", d: "Confezionato fresco, fatto a mano. All'indirizzo che scegli, alla velocità che scegli." },
      { t: "Lo sai anche tu", d: "Preparato · In viaggio · Consegnato. Ti teniamo aggiornato." },
    ],
    quote: "Dal 1986 lavoriamo con fioristi locali in tutta la Turchia. Il tuo ordine è preparato da mani locali e consegnato alla porta di chi ami.",
    help: "Aiuto e assistenza", wa: "Scrivi su WhatsApp", waNote: "TR/EN · Ora della Turchia", facts: { founded: "Fondata nel", local: "Rete di atelier" },
  },
  reviews: { eyebrow: "Recensioni dei clienti", title: "Lo raccontano loro.", source: "Recensioni Google reali" },
  cta: { eyebrow: "Pronto?", title1: "Manda qualcosa oggi.", titleEm: "La distanza non è un ostacolo per l'amore.", body: "Ovunque tu sia, fai il tuo ordine. I fiori preparati nel nostro atelier di Istanbul vengono consegnati in giornata nei quartieri idonei e spediti in tutta la Turchia.", button: "Manda ora →", bullets: ["Istanbul · Consegna in giornata", "Tutta la Turchia · Fiori freschi con spedizione"] },
  trust: {
    pay: { title: "Pagamento sicuro", desc: "3D Secure, crittografato SSL" },
    sameday: { title: "Consegna in giornata", desc: "Quartieri idonei di Istanbul" },
    whatsapp: { title: "Assistenza WhatsApp", desc: "Segui il tuo ordine in tempo reale" },
    fresh: { title: "Garanzia di freschezza", desc: "Legato a mano dopo il tuo ordine" },
  },
  content: { faq: "Domande frequenti", more: "Leggi di più" },
  footer: {
    journey: "Mondo → ÇiçekYolla → Turchia → Atelier locale → Fiori → Persone → Ricordo", tagline1: "Dal 1986.", tagline2: "Ogni fiore, in mani locali.", since: "dal 1986",
    shop: "Negozio", all: "Tutti i prodotti", help: "Aiuto", how: "Come funziona", areas: "Destinazioni di consegna", whatsapp: "Assistenza WhatsApp", faq: "FAQ",
    deliver: "Consegna", follow: "Seguici", contact: "Contatti", country: "Turchia", cta: "Invia fiori", rights: "© {year} ÇiçekYolla. Tutti i diritti riservati.", cookies: "Preferenze cookie",
  },
};

export const es: V80Copy = {
  header: {
    search: "Busca flores o categorías", searchHint: "Escribe al menos dos letras", whatsapp: "WhatsApp", cart: "Abrir la cesta", menu: "Abrir el menú", closeMenu: "Cerrar el menú",
    currency: "Moneda", noResults: "No encontramos esa flor", popular: "Búsquedas populares", seeAll: "Ver todos los resultados →", products: "Productos", categories: "Categorías", skip: "Ir al contenido",
  },
  hero: {
    eyebrow: "Flores y regalos a Turquía · Se siente desde lejos", title1: "Envía tu sentimiento", title2: "a quienes amas", titleEm: "en Turquía.",
    body: "Estés donde estés — nuestro taller local lo prepara y lo deja en su puerta. Tú solo dices a quién quieres y dónde está.",
    cta: "Ver las flores", cta2: "¿Cómo funciona?",
    occasion: "Ocasión", occasionAny: "Elige una ocasión", date: "Fecha de entrega", datePick: "Elige una fecha", where: "A dónde", whereEmpty: "Elige una dirección de entrega", whereChange: "Cambiar dirección",
    sameDay: "Entrega el mismo día en los distritos habilitados de Estambul", cargo: "Envío a toda Turquía · 1–3 días laborables", founded: "Desde 1986 — con talleres locales en toda Turquía",
    statusOpen: "La entrega el mismo día sigue disponible hoy para esta dirección", statusClosed: "Los pedidos del mismo día ya cerraron hoy — la entrega de mañana está abierta",
  },
  ticker: { hand: "Atado a mano · de un taller local", since: "Desde 1986 · a Turquía", fresh: "Recién cortado · fresco del día", world: "Pedido desde el mundo · entregado en la puerta", types: "Rosas · Peonías · Tulipanes · De temporada", care: "Cada ramo preparado con cuidado" },
  trustMini: { ssl: "Pago cifrado SSL", whatsapp: "Soporte por WhatsApp", since: "Desde 1986" },
  discovery: {
    eyebrow: "Encontrémoslo juntos",
    groups: { who: "¿Para quién es?", occasion: "¿Qué ocasión?", what: "¿Qué quieres enviar?", where: "¿A dónde en Turquía?" },
    chips: { mother: "Mi madre", partner: "Mi pareja", friend: "Un amigo", colleague: "Un compañero", sibling: "Mi hermano/a", family: "Familia", birthday: "Cumpleaños", anniversary: "Aniversario", condolence: "Condolencias", thanks: "Gracias", sorry: "Perdón", surprise: "Sorpresa" },
    show: "Ver la selección →", match: "{n} propuestas coinciden con tu elección", clear: "Limpiar filtros",
  },
  shop: {
    eyebrow: "Selecciones", eyebrowFor: "Elegido para ti", title: "Los más enviados", titleFor: "Selección para {x}", all: "Todos los productos →", tabAll: "Todos", unit: "productos", more: "Ver más ({n} productos)",
    promoTitle: "Cada ramo se prepara a mano después de tu pedido.", promoBody: "Recién cortado, preparado en el día. Del taller a su puerta, sin esperas.", promoCta: "Ver cómo funciona →", cardCta: "Enviar este",
    sameDay: "Mismo día · Estambul", cargo: "Toda Turquía · 1–3 días", bestseller: "Superventas", new: "Nuevo", sale: "Oferta", empty: "Todavía no hay productos para esta selección.",
  },
  categories: { eyebrow: "Categorías", title: "Explora por tipo", pick: "Elige una colección →", kinds: "{n} variedades", from: "desde {price}" },
  delivery: {
    eyebrow: "Opciones de entrega", title: "Preparado hoy,", titleEm: "entregado con cuidado.", selected: "Ubicación seleccionada", noSelection: "Aún no hay dirección seleccionada",
    items: {
      istanbul: { label: "Estambul · Mensajero el mismo día", title: "Entrega el mismo día", sub: "En los distritos habilitados de Estambul. Pide hoy y nuestro mensajero entrega hoy — las franjas exactas se muestran en la página del producto." },
      cargo: { label: "Toda Turquía", title: "Envío · 1–3 días laborables", sub: "También ciudades lejanas. Preparado con cuidado, empaquetado fresco, envío con seguimiento." },
      cities: { label: "Antalya · Muğla · İzmir", title: "Ciudades costeras", sub: "Flores empaquetadas frescas al Mediterráneo y al Egeo, enviadas a la dirección que elijas." },
    },
  },
  collections: { eyebrow: "Colecciones", title: "Encontremos lo que buscas", sub: "Nuestros talleres locales preparan cada ramo a mano. El día de la entrega sale del taller y llega a la puerta de quienes amas.", view: "Ver →" },
  mood: {
    eyebrow: "Sentimiento y ocasión", title: "¿Qué quieres decir?",
    items: {
      love: { word: "Amor", line: "Te quiero muchísimo.", sub: "Siempre, cada día.", cta: "Rosas para el amor" },
      birthday: { word: "Cumpleaños", line: "Feliz cumpleaños.", sub: "Se celebra también desde lejos.", cta: "Ramo de cumpleaños" },
      sorry: { word: "Perdón", line: "Lo siento, de verdad.", sub: "A veces las flores lo dicen mejor.", cta: "Arreglo blanco" },
      thanks: { word: "Gracias", line: "Sin ti no habría sido posible.", sub: "Para alguien que marca la diferencia.", cta: "Ramo de agradecimiento" },
      condolence: { word: "Condolencias", line: "Estoy contigo.", sub: "Cuando las palabras no bastan.", cta: "Arreglo blanco sencillo" },
    },
  },
  card: {
    eyebrow: "Tarjeta escrita a mano — gratis", title: "¿Qué escribimos en tu tarjeta?", sub: "Escribes tu mensaje al pagar; nosotros lo copiamos a mano en una tarjeta que va dentro del ramo.", note: "El mensaje se añade al pagar · hasta 200 caracteres", preview: "Tu mensaje aparecerá aquí…", brand: "ÇiçekYolla", cta: "Elegir flores con este mensaje →",
    occasions: { love: "Amor", birthday: "Cumpleaños", sorry: "Perdón", thanks: "Gracias", condolence: "Condolencias", getwell: "Que te mejores" },
    lines: {
      love: ["Pienso en ti.", "Qué bien que existas.", "Estoy lejos, pero mi corazón está ahí.", "Hoy es tuyo."],
      birthday: ["Feliz cumpleaños.", "Hoy es tu día.", "Muchos años felices.", "Te quiero muchísimo."],
      sorry: ["Lo siento, de verdad.", "Me equivoqué, perdóname.", "Quiero estar a tu lado.", "¿Me perdonas?"],
      thanks: ["Sin ti no habría sido posible.", "Significa muchísimo.", "Gracias por todo.", "De todo corazón."],
      condolence: ["Estoy contigo.", "Comparto tu dolor.", "Siempre estoy aquí.", "Mi más sentido pésame."],
      getwell: ["Que te mejores pronto.", "Pronto estarás de pie.", "Estoy contigo.", "Pasará, estarás bien."],
    },
  },
  destinations: { eyebrow: "Destinos de entrega", title: "¿A dónde lo enviamos?", sameDay: "Mismo día", cargo: "Envío", districts: "{n} distritos", subs: { istanbul: "Europa y Anatolia", antalya: "Costa mediterránea", mugla: "Bodrum, Marmaris, Fethiye", izmir: "Perla del Egeo" } },
  journey: {
    title1: "Pide desde cualquier lugar del mundo.", title2: "Entregado en Turquía.", body: "Estés donde estés — haz el pedido y nuestro taller lo prepara.",
    bullets: ["Pago cifrado SSL · compra segura", "Soporte por WhatsApp · seguimiento del pedido", "Desde 1986, en toda Turquía"], cta: "Pedir ahora",
    steps: [
      { t: "Empieza en el mundo", d: "Estés donde estés. Tu pedido comienza." },
      { t: "Se prepara en Turquía", d: "Nuestro taller local más cercano lo prepara con cuidado. Recién cortado, en el día." },
      { t: "Llega a su puerta", d: "Empaquetado fresco, hecho a mano. A la dirección que elijas, a la velocidad que elijas." },
      { t: "Tú también lo sabes", d: "Preparado · En camino · Entregado. Te mantenemos informado." },
    ],
    quote: "Desde 1986 trabajamos con floristas locales en toda Turquía. Tu pedido se prepara en manos locales y se entrega en la puerta de quienes amas.",
    help: "Ayuda y soporte", wa: "Escribir por WhatsApp", waNote: "TR/EN · Hora de Turquía", facts: { founded: "Fundada en", local: "Red de talleres" },
  },
  reviews: { eyebrow: "Opiniones de clientes", title: "Ellos lo cuentan.", source: "Reseñas reales de Google" },
  cta: { eyebrow: "¿Listo?", title1: "Envía algo hoy.", titleEm: "La distancia no es obstáculo para el amor.", body: "Estés donde estés, haz tu pedido. Las flores preparadas en nuestro taller de Estambul se entregan el mismo día en los distritos habilitados y se envían a toda Turquía.", button: "Enviar ahora →", bullets: ["Estambul · Entrega el mismo día", "Toda Turquía · Flores frescas por envío"] },
  trust: {
    pay: { title: "Pago seguro", desc: "3D Secure, cifrado SSL" },
    sameday: { title: "Entrega el mismo día", desc: "Distritos habilitados de Estambul" },
    whatsapp: { title: "Soporte por WhatsApp", desc: "Sigue tu pedido en directo" },
    fresh: { title: "Garantía de frescura", desc: "Atado a mano tras tu pedido" },
  },
  content: { faq: "Preguntas frecuentes", more: "Leer más" },
  footer: {
    journey: "Mundo → ÇiçekYolla → Turquía → Taller local → Flores → Personas → Recuerdo", tagline1: "Desde 1986.", tagline2: "Cada flor, en manos locales.", since: "desde 1986",
    shop: "Tienda", all: "Todos los productos", help: "Ayuda", how: "Cómo funciona", areas: "Destinos de entrega", whatsapp: "Soporte por WhatsApp", faq: "Preguntas frecuentes",
    deliver: "Entrega", follow: "Síguenos", contact: "Contacto", country: "Turquía", cta: "Enviar flores", rights: "© {year} ÇiçekYolla. Todos los derechos reservados.", cookies: "Preferencias de cookies",
  },
};

export const pt: V80Copy = {
  header: {
    search: "Procurar flores ou categorias", searchHint: "Escreva pelo menos duas letras", whatsapp: "WhatsApp", cart: "Abrir o carrinho", menu: "Abrir o menu", closeMenu: "Fechar o menu",
    currency: "Moeda", noResults: "Não encontrámos essa flor", popular: "Pesquisas populares", seeAll: "Ver todos os resultados →", products: "Produtos", categories: "Categorias", skip: "Ir para o conteúdo",
  },
  hero: {
    eyebrow: "Flores e presentes para a Turquia · Sente-se mesmo de longe", title1: "Envie o seu sentimento", title2: "a quem ama", titleEm: "na Turquia.",
    body: "Onde quer que esteja — o nosso atelier local prepara e deixa à porta. Só nos diz quem ama e onde está.",
    cta: "Ver as flores", cta2: "Como funciona?",
    occasion: "Ocasião", occasionAny: "Escolher uma ocasião", date: "Data de entrega", datePick: "Escolher uma data", where: "Para onde", whereEmpty: "Escolher uma morada de entrega", whereChange: "Alterar morada",
    sameDay: "Entrega no mesmo dia nos distritos elegíveis de Istambul", cargo: "Envio para toda a Turquia · 1–3 dias úteis", founded: "Desde 1986 — com ateliers locais em toda a Turquia",
    statusOpen: "A entrega no mesmo dia ainda está disponível hoje para esta morada", statusClosed: "As encomendas do dia já fecharam — a entrega no dia seguinte está aberta",
  },
  ticker: { hand: "Atado à mão · de um atelier local", since: "Desde 1986 · para a Turquia", fresh: "Acabado de cortar · fresco do dia", world: "Encomendado do mundo · entregue à porta", types: "Rosas · Peónias · Tulipas · Da época", care: "Cada ramo preparado com cuidado" },
  trustMini: { ssl: "Pagamento encriptado SSL", whatsapp: "Apoio por WhatsApp", since: "Desde 1986" },
  discovery: {
    eyebrow: "Vamos encontrar juntos",
    groups: { who: "Para quem é?", occasion: "Qual é a ocasião?", what: "O que quer enviar?", where: "Para onde na Turquia?" },
    chips: { mother: "A minha mãe", partner: "O meu amor", friend: "Um amigo", colleague: "Um colega", sibling: "Irmão / irmã", family: "Família", birthday: "Aniversário", anniversary: "Aniversário de casamento", condolence: "Condolências", thanks: "Obrigado", sorry: "Desculpa", surprise: "Surpresa" },
    show: "Mostrar a seleção →", match: "{n} sugestões correspondem à sua escolha", clear: "Limpar filtros",
  },
  shop: {
    eyebrow: "Seleções", eyebrowFor: "Escolhido para si", title: "Os mais enviados", titleFor: "Seleção para {x}", all: "Todos os produtos →", tabAll: "Todos", unit: "produtos", more: "Mostrar mais ({n} produtos)",
    promoTitle: "Cada ramo é feito à mão depois da sua encomenda.", promoBody: "Acabado de cortar, preparado no dia. Do atelier à porta, sem esperas.", promoCta: "Ver como funciona →", cardCta: "Enviar este",
    sameDay: "Mesmo dia · Istambul", cargo: "Toda a Turquia · 1–3 dias", bestseller: "Mais vendido", new: "Novo", sale: "Promoção", empty: "Ainda não há produtos para esta seleção.",
  },
  categories: { eyebrow: "Categorias", title: "Explorar por tipo", pick: "Escolher uma coleção →", kinds: "{n} variedades", from: "desde {price}" },
  delivery: {
    eyebrow: "Opções de entrega", title: "Preparado hoje,", titleEm: "entregue com cuidado.", selected: "Local selecionado", noSelection: "Ainda sem morada selecionada",
    items: {
      istanbul: { label: "Istambul · Estafeta no mesmo dia", title: "Entrega no mesmo dia", sub: "Nos distritos elegíveis de Istambul. Encomende hoje e o nosso estafeta entrega hoje — os horários exatos aparecem na página do produto." },
      cargo: { label: "Toda a Turquia", title: "Envio · 1–3 dias úteis", sub: "Também cidades distantes. Preparado com cuidado, embalado fresco, envio com rastreio." },
      cities: { label: "Antalya · Muğla · İzmir", title: "Cidades costeiras", sub: "Flores embaladas frescas para o Mediterrâneo e o Egeu, enviadas para a morada que escolher." },
    },
  },
  collections: { eyebrow: "Coleções", title: "Vamos encontrar o que procura", sub: "Os nossos ateliers locais fazem cada ramo à mão. No dia da entrega sai do atelier e chega à porta de quem ama.", view: "Ver →" },
  mood: {
    eyebrow: "Sentimento e ocasião", title: "O que quer dizer?",
    items: {
      love: { word: "Amor", line: "Amo-te muito.", sub: "Sempre, todos os dias.", cta: "Rosas para o amor" },
      birthday: { word: "Aniversário", line: "Feliz aniversário.", sub: "Celebra-se mesmo de longe.", cta: "Ramo de aniversário" },
      sorry: { word: "Desculpa", line: "Desculpa, a sério.", sub: "Às vezes as flores dizem-no melhor.", cta: "Arranjo branco" },
      thanks: { word: "Obrigado", line: "Sem ti não teria sido possível.", sub: "Para alguém que faz a diferença.", cta: "Ramo de agradecimento" },
      condolence: { word: "Condolências", line: "Estou contigo.", sub: "Quando as palavras não chegam.", cta: "Arranjo branco simples" },
    },
  },
  card: {
    eyebrow: "Cartão escrito à mão — grátis", title: "O que escrevemos no seu cartão?", sub: "Escreve a mensagem no pagamento; nós copiamo-la à mão num cartão colocado dentro do ramo.", note: "A mensagem é adicionada no pagamento · até 200 caracteres", preview: "A sua mensagem aparecerá aqui…", brand: "ÇiçekYolla", cta: "Escolher flores com esta mensagem →",
    occasions: { love: "Amor", birthday: "Aniversário", sorry: "Desculpa", thanks: "Obrigado", condolence: "Condolências", getwell: "As melhoras" },
    lines: {
      love: ["Penso em ti.", "Ainda bem que existes.", "Estou longe, mas o meu coração está aí.", "Hoje é teu."],
      birthday: ["Feliz aniversário.", "Hoje é o teu dia.", "Muitos anos felizes.", "Amo-te muito."],
      sorry: ["Desculpa, a sério.", "Estava errado, perdoa-me.", "Quero estar ao teu lado.", "Perdoas-me?"],
      thanks: ["Sem ti não teria sido possível.", "Significa muito.", "Obrigado por tudo.", "De todo o coração."],
      condolence: ["Estou contigo.", "Partilho a tua dor.", "Estou sempre aqui.", "Os meus sentidos pêsames."],
      getwell: ["As melhoras.", "Vais ficar de pé num instante.", "Estou contigo.", "Vai passar, vais ficar bem."],
    },
  },
  destinations: { eyebrow: "Destinos de entrega", title: "Para onde enviamos?", sameDay: "Mesmo dia", cargo: "Envio", districts: "{n} distritos", subs: { istanbul: "Europa e Anatólia", antalya: "Costa mediterrânica", mugla: "Bodrum, Marmaris, Fethiye", izmir: "Pérola do Egeu" } },
  journey: {
    title1: "Encomende de qualquer lugar do mundo.", title2: "Entregue na Turquia.", body: "Onde quer que esteja — faça a encomenda e o nosso atelier prepara.",
    bullets: ["Pagamento encriptado SSL · checkout seguro", "Apoio por WhatsApp · rastreio da encomenda", "Desde 1986, em toda a Turquia"], cta: "Encomendar",
    steps: [
      { t: "Começa no mundo", d: "Onde quer que esteja. A sua encomenda começa." },
      { t: "Preparado na Turquia", d: "O nosso atelier local mais próximo prepara com cuidado. Acabado de cortar, no dia." },
      { t: "Chega à porta", d: "Embalado fresco, feito à mão. Para a morada que escolher, à velocidade que escolher." },
      { t: "Também fica a saber", d: "Preparado · A caminho · Entregue. Mantemo-lo informado." },
    ],
    quote: "Desde 1986 trabalhamos com floristas locais em toda a Turquia. A sua encomenda é preparada por mãos locais e entregue à porta de quem ama.",
    help: "Ajuda e apoio", wa: "Escrever no WhatsApp", waNote: "TR/EN · Hora da Turquia", facts: { founded: "Fundada em", local: "Rede de ateliers" },
  },
  reviews: { eyebrow: "Opiniões de clientes", title: "Eles contam.", source: "Avaliações reais do Google" },
  cta: { eyebrow: "Pronto?", title1: "Envie algo hoje.", titleEm: "A distância não é obstáculo ao amor.", body: "Onde quer que esteja, faça a sua encomenda. As flores preparadas no nosso atelier de Istambul são entregues no mesmo dia nos distritos elegíveis e enviadas para toda a Turquia.", button: "Enviar agora →", bullets: ["Istambul · Entrega no mesmo dia", "Toda a Turquia · Flores frescas por envio"] },
  trust: {
    pay: { title: "Pagamento seguro", desc: "3D Secure, encriptado SSL" },
    sameday: { title: "Entrega no mesmo dia", desc: "Distritos elegíveis de Istambul" },
    whatsapp: { title: "Apoio por WhatsApp", desc: "Acompanhe a sua encomenda em direto" },
    fresh: { title: "Garantia de frescura", desc: "Atado à mão após a sua encomenda" },
  },
  content: { faq: "Perguntas frequentes", more: "Ler mais" },
  footer: {
    journey: "Mundo → ÇiçekYolla → Turquia → Atelier local → Flores → Pessoas → Memória", tagline1: "Desde 1986.", tagline2: "Cada flor, em mãos locais.", since: "desde 1986",
    shop: "Loja", all: "Todos os produtos", help: "Ajuda", how: "Como funciona", areas: "Destinos de entrega", whatsapp: "Suporte por WhatsApp", faq: "Perguntas frequentes",
    deliver: "Entrega", follow: "Siga-nos", contact: "Contacto", country: "Turquia", cta: "Enviar flores", rights: "© {year} ÇiçekYolla. Todos os direitos reservados.", cookies: "Preferências de cookies",
  },
};

export const az: V80Copy = {
  header: {
    search: "Gül və ya kateqoriya axtar", searchHint: "Ən azı iki hərf yazın", whatsapp: "WhatsApp", cart: "Səbəti aç", menu: "Menyunu aç", closeMenu: "Menyunu bağla",
    currency: "Valyuta", noResults: "Bu gülü tapa bilmədik", popular: "Populyar axtarışlar", seeAll: "Bütün nəticələr →", products: "Məhsullar", categories: "Kateqoriyalar", skip: "Məzmuna keç",
  },
  hero: {
    eyebrow: "Türkiyəyə gül və hədiyyə · Uzaqdan da hiss olunur", title1: "Duyğunu", title2: "Türkiyədəki sevdiklərinə", titleEm: "göndər.",
    body: "Dünyanın harasında olursan ol — yerli emalatxanamız hazırlayır, sevdiklərinin qapısına çatdırır. Sən yalnız kimi sevdiyini və harada olduğunu de.",
    cta: "Gülləri gör", cta2: "Necə işləyir?",
    occasion: "Münasibət", occasionAny: "Münasibət seç", date: "Çatdırılma tarixi", datePick: "Tarix seç", where: "Haraya", whereEmpty: "Çatdırılma ünvanı seç", whereChange: "Ünvanı dəyiş",
    sameDay: "Uyğun İstanbul rayonlarında elə həmin gün çatdırılma", cargo: "Türkiyə üzrə karqo · 1–3 iş günü", founded: "1986-dan bəri — Türkiyənin hər yerində yerli emalatxanalarla",
    statusOpen: "Bu ünvan üçün bu gün həmin gün çatdırılma hələ mümkündür", statusClosed: "Bu günün həmin gün sifarişləri bağlandı — sabah çatdırılma açıqdır",
  },
  ticker: { hand: "Əl ilə bağlanır · yerli emalatxanadan", since: "1986-dan bəri · Türkiyəyə", fresh: "Təzə kəsilmiş · günü günə", world: "Dünyadan sifariş · qapıya çatdırılma", types: "Qızılgül · Pion · Lalə · Mövsümi", care: "Hər buket diqqətlə hazırlanır" },
  trustMini: { ssl: "SSL şifrəli ödəniş", whatsapp: "WhatsApp dəstəyi", since: "1986-dan bəri" },
  discovery: {
    eyebrow: "Birlikdə tapaq",
    groups: { who: "Kimə göndərirsən?", occasion: "Hansı münasibətlə?", what: "Nə göndərmək istəyirsən?", where: "Türkiyədə haraya?" },
    chips: { mother: "Anam", partner: "Sevgilim", friend: "Dostum", colleague: "İş yoldaşım", sibling: "Bacım / qardaşım", family: "Ailə", birthday: "Ad günü", anniversary: "İldönümü", condolence: "Başsağlığı", thanks: "Təşəkkür", sorry: "Üzr", surprise: "Sürpriz" },
    show: "Seçimi göstər →", match: "Seçiminə {n} təklif uyğundur", clear: "Filtrləri təmizlə",
  },
  shop: {
    eyebrow: "Seçimlər", eyebrowFor: "Sənin üçün seçdik", title: "Ən çox göndərilən", titleFor: "{x} üçün seçimlər", all: "Bütün məhsullar →", tabAll: "Hamısı", unit: "məhsul", more: "Daha çox göstər ({n} məhsul)",
    promoTitle: "Hər buket sifarişdən sonra əl ilə hazırlanır.", promoBody: "Təzə kəsilmiş, elə həmin gün hazırlanır. Emalatxanadan qapıya, gözləmədən.", promoCta: "Necə işlədiyini gör →", cardCta: "Bunu göndər",
    sameDay: "Həmin gün · İstanbul", cargo: "Bütün Türkiyə · 1–3 gün", bestseller: "Bestseller", new: "Yeni", sale: "Endirim", empty: "Bu seçimə uyğun məhsul hələ yoxdur.",
  },
  categories: { eyebrow: "Kateqoriyalar", title: "Növə görə kəşf et", pick: "Kolleksiya seç →", kinds: "{n} çeşid", from: "{price}-dan" },
  delivery: {
    eyebrow: "Çatdırılma seçimləri", title: "Bu gün hazırlanır,", titleEm: "diqqətlə çatdırılır.", selected: "Seçilmiş məkan", noSelection: "Hələ ünvan seçilməyib",
    items: {
      istanbul: { label: "İstanbul · Həmin gün kuryer", title: "Həmin gün çatdırılma", sub: "Uyğun İstanbul rayonlarında. Bu gün sifariş ver, kuryerimiz bu gün çatdırsın — dəqiq vaxt aralıqları məhsul səhifəsində göstərilir." },
      cargo: { label: "Bütün Türkiyə", title: "Karqo · 1–3 iş günü", sub: "Uzaq şəhərlər də mümkündür. Diqqətlə hazırlanmış, təzə qablaşdırılmış, izlənən karqo." },
      cities: { label: "Antalya · Muğla · İzmir", title: "Sahil şəhərləri", sub: "Aralıq dənizi və Egey sahillərinə təzə qablaşdırılmış güllər, seçdiyin ünvana karqo ilə." },
    },
  },
  collections: { eyebrow: "Kolleksiyalar", title: "Axtardığını tapaq", sub: "Yerli emalatxanalarımız hər buketi əl ilə hazırlayır. Çatdırılma günü emalatxanadan çıxır, sevdiklərinin qapısına çatır.", view: "Bax →" },
  mood: {
    eyebrow: "Duyğu və münasibət", title: "Nə demək istəyirsən?",
    items: {
      love: { word: "Sevgi", line: "Səni çox sevirəm.", sub: "Həmişə, hər gün.", cta: "Sevgi üçün qızılgüllər" },
      birthday: { word: "Ad günü", line: "Ad günün mübarək.", sub: "Uzaqdan da qeyd olunur.", cta: "Ad günü buketi" },
      sorry: { word: "Üzr", line: "Bağışla, həqiqətən.", sub: "Bəzən güllər daha yaxşı deyir.", cta: "Ağ kompozisiya" },
      thanks: { word: "Təşəkkür", line: "Sən olmasaydın olmazdı.", sub: "Fərq yaradan birinə.", cta: "Təşəkkür buketi" },
      condolence: { word: "Başsağlığı", line: "Yanındayam.", sub: "Sözlər kifayət etməyəndə.", cta: "Sadə ağ kompozisiya" },
    },
  },
  card: {
    eyebrow: "Əl yazısı kart — pulsuz", title: "Kartına nə yazaq?", sub: "Mesajını ödəniş addımında yazırsan; biz onu əl ilə karta yazıb buketə qoyuruq.", note: "Mesaj ödənişdə əlavə olunur · 200 simvola qədər", preview: "Mesajın burada görünəcək…", brand: "ÇiçekYolla", cta: "Bu mesajla gül seç →",
    occasions: { love: "Sevgi", birthday: "Ad günü", sorry: "Üzr", thanks: "Təşəkkür", condolence: "Başsağlığı", getwell: "Keçmiş olsun" },
    lines: {
      love: ["Səni düşünürəm.", "Yaxşı ki varsan.", "Uzaqdayam, amma ürəyim oradadır.", "Bu gün sənindir."],
      birthday: ["Ad günün mübarək.", "Bu gün sənin günündür.", "Neçə-neçə xoşbəxt illərə.", "Səni çox sevirəm."],
      sorry: ["Bağışla, həqiqətən.", "Haqsız idim, məni bağışla.", "Yanında olmaq istəyirəm.", "Bağışlayarsan?"],
      thanks: ["Sən olmasaydın olmazdı.", "Çox şey ifadə edir.", "Hər şey üçün təşəkkür.", "Bütün qəlbimlə."],
      condolence: ["Yanındayam.", "Kədərini bölüşürəm.", "Həmişə buradayam.", "Allah rəhmət eləsin."],
      getwell: ["Keçmiş olsun.", "Tezliklə sağalarsan.", "Səninləyəm.", "Keçər, yaxşı olarsan."],
    },
  },
  destinations: { eyebrow: "Çatdırılma nöqtələri", title: "Haraya göndərək?", sameDay: "Həmin gün", cargo: "Karqo", districts: "{n} rayon", subs: { istanbul: "Avropa və Anadolu", antalya: "Aralıq dənizi sahili", mugla: "Bodrum, Marmaris, Fethiye", izmir: "Egeyin incisi" } },
  journey: {
    title1: "Dünyanın harasından olursa olsun sifariş ver.", title2: "Türkiyədə çatdırılır.", body: "Harada olursan ol — sifarişi ver, emalatxanamız hazırlasın.",
    bullets: ["SSL şifrəli ödəniş · təhlükəsiz ödəmə", "WhatsApp dəstəyi · sifariş izləmə", "1986-dan bəri Türkiyənin hər yerində"], cta: "Sifariş ver",
    steps: [
      { t: "Dünyadan başlayır", d: "Harada olursan ol. Sifarişin başlayır." },
      { t: "Türkiyədə hazırlanır", d: "Ən yaxın yerli emalatxanamız diqqətlə hazırlayır. Təzə kəsilmiş, elə həmin gün." },
      { t: "Qapısına çatır", d: "Təzə qablaşdırılmış, əl ilə hazırlanmış. Seçdiyin ünvana, seçdiyin sürətlə." },
      { t: "Sən də bilirsən", d: "Hazırlandı · Yola çıxdı · Çatdırıldı. Səni məlumatlandırırıq." },
    ],
    quote: "1986-dan bəri Türkiyənin hər yerindəki yerli gülçülərlə işləyirik. Sifarişin yerli əllərdə hazırlanır, sevdiklərinin qapısına çatdırılır.",
    help: "Kömək və dəstək", wa: "WhatsApp-dan yaz", waNote: "TR/EN · Türkiyə vaxtı", facts: { founded: "Quruluş ili", local: "Emalatxana sistemi" },
  },
  reviews: { eyebrow: "Müştəri rəyləri", title: "Onlar danışdı.", source: "Həqiqi Google rəyləri" },
  cta: { eyebrow: "Hazırsan?", title1: "Bu gün bir şey göndər.", titleEm: "Məsafə sevgiyə maneə deyil.", body: "Harada olursan ol, sifarişini ver. İstanbul emalatxanamızda hazırlanan güllər uyğun rayonlara həmin gün, bütün Türkiyəyə isə karqo ilə çatdırılır.", button: "İndi göndər →", bullets: ["İstanbul · Həmin gün çatdırılma", "Bütün Türkiyə · Karqo ilə təzə gül"] },
  trust: {
    pay: { title: "Təhlükəsiz ödəniş", desc: "3D Secure, SSL şifrəli" },
    sameday: { title: "Həmin gün çatdırılma", desc: "Uyğun İstanbul rayonları" },
    whatsapp: { title: "WhatsApp dəstəyi", desc: "Sifarişini canlı izlə" },
    fresh: { title: "Təzəlik zəmanəti", desc: "Sifarişdən sonra əl ilə bağlanır" },
  },
  content: { faq: "Tez-tez verilən suallar", more: "Daha çox oxu" },
  footer: {
    journey: "Dünya → ÇiçekYolla → Türkiyə → Yerli emalatxana → Güllər → İnsanlar → Xatirə", tagline1: "1986-cı ildən.", tagline2: "Hər gül yerli əllərdə.", since: "1986-cı ildən",
    shop: "Mağaza", all: "Bütün məhsullar", help: "Kömək", how: "Necə işləyir", areas: "Çatdırılma istiqamətləri", whatsapp: "WhatsApp dəstəyi", faq: "Suallar",
    deliver: "Çatdırılma", follow: "İzləyin", contact: "Əlaqə", country: "Türkiyə", cta: "Gül göndər", rights: "© {year} ÇiçekYolla. Bütün hüquqlar qorunur.", cookies: "Kuki tənzimləmələri",
  },
};
