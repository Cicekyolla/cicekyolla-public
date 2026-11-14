// components/DeliveryFactsNote.tsx — TESLİMAT BİLGİ NOTU (14 Kas 2026, ADDITIVE).
// Saatler işletme sahibinin yaka kuralından (lib/istanbulYakaKurali.ts); ilçe notu yalnız motor
// ilçeyi standart kurye kapsamında sayıyor ve daha erken kapatmıyorsa basılır (aksi: ödeme adımı geçerli).
import { fetchMotorIlceKarari } from "@/lib/deliveryFacts";
import { YAKA_KURALI, yakaBilgisi, type YakaBilgisi } from "@/lib/istanbulYakaKurali";

type NoteLocale = "tr" | "en" | "de";
type NoteVariant = "pillar" | "global" | "home";

const A = YAKA_KURALI.anadolu;
const E = YAKA_KURALI.avrupa;

const COPY = {
  tr: {
    districtTitle: (place: string) => `${place} için aynı gün teslimat`,
    cutoff: (b: YakaBilgisi) => `Aynı gün teslimat için son sipariş saati: ${b.siparisSonSaat} (${b.yaka === "anadolu" ? "Anadolu Yakası" : "Avrupa Yakası"}, İstanbul saati).`,
    delivery: (b: { teslimatSonSaat: string }) => `Teslimatlar saat ${b.teslimatSonSaat}'ye kadar yapılabilir.`,
    cityTitle: "İstanbul içi aynı gün teslimat",
    cityCutoff: `Aynı gün teslimat için son sipariş saati: Anadolu Yakası ${A.siparisSonSaat}, Avrupa Yakası ${E.siparisSonSaat} (İstanbul saati).`,
    caveat: "Çok uzak adreslerde ve özel araç gerektiren teslimatlarda uygunluk, adres girildiğinde ödeme adımında belirlenir.",
    abroad: "Yurt dışından da sipariş verebilirsiniz: yurt dışında çıkarılmış Visa ve Mastercard kartlarla ödeme alınır, tahsilat Türk lirasıdır.",
  },
  en: {
    districtTitle: (place: string) => `Same-day delivery to ${place}`,
    cutoff: (b: YakaBilgisi) => `Last order time for same-day delivery: ${b.siparisSonSaat} (${b.yaka === "anadolu" ? "Asian side" : "European side"}, Istanbul time).`,
    delivery: (b: { teslimatSonSaat: string }) => `Deliveries can be made until ${b.teslimatSonSaat}.`,
    cityTitle: "Same-day delivery in Istanbul",
    cityCutoff: `Last order time for same-day delivery: Asian side ${A.siparisSonSaat}, European side ${E.siparisSonSaat} (Istanbul time).`,
    caveat: "For very distant addresses and deliveries that need a special vehicle, availability is checked for the address at checkout.",
    abroad: "You can order from abroad: Visa and Mastercard cards issued outside Turkey are accepted, and payment is charged in Turkish lira.",
  },
  de: {
    districtTitle: (place: string) => `Taggleiche Lieferung nach ${place}`,
    cutoff: (b: YakaBilgisi) => `Bestellschluss für die Lieferung am selben Tag: ${b.siparisSonSaat} Uhr (${b.yaka === "anadolu" ? "asiatische Seite" : "europäische Seite"}, Istanbuler Zeit).`,
    delivery: (b: { teslimatSonSaat: string }) => `Zustellungen sind bis ${b.teslimatSonSaat} Uhr möglich.`,
    cityTitle: "Taggleiche Lieferung in Istanbul",
    cityCutoff: `Bestellschluss für die Lieferung am selben Tag: asiatische Seite ${A.siparisSonSaat} Uhr, europäische Seite ${E.siparisSonSaat} Uhr (Istanbuler Zeit).`,
    caveat: "Bei sehr weit entfernten Adressen und Lieferungen mit Sonderfahrzeug wird die Verfügbarkeit im Checkout für die Adresse geprüft.",
    abroad: "Sie können aus Deutschland und dem Ausland bestellen: Im Ausland ausgegebene Visa- und Mastercard-Karten werden akzeptiert, abgerechnet wird in Türkischer Lira.",
  },
} as const;

const BOX: Record<NoteVariant, string> = {
  pillar: "mt-10 max-w-3xl rounded-[22px] border border-[#ebe7f2] bg-white p-6 text-[15px] leading-7 text-[#475467] shadow-[0_14px_45px_rgba(45,22,72,.05)]",
  global: "mt-6 max-w-[720px] rounded-[18px] border border-[#EFE9E1] bg-[#FBFAF7] px-5 py-4 text-[13.5px] leading-6 text-[#374151]",
  home: "mx-auto my-6 w-[calc(100%-2rem)] max-w-[1180px] rounded-[18px] border border-[#ebe7f2] bg-white px-5 py-4 text-[14px] leading-6 text-[#475467]",
};
const TITLE: Record<NoteVariant, string> = {
  pillar: "font-bold text-[#111827]",
  global: "text-[15px] font-semibold text-[#1C0838]",
  home: "font-semibold text-[#111827]",
};

/**
 * district verilirse o ilçenin yaka bilgisi (ilçe/mahalle sayfaları; motor kontrolü geçmezse null);
 * verilmezse İstanbul özeti (iki yaka). abroad: yurt dışından sipariş + yabancı kart cümlesi.
 */
export async function DeliveryFactsNote({ locale, variant, district, place, abroad = false }: {
  locale: NoteLocale; variant: NoteVariant; district?: string; place?: string; abroad?: boolean;
}) {
  const c = COPY[locale];
  if (district) {
    if (!place) return null;
    const bilgi = yakaBilgisi(district, await fetchMotorIlceKarari(district));
    if (!bilgi) return null;
    return (
      <aside className={BOX[variant]} data-delivery-facts={district} data-yaka={bilgi.yaka}>
        <p className={TITLE[variant]}>{c.districtTitle(place)}</p>
        <p className="mt-1">{c.cutoff(bilgi)}</p>
        <p className="mt-1">{c.delivery(bilgi)}</p>
        <p className="mt-1">{c.caveat}</p>
      </aside>
    );
  }
  return (
    <aside className={BOX[variant]} data-delivery-facts="istanbul">
      <p className={TITLE[variant]}>{c.cityTitle}</p>
      <p className="mt-1">{c.cityCutoff}</p>
      <p className="mt-1">{c.delivery(A)}</p>
      <p className="mt-1">{c.caveat}</p>
      {abroad ? <p className="mt-1">{c.abroad}</p> : null}
    </aside>
  );
}
