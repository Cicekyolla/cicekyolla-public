# ÇiçekYolla Global: keyword and competitor URL research (2026-10-13)

## 0. Method and what could NOT be observed

- Tool: the session's WebSearch tool (a US-only web index; **not Google**). I ran ~35 queries in standard and extended mode.
- **Google SERPs, Google Autocomplete and "related searches" could not be observed.** google.com, suggestqueries.google.com, bing.com and duckduckgo were unreachable from this environment (DNS failure or proxy 403).
- **Competitor HTML could not be fetched.** WebFetch returned DNS errors and curl was refused by the egress proxy for flowerartistanbul.com, ciceksepeti.com and turkeyflowersshop.com. So **canonical and hreflang tags were NOT observed for any competitor.** Everything below comes from result titles and URLs in the search index.
- **No search volumes.** None were observed and none are given.
- Rankings in this index are not Google rankings for a user in Germany, Russia or the Gulf. "Appears in results" means only that the page was indexed and judged relevant for that phrasing.
- URL keywords alone do not prove ranking success. Several ranking pages use plain hierarchical URLs (see section 2).
- Notable: a search for `cicekyolla.com.tr` returned **no pages from the domain** in this index. Indexation or visibility may be a bigger issue than slug wording. Verify in Google Search Console.

## 1. Per-language findings

The phrase and slug evidence comes from result titles and URLs seen in the searches. Confidence reflects how much evidence exists, not expected traffic.

### EN
| Field | Value |
|---|---|
| Primary query | "flower delivery istanbul" / "istanbul flower delivery" (tie with below) |
| Secondary | "send flowers to istanbul", "florist istanbul" / "istanbul florist", "same day flower delivery istanbul", "flower delivery {district}", "send flowers to {district}", "{district} florist" |
| Evidence (titles/URLs) | flowwow.com.tr/en/istanbul/ ("Flower Delivery Istanbul, Turkey"); flowers4istanbul.com ("Flower Delivery Istanbul, Turkey - Istanbul Florist"); flowerdeliveryistanbul.com ("Flower delivery Istanbul - Send flowers to Istanbul"); turkeyflowersshop.com/city/istanbul-flower-delivery.html; arabianflora.com/flower-delivery-istanbul; flowers.com.tr/send-flowers-to-istanbul; sendflowerstoturkey.com/send-flowers-to-istanbul/; mondialflowers.com/flower-delivery/Turkey/Istanbul ("Send Flowers to Istanbul"); floraqueen.com/collections/flowers-istanbul ("Send Flowers to Istanbul, Flower Delivery with FloraQueen") |
| District-level demand served? | **Yes, heavily.** For "flower delivery Kadikoy" / "send flowers to Kadikoy": flowerartistanbul.com/flower-delivery-kadikoy-istanbul/, flowerartistanbul.com/send-flowers-to-kadikoy-same-day-free-delivery/, turkeyflowersshop.com/cat/istanbul-kadikoy-flower-delivery, sendflowerstoturkey.com/istanbul/kadikoy/florist/, mondialflowers.com/turkey/istanbul/kadikoy.aspx, leaffloweristanbul.com/en/kadikoy-florist-same-day-flower-delivery, flowers4turkey.com/kadikoy/plants-flower-collection.html, flowwow.com.tr/en/uskudar/, flowwow.com.tr/en/fatih/ |
| Neighborhood-level | **Yes, some:** sendflowerstoturkey.com/istanbul/bebek/florist/, /istanbul/nisantasi/florist/, /istanbul/4Levent/florist/; flowerartistanbul.com/ar/levent-florist-same-day-flower-delivery/ |
| Competitors | Flower Art Istanbul, Turkey Flowers Shop, SendFlowersToTurkey, FloraQueen, Flowwow, Flowers4Istanbul, Mondial Flowers, Cherry Blossom, FTD, ArabianFlora, Turkiyeflower, Heryerbitki /en, Leaf Flower, Ribbon /en |
| Slug if migrating | `flower-delivery-istanbul` / `flower-delivery-{district}-istanbul` / `flower-delivery-{neighborhood}-{district}-istanbul` |
| Confidence | **Medium.** "flower delivery" appears in more titles and slugs than "send flowers to", but both are clearly used. Hierarchical URLs (sendflowerstoturkey, mondial) also surface for district queries. |

