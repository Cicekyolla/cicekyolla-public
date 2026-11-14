// components/DeliveryFactsNote.tsx — TESLİMAT BİLGİ NOTU (14 Kas 2026, ADDITIVE).
// Yalnız 6 sayfada kullanılır (bkz. lib/deliveryFacts.ts). Saat/ücret motordan; okunamazsa not basılmaz.
import { fetchDeliveryRange, type DeliveryArea, type DeliveryRange } from "@/lib/deliveryFacts";

type NoteLocale = "tr" | "en" | "de";
type NoteVariant = "pillar" | "global" | "home";

const span = (r: DeliveryRange) => (r.earliest === r.latest ? r.earliest : `${r.earliest}–${r.latest}`);
const fee = (minor: number) => `₺${(minor / 100).toLocaleString("tr-TR")}`;

const COPY = {
  tr: {
    districtTitle: (place: string) => `${place} için aynı gün teslimat`,
    district: (place: string, r: DeliveryRange) =>
      `${place} için son sipariş saati mahalleye göre ${span(r)} (İstanbul saati).` +
      (r.feeMinor != null ? ` Teslimat ücreti: ${fee(r.feeMinor)}.` : "") +
      " Kesin saat ve ücret, adres girildiğinde ödeme adımında gösterilir.",
    cityTitle: "İstanbul içi aynı gün teslimat",
    city: (m: DeliveryRange, k: DeliveryRange, b: DeliveryRange) =>
      `Son sipariş saati adresin atölyemize uzaklığına göre değişir: Maltepe ${span(m)}, Kadıköy ${span(k)}, Beşiktaş ${span(b)} (İstanbul saati). Kesin saat ve teslimat ücreti, adres girildiğinde ödeme adımında gösterilir.`,
    abroad: "Yurt dışından da sipariş verebilirsiniz: yurt dışında çıkarılmış Visa ve Mastercard kartlarla ödeme alınır, tahsilat Türk lirasıdır.",
  },
  en: {
    districtTitle: (place: string) => `Same-day delivery to ${place}`,
    district: (place: string, r: DeliveryRange) =>
      `Order by ${span(r)} Istanbul time (GMT+3) for same-day delivery in ${place}; the cut-off depends on the neighbourhood.` +
      (r.feeMinor != null ? ` Delivery fee: ${fee(r.feeMinor)}.` : "") +
      " The exact cut-off and fee for the address are shown at checkout.",
    cityTitle: "Same-day delivery in Istanbul",
    city: (m: DeliveryRange, k: DeliveryRange, b: DeliveryRange) =>
      `The order cut-off depends on the address's distance from our atelier: Maltepe ${span(m)}, Kadıköy ${span(k)}, Beşiktaş ${span(b)} (Istanbul time, GMT+3). The exact cut-off and delivery fee for the address are shown at checkout.`,
    abroad: "You can order from abroad: Visa and Mastercard cards issued outside Turkey are accepted, and payment is charged in Turkish lira.",
  },
  de: {
    districtTitle: (place: string) => `Taggleiche Lieferung nach ${place}`,
    district: (place: string, r: DeliveryRange) =>
      `Bestellschluss für ${place}: ${span(r)} Uhr Istanbuler Zeit (GMT+3), je nach Stadtteil.` +
      (r.feeMinor != null ? ` Liefergebühr: ${fee(r.feeMinor)}.` : "") +
      " Genaue Uhrzeit und Gebühr für die Adresse sehen Sie im Checkout.",
    cityTitle: "Taggleiche Lieferung in Istanbul",
    city: (m: DeliveryRange, k: DeliveryRange, b: DeliveryRange) =>
      `Der Bestellschluss hängt von der Entfernung der Adresse zu unserem Atelier ab: Maltepe ${span(m)} Uhr, Kadıköy ${span(k)} Uhr, Beşiktaş ${span(b)} Uhr (Istanbuler Zeit, GMT+3). Genaue Uhrzeit und Liefergebühr für die Adresse sehen Sie im Checkout.`,
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
 * district verilirse o ilçenin aralığı (ilçe sayfaları); verilmezse İstanbul özeti (Maltepe/Kadıköy/Beşiktaş örnekleri).
 * abroad: yurt dışından sipariş + yabancı kart cümlesi (TR ana sayfa ve iki DE sayfası).
 */
export async function DeliveryFactsNote({ locale, variant, district, place, abroad = false }: {
  locale: NoteLocale; variant: NoteVariant; district?: Exclude<DeliveryArea, "maltepe">; place?: string; abroad?: boolean;
}) {
  const c = COPY[locale];
  let title: string;
  let body: string;
  if (district) {
    const r = await fetchDeliveryRange(district);
    if (!r || !place) return null;
    title = c.districtTitle(place);
    body = c.district(place, r);
  } else {
    const [m, k, b] = await Promise.all([fetchDeliveryRange("maltepe"), fetchDeliveryRange("kadikoy"), fetchDeliveryRange("besiktas")]);
    if (!m || !k || !b) return abroad ? <aside className={BOX[variant]} data-delivery-facts="abroad"><p>{c.abroad}</p></aside> : null;
    title = c.cityTitle;
    body = c.city(m, k, b);
  }
  return (
    <aside className={BOX[variant]} data-delivery-facts={district ?? "istanbul"}>
      <p className={TITLE[variant]}>{title}</p>
      <p className="mt-1">{body}</p>
      {abroad ? <p className="mt-1">{c.abroad}</p> : null}
    </aside>
  );
}