### DE
| Field | Value |
|---|---|
| Primary | "Blumen verschicken Istanbul" / "Blumen nach Istanbul verschicken" |
| Secondary | "Blumenversand Istanbul" / "Blumenversand Türkei", "Blumenlieferung Istanbul", "Blumen versenden Istanbul", "Blumen liefern lassen Istanbul" |
| Evidence | fleurop.de/fleurop-international/blumen-in-die-tuerkei-schicken/istanbul ("Blumen verschicken Istanbul"); myglobalflowers.com/international-flower-delivery/turkey/istanbul ("Blumen nach Istanbul verschicken"); euroflorist.de/internationaler-blumenversand/tuerkei ("Blumenversand Türkei"); felicita-flowers.com/de/delivery-flowers-istanbul ("Blumenlieferung Istanbul"); flowerartistanbul.com/2020/09/27/blumen-versenden-istanbul/; turkiyenincicekcisi.com/de/Istanbul-Blumenversand.html; turkey-florist.org/de/istanbul_blumenbestellung.html; flowers4istanbul.com/de/rosen-flower-collection.html ("Rosen Blumen liefern lassen in Istanbul") |
| Note | The exact phrase "Blumen nach Istanbul schicken" (standard search) returned **no** relevant commercial pages. "verschicken" and "Blumenversand" show up more often. |
| District-level | **No German-language district page found.** The query "Blumen Kadıköy liefern" returned only city-level DE pages and English district pages. |
| Competitors | Fleurop, Euroflorist, MyGlobalFlowers, Flower Art Istanbul, Flowers4Istanbul, Felicita, Qblumen, MissFlowers, IstanbulCityFlorist |
| Slug if migrating | `blumen-verschicken-istanbul` / `blumen-verschicken-{district}-istanbul` / `blumen-verschicken-{neighborhood}-{district}-istanbul` |
| Confidence | **Low-medium.** Several phrasings compete and there is no district-level evidence. |

### RU
| Field | Value |
|---|---|
| Primary | "доставка цветов в Стамбул(е)" / "доставка цветов Стамбул" |
| Secondary | "отправка цветов в Стамбул", "цветы в Стамбуле с доставкой", "заказать букет в Стамбуле", "доставка цветов в {район}, Стамбул" |
| Evidence | flowers4istanbul.com/ru/ ("Доставка цветов Стамбул, Турция"); istanbul.kievflower.com.ua; istanbulflowersdelivery.com; flori1.com/world/turtsiya/stambul-4543/; s-fl.ru/dostavka/Stambul; flowers-place.com/istanbul/; floristik.ua/region/istanbul; annetflowers.com.ua/mezhdunarodnaya-dostavka/turciya/stambul/; udora.tr/ru/istanbul/ ("Цветы в Стамбуле с доставкой..."); flowerartistanbul.com/отправка-цветов-в-стамбул-доставка-в-т.../ (Cyrillic slug); dtf.ru listicle "Доставка цветов в Стамбуле: ТОП-5" |
| District-level | **Yes, a few, with ASCII/English slugs:** flowerartistanbul.com/ru/flower-delivery-kagithane-istanbul/ (title "Доставка цветов в Кагитхане, Стамбул"); turkeyflowersshop.com/ru/city/istanbul-kagithane-flower-delivery.html. istanbul.cyber-florist.ru names districts in its title ("Цветы в Умрание, Маслак, Башакшехир"). |
| Slug script | Mixed: English ASCII (udora, flowers-place, FAI district pages), Latin transliteration (`stambul`, `dostavka`), and one Cyrillic slug (FAI). ASCII dominates. |
| Competitors | Flowers4Istanbul, Udora, Flower Art Istanbul, Turkey Flowers Shop, Cyber-Florist, Rus-Buket, KievFlower, Flori1, SFlowers, Flowers-Place, Annet Flowers, Floristik.ua |
| Slug if migrating | Keep ASCII. Either the current `/ru/istanbul/{district}` or `dostavka-tsvetov-{district}-istanbul` (evidence for a translit keyword slug is thin: only flori1 and s-fl) |
| Confidence | **Medium** for the query phrase, **low** for any slug wording |

### AR
| Field | Value |
|---|---|
| Primary | "توصيل الزهور اسطنبول" / "إرسال الزهور إلى إسطنبول" |
| Secondary | "ورود ... إسطنبول", "بوكس ورد إسطنبول", "طلب الزهور عبر الإنترنت في إسطنبول", "محل زهور في إسطنبول" |
| Evidence | flowers4istanbul.com/ar/ ("توصيل الزهور اسطنبول, تركيا - بائع زهور اسطنبول"); flowerartistanbul.com/ar/... (titles: "محل زهور محلي في إسطنبول - إرسال الزهور - توصيل في نفس اليوم"); flowerartistanbul.com/ar/urun-kategori/roses/ ("ورود تُرسل إلى إسطنبول"); mugeflowers.com/ar ("طلب الزهور عبر الإنترنت في إسطنبول"); citioapp.com ("بوكس ورد") |
| Note | "زهور" appears in more titles than "ورد". The query "توصيل ورد اسطنبول" (standard) returned **no** florist pages, only courier and news pages. |
| District-level | Only one page observed: flowerartistanbul.com/ar/levent-florist-same-day-flower-delivery/ ("محل زهور ليفنت"). It uses an English slug. |
| Slug script | **All Arabic-language competitor pages observed use ASCII/English slugs under /ar/.** No Arabic-script slug was seen. |
| Competitors | Flower Art Istanbul, Flowers4Istanbul, Muge Flowers, Tulipa, Citio |
| Slug if migrating | ASCII only. Keep `/ar/istanbul/{district}`, or mirror the EN pattern `flower-delivery-{district}-istanbul` as FAI does |
| Confidence | **Low-medium** |

### FR
| Field | Value |
|---|---|
| Primary | "livraison (de) fleurs Istanbul" |
| Secondary | "envoyer des fleurs à Istanbul", "fleuriste Istanbul" |
| Evidence | gofleurs.com/pays/turquie/livraison-fleurs-istanbul.htm ("Envoyer des fleurs à Istanbul..."); flower-delivery.aquarelle/turkey/istanbul ("Livraison de fleurs à Istanbul"); felicita-flowers.com/fr/delivery-flowers-istanbul ("Livraison de fleurs Istanbul"); a-fleurdeau.fr/fleuriste-livraison-fleurs-istanbul-turquie.html; wineflowers.com/livraison-de-fleurs-fleuriste-1-Istanbul-222.html; interflora.fr/tr/c/0 ("Livraison de fleurs en Turquie"); flowerartistanbul.com/fr/urun-kategori/flowers/ |
| District-level | **None found** |
| Competitors | Interflora FR, Aquarelle, GoFleurs, Felicita, A Fleur d'eau, Wineflowers, Flower Art Istanbul, istanbulflowers.com.tr |
| Slug if migrating | `livraison-fleurs-istanbul` / `livraison-fleurs-{district}-istanbul` / `livraison-fleurs-{neighborhood}-{district}-istanbul` |
| Confidence | **Medium.** The phrase is consistent across titles and two slugs. |

### ES
| Field | Value |
|---|---|
| Primary | Unclear: "flores a domicilio en Estambul" vs "envío de flores Estambul" vs "entrega de flores Estambul" |
| Evidence | flowwow.com.tr/es/istanbul/ ("Flores a domicilio en Estambul — Enviar ramos..."); flowerartistanbul.com/es/ ("Floristería local en Estambul - Envío de flores - Entrega el mismo día"); flowers4istanbul.com/es/ ("Entrega de flores Istanbul, Turquía"); abcflora.com/es/pages/flowers-turkey; myglobalflowers ("Envío de Flores ... Turquía") |
| District-level | **None found** |
| Exonym | Titles use "Estambul"; slugs observed use `istanbul` (flowwow /es/istanbul/) |
| Slug if migrating | `envio-de-flores-{district}-estambul` or keep `/es/istanbul/{district}` |
| Confidence | **Low** |

### IT
| Field | Value |
|---|---|
| Primary | "consegna fiori Istanbul" |
| Secondary | "fiori a domicilio Istanbul", "inviare fiori a Istanbul", "fiorista Istanbul" |
| Evidence | wineflowers.com/consegna-fiori-domicilio-5-ITA-Istanbul-222.html; flowers4turkey.com/meric/it/istanbul-province.html ("CONSEGNA FIORI ISTANBUL"); fiori-a-domicilio.aquarelle/turchia/istanbul ("Consegna fiori a Istanbul"); gofiori.com/paesi/turchia/consegna-fiori-istanbul.htm ("Inviare fiori in Istanbul..."); flowerartistanbul.com/it/ ("Fiorista locale a Istanbul - Invia fiori") |
| District-level | **None found** |
| Slug if migrating | `consegna-fiori-istanbul` / `consegna-fiori-{district}-istanbul` |
| Confidence | **Medium** |

### NL
| Field | Value |
|---|---|
| Primary | "bloemen bezorgen Istanbul" |
| Secondary | "bloemen versturen (naar) Istanbul", "bloemen sturen Istanbul", "bloemist Istanbul", "bloemen bezorgen Turkije" |
| Evidence | fleurop.nl/en/order-abroad/turkey/istanbul/ ("Bloemen bezorgen in Istanbul? Bestel nu"); gobloemen.com/landen/turkije/bloemen-bezorgen-istanbul.htm; euroflorist.nl/international/turkije ("Bloemen bezorgen Turkije"); flowerartistanbul.com/nl/ ("Lokale bloemist in Istanbul - Bloemen bestellen/versturen"); flowers4turkey.com/nl/ |
| District-level | **None found** |
| Slug if migrating | `bloemen-bezorgen-istanbul` / `bloemen-bezorgen-{district}-istanbul` |
| Confidence | **Medium** |

### PT
| Field | Value |
|---|---|
| Primary | "entrega de flores em Istambul" |
| Secondary | "enviar flores para Istambul", "floricultura Istambul" |
| Evidence | entrega-de-flores.aquarelle/turquia/istambul ("Entrega de flores em Istambul"); flowerartistanbul.com/pt/ ("Floricultura local em Istambul - Envie flores - Entrega no mesmo dia") |
| District-level | **None found** |
| Exonym | Aquarelle uses `istambul` in its slug |
| Slug if migrating | `entrega-de-flores-{district}-istambul`, or keep `/pt/istanbul/{district}` |
| Confidence | **Low** (only two relevant sources) |

### JA
| Field | Value |
|---|---|
| Primary | **Not determinable from evidence** |
| Observed | "イスタンブール 花 配達" returned no Istanbul delivery pages. The term is ambiguous: "ニゲラ イスタンブール" is a flower cultivar sold by Japanese wholesalers (hanadonya.com, flowersmithmarket.com). Japanese searchers are served by Japan-based overseas-gift agents: i879.com/global (花キューピット 海外お届け), hanaokuri.com/country (Turkey in its country list), lgreen-flower.com. Generic phrasing seen: "海外へ花を送る", "海外フラワーギフト", "トルコ ... 花贈り". |
| District-level | None |
| Slug | ASCII. Keep `/ja/istanbul/{district}`. No Japanese-script slugs seen from competitors in this niche. |
| Confidence | **Low** |

### KO
| Field | Value |
|---|---|
| Primary | **Not determinable**. The likely generic term is "해외꽃배달" (overseas flower delivery). |
| Observed | "이스탄불 꽃 배달" returned Korean domestic florists (f-mans.com, cncflower.co.kr, kfcenter.com, 1588-39000.com, 1644-1644.com) plus myglobalflowers Istanbul (EN). sense-flower.com lists 튀르키예/터키 among its 해외꽃배달 countries. No Korean Istanbul-specific competitor page was found. |
| Slug | ASCII. Keep `/ko/istanbul/{district}`. |
| Confidence | **Low** |

### ZH
| Field | Value |
|---|---|
| Primary | **Not determinable** |
| Observed | "伊斯坦布尔 送花 / 鲜花配送" returned the flowers4{country}.com network's /zh/ pages for other countries (title pattern "鲜花配送 {国家}", ASCII slugs), Chinese domestic florists, and an article about Çiçeksepeti. No Chinese-language Istanbul page was found. |
| Slug | ASCII. Keep `/zh/istanbul/{district}`. |
| Confidence | **Low** |

### AZ
| Field | Value |
|---|---|
| Primary | **Not determinable** for Istanbul |
| Observed | No Azerbaijani-language page about sending flowers to Istanbul was found. Results were English sites (heryerbitki.com/en, flowers.com.tr/send-flowers-to-istanbul, sendflowerstoturkey) or Baku florists. A Baku florist (gulsifarisi.az) uses "gül sifarişi", "gül çatdırılması" and "gül göndər". This is evidence that AZ users say "gül" more than "çiçək" for this intent, but only from one site and only about Baku. |
| Slug | Keep `/az/istanbul/{district}`, or `istanbula-gul-catdirilmasi-{district}` (weak evidence) |
| Confidence | **Low** |

## 2. Competitor URL analysis

Canonical and hreflang were **not observable** for any site (fetch was blocked). The table records URL patterns seen in indexed results.

| Competitor | City URL | District URL | Neighborhood URL | URL wording | Lang structure | Seen for queries |
|---|---|---|---|---|---|---|
| Çiçeksepeti (ciceksepeti.com) | /c/istanbul-cicek-siparisi | /c/kadikoy-cicek-siparisi | /c/fikirtepe-cicek-siparisi (flat, same pattern) | cicek-siparisi; title "{X} Çiçekçi, {X} Çiçek Siparişi" | TR only. No /en location page observed (the app and country selector mention English) | TR "kadıköy çiçekçi" |
| Marmara Çiçek (marmaracicek.com) | /istanbul-cicek-siparisi-gonder | /umraniye-cicekci, /sisli-cicekci | /ikitelli-cicekci (flat) | cicekci, cicek-siparisi, cicek-gonder; title "{X} Çiçekçi, {X} Çiçek Siparişi, Marmara Çiçek" | TR only; no foreign pages observed. Listed as an Interflora member (Time Out) | TR queries only |
| Flower Art Istanbul (flowerartistanbul.com) | /send-flowers-to-istanbul-turkey-same-day-free-delivery/ ; /de: /2020/09/27/blumen-versenden-istanbul/ ; /ru: Cyrillic slug | /flower-delivery-{district}-istanbul/ (kadikoy, besiktas, sisli; /ru/flower-delivery-kagithane-istanbul/) AND /send-flowers-to-kadikoy-same-day-free-delivery/ (two Kadıköy pages) | /{nbhd}-florist-same-day-flower-delivery/ (/ar/levent-...) | Mixed: flower-delivery, send-flowers-to, florist; also -from-usa, -from-uk, hotel pages | Subfolders /de /ar /fr /es /it /nl /pt /ru. **English slugs reused under language folders.** Inconsistent | The most visible competitor: appeared for EN, DE, AR, FR, ES, IT, NL, PT, RU and district queries |
| Turkey Flowers Shop | /city/istanbul-flower-delivery.html | /cat/istanbul-kadikoy-flower-delivery ; /ru/city/istanbul-kagithane-flower-delivery.html | none seen | flower-delivery | /ru/ subfolder, English slug | EN city and district, RU district |
| SendFlowersToTurkey | /send-flowers-to-istanbul/ | /istanbul/kadikoy/florist/ (**hierarchical**) | /istanbul/bebek/florist/, /istanbul/nisantasi/florist/, /istanbul/4Levent/florist/ | florist | EN | EN district and neighborhood queries |
| Flowwow | /en/istanbul/, /es/istanbul/ | /en/uskudar/, /en/fatih/ (district treated as a city) | none seen | city name only; title "Flower delivery in {X} — Same Day Flowers Delivered" | Subfolders | EN, ES |
| Flowers4Istanbul | / , /ru/, /ar/, /es/, /de/... | none seen | none | category slugs | Subfolders | EN, RU, AR, ES, DE, IT |
| Flowers4Turkey | /meric/it/istanbul-province.html | /kadikoy/plants-flower-collection.html | none | collection | Mixed subfolders | IT, EN district |
| Mondial Flowers | /flower-delivery/Turkey/Istanbul | /turkey/istanbul/kadikoy.aspx (**hierarchical**) | none | flower-delivery | EN | EN district |
| FloraQueen | /collections/flowers-istanbul | None seen (districts are listed only in text) | none | flowers-{city} | (localized URLs not observed) | EN |
| Fleurop DE / NL | /fleurop-international/blumen-in-die-tuerkei-schicken/istanbul ; fleurop.nl/en/order-abroad/turkey/istanbul/ | none | none | blumen-...-schicken (hierarchical country/city) | per-country domains | DE, NL |
| Euroflorist | /internationaler-blumenversand/tuerkei ; .nl/international/turkije | none | none | blumenversand | per-country domains | DE, NL |
| Interflora FR | /tr/c/0 | none | none | none (opaque) | per-country domain | FR |
| Aquarelle | flower-delivery.aquarelle/turkey/istanbul ; fiori-a-domicilio.aquarelle/turchia/istanbul ; entrega-de-flores.aquarelle/turquia/istambul | none | none | **keyword in the domain, hierarchical country/city path in the local language** | per-language domains | FR, IT, PT |
| MyGlobalFlowers | /international-flower-delivery/turkey/istanbul | none | none | hierarchical | single URL across languages | DE, KO, ES |
| Udora | /ru/istanbul/ | none | none | city only | subfolder | RU |
| Leaf Flower | — | /en/kadikoy-florist-same-day-flower-delivery | — | florist | /en/ | EN district |
| Heryerbitki / Bloom&Fresh (TR) | — | /kadikoy-cicek-siparisi/ ; /l/kadikoy-cicek-siparisi | — | cicek-siparisi | TR (+ /en home) | TR |

### Key URL observations
1. **No single slug pattern wins.** For "send flowers to Kadikoy" / "flower delivery Kadikoy", the results include keyword-stuffed slugs (FAI, Turkey Flowers Shop, Leaf) **and** plain hierarchical slugs (sendflowerstoturkey `/istanbul/kadikoy/florist/`, mondial `/turkey/istanbul/kadikoy.aspx`). Fleurop, MyGlobalFlowers, Aquarelle and Udora all use `/.../istanbul` hierarchy for city pages.
2. **Neighborhood-level pages are rare.** Only sendflowerstoturkey (Bebek, Nişantaşı, 4. Levent), FAI (Levent) and, in Turkish, Çiçeksepeti and Marmara (Fikirtepe, İkitelli) were seen. Those are well-known neighborhoods. No foreign-language neighborhood demand was observed for ordinary mahalles like Caferağa.
3. **District-level pages exist in foreign languages only for EN (many) and RU (2).** None were found for DE, FR, ES, IT, NL, PT, AR (except one Levent page), JA, KO, ZH or AZ.
4. **Non-Latin languages:** every competitor seen for RU and AR uses ASCII slugs, with one exception (an FAI Cyrillic slug). No native-script slugs were seen for JA, KO or ZH.
5. Flower Art Istanbul has **two overlapping Kadıköy pages** in EN, a possible cannibalization pattern. Avoid copying that.

## 3. Recommendation

**Does the evidence support migrating away from `/{lang}/istanbul/{district}` (and `/{lang}/istanbul/{district}/{nbhd}`)? No, not on this evidence.**

- Hierarchical place-only URLs appear in results for both city and district queries (SendFlowersToTurkey, Mondial, Fleurop, MyGlobalFlowers, Aquarelle, Flowwow, Udora). The existing structure is already the same pattern.
- The visible differentiator is **title, H1 and on-page wording** in the language's evidenced phrasing. All ranking pages put that phrase in the `<title>` whatever their URL looks like.
- A migration would move about 1,014 place pages × 13 languages, about 13k URLs, to 301 redirects. That carries real re-indexing risk, and no observed evidence shows a payoff.
- The domain did not appear at all in this index. Fix indexation and hreflang first (verify in GSC), then reassess with real GSC query data.
- Suggested no-migration actions: put the evidenced phrase in title and H1 per language (for example EN "Flower Delivery to Kadıköy, Istanbul | Send Flowers Same Day"; DE "Blumen nach Kadıköy (Istanbul) verschicken"; FR "Livraison de fleurs à Kadıköy, Istanbul"; IT "Consegna fiori a Kadıköy, Istanbul"; NL "Bloemen bezorgen in Kadıköy, Istanbul"; RU "Доставка цветов в Кадыкёй, Стамбул"; AR "توصيل الزهور إلى كاديكوي، إسطنبول"). Consider noindex or consolidation for thin neighborhood pages in languages where no neighborhood-level demand was observed.

**If a migration is done anyway**, use these ASCII slugs with Turkish place names transliterated (kadikoy, besiktas, sisli, caferaga):

| Lang | City | District | Neighborhood | Confidence |
|---|---|---|---|---|
| en | flower-delivery-istanbul | flower-delivery-{district}-istanbul | flower-delivery-{nbhd}-{district}-istanbul | medium |
| de | blumen-verschicken-istanbul | blumen-verschicken-{district}-istanbul | blumen-verschicken-{nbhd}-{district}-istanbul | low-medium |
| fr | livraison-fleurs-istanbul | livraison-fleurs-{district}-istanbul | livraison-fleurs-{nbhd}-{district}-istanbul | medium |
| it | consegna-fiori-istanbul | consegna-fiori-{district}-istanbul | ... | medium |
| nl | bloemen-bezorgen-istanbul | bloemen-bezorgen-{district}-istanbul | ... | medium |
| es | envio-de-flores-estambul (or keep istanbul) | envio-de-flores-{district}-estambul | ... | low |
| pt | entrega-de-flores-istambul | entrega-de-flores-{district}-istambul | ... | low |
| ru | keep /ru/istanbul/{district} (ASCII); alt dostavka-tsvetov-{district}-istanbul | | | low |
| ar | keep /ar/istanbul/{district} (ASCII), or the EN slug | | | low |
| ja, ko, zh, az | keep /{lang}/istanbul/{district} (ASCII) | | | low (no competitor evidence) |

## Sources (URLs observed in search results)
- https://flowwow.com.tr/en/istanbul/ , https://flowwow.com.tr/en/uskudar/ , https://flowwow.com.tr/en/fatih/ , https://flowwow.com.tr/es/istanbul/
- https://www.flowers4istanbul.com/ (+ /ru/ /ar/ /es/ /de/rosen-flower-collection.html)
- https://www.turkeyflowersshop.com/city/istanbul-flower-delivery.html , https://www.turkeyflowersshop.com/cat/istanbul-kadikoy-flower-delivery , https://www.turkeyflowersshop.com/ru/city/istanbul-kagithane-flower-delivery.html
- https://www.sendflowerstoturkey.com/send-flowers-to-istanbul/ , https://www.sendflowerstoturkey.com/istanbul/kadikoy/florist/ , https://www.sendflowerstoturkey.com/istanbul/bebek/florist/ , https://www.sendflowerstoturkey.com/istanbul/nisantasi/florist/ , https://www.sendflowerstoturkey.com/istanbul/4Levent/florist/
- https://www.flowerartistanbul.com/flower-delivery-kadikoy-istanbul/ , https://www.flowerartistanbul.com/send-flowers-to-kadikoy-same-day-free-delivery/ , https://www.flowerartistanbul.com/flower-delivery-besiktas-istanbul/ , https://www.flowerartistanbul.com/flower-delivery-sisli-istanbul/ , https://www.flowerartistanbul.com/ru/flower-delivery-kagithane-istanbul/ , https://www.flowerartistanbul.com/ar/levent-florist-same-day-flower-delivery/ , https://www.flowerartistanbul.com/2020/09/27/blumen-versenden-istanbul/ , https://www.flowerartistanbul.com/send-flowers-to-istanbul-turkey-same-day-free-delivery/
- https://www.ciceksepeti.com/c/istanbul-cicek-siparisi , https://www.ciceksepeti.com/c/kadikoy-cicek-siparisi , https://www.ciceksepeti.com/c/fikirtepe-cicek-siparisi
- https://www.marmaracicek.com/istanbul-cicek-siparisi-gonder , https://www.marmaracicek.com/umraniye-cicekci , https://www.marmaracicek.com/sisli-cicekci , https://www.marmaracicek.com/ikitelli-cicekci , https://www.marmaracicek.com/cicek-gonder
- https://www.mondialflowers.com/flower-delivery/Turkey/Istanbul , https://www.mondialflowers.com/turkey/istanbul/kadikoy.aspx
- https://www.floraqueen.com/collections/flowers-istanbul , https://www.ftd.com/collection/turkey-tr , https://www.flowers.com.tr/send-flowers-to-istanbul , https://www.leaffloweristanbul.com/en/kadikoy-florist-same-day-flower-delivery
- https://www.fleurop.de/fleurop-international/blumen-in-die-tuerkei-schicken/istanbul , https://www.fleurop.nl/en/order-abroad/turkey/istanbul/ , https://www.euroflorist.de/internationaler-blumenversand/tuerkei , https://www.euroflorist.nl/international/turkije , https://myglobalflowers.com/international-flower-delivery/turkey/istanbul , https://felicita-flowers.com/de/delivery-flowers-istanbul
- https://www.interflora.fr/tr/c/0 , https://flower-delivery.aquarelle/turkey/istanbul , https://fiori-a-domicilio.aquarelle/turchia/istanbul , https://entrega-de-flores.aquarelle/turquia/istambul , https://www.gofleurs.com/pays/turquie/livraison-fleurs-istanbul.htm , https://www.gofiori.com/paesi/turchia/consegna-fiori-istanbul.htm , https://www.gobloemen.com/landen/turkije/bloemen-bezorgen-istanbul.htm , https://www.wineflowers.com/consegna-fiori-domicilio-5-ITA-Istanbul-222.html
- https://udora.tr/ru/istanbul/ , https://flori1.com/world/turtsiya/stambul-4543/ , https://www.s-fl.ru/dostavka/Stambul , https://istanbul.cyber-florist.ru/ , https://dtf.ru/luchshii-rating/3543776-dostavka-cvetov-v-stambule-top-5-luchshih-servisov-gde-zakazat-onlain
- https://mugeflowers.com/ar , https://citioapp.com/en/istanbul-75943/flower-orders-143af/heart-beat-b390b
- https://www.i879.com/global/ , https://www.hanaokuri.com/country/ , https://www.lgreen-flower.com/ , https://sense-flower.com/ , https://gulsifarisi.az/
