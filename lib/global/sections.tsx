// ============================================================================
// GLOBAL VİTRİN — Figma final bölümleri (duygu hiyerarşisi).
// Lokasyon sayfasındaki SIRA burada değil: lib/global/locationSections.ts
// (Admin → storefront structure.locationSections; varsayılan Hero → Güven →
// Ürünler → Kategoriler → Duygu → Yorumlar → Hikâye → Lokasyonlar → İçerik → CTA).
//
// KURAL: Bu dosya YALNIZ sunum katmanıdır. Ürün/kategori/fiyat/sayı DAİMA
// production motorundan (localeCatalog) gelir; burada hard-code ürün YOKTUR.
// Fotoğraflar Figma final seçimleridir (public/global/*.jpg).
// ============================================================================
import Link from "next/link";
import Image from "next/image";
import { DIR, SEGMENTS, type GlobalLocale } from "./config";
import { STORY, FEEL_IMAGES } from "./story";
import { CARGO } from "./cargoCopy";
import { REACH, FAR } from "./reachCopy";
import { cityDisplayName } from "./locationLabels";
import type { LocaleCatalog } from "./api";
import { LocalTimeHint } from "@/components/global/LocalTimeHint";

const WA = "https://wa.me/905458813450";

/** Bölüm kabı — editorial genişlik, bol whitespace. Yan boşluk YOK: tüm çağıranlar zaten
    `max-w-6xl px-4` <main> içinde (çift 16px iç boşluk ürün ızgarasıyla hizayı bozuyordu). */
function Wrap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto w-full max-w-6xl px-0 ${className}`}>{children}</section>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.28em] text-[#C4974A]">{children}</p>
  );
}

/** Editorial serif başlık — Fraunces ailesi (marka fontu). */
function Serif({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`font-serif text-[26px] leading-[1.18] text-[#1A1830] sm:text-[32px] md:text-[38px] ${className}`}>{children}</h2>;
}

// ---------------------------------------------------------------------------
// 1) HERO ALTI GÜVEN ŞERİDİ — yalnız gerçekten sunduğumuz sözler
// ---------------------------------------------------------------------------
export function TrustStrip({ locale }: { locale: GlobalLocale }) {
  const t = STORY[locale].trust;
  const items = [t.local, t.hand, t.pay, t.proof];
  return (
    <Wrap className="mt-8">
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-[20px] border border-[#EFE9E1] bg-white/70 px-5 py-5 md:grid-cols-4 md:px-7">
        {items.map(([head, sub], i) => (
          <div key={i}>
            <p className="text-[13px] font-bold text-[#1A1830]">{head}</p>
            <p className="mt-0.5 text-[11.5px] leading-[1.45] text-[#6B6478]">{sub}</p>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

/**
 * KARGO DESTİNASYONU güven şeridi (Antalya/Muğla/İzmir) — aynı görsel dil,
 * farklı sözler: kurye ile 1–3 iş günü, Türkiye'de hazırlanır, uluslararası
 * kart, mesaj kartı. Aynı gün / saat / atölye ziyareti vaadi YOK (cargoCopy).
 */
export function CargoTrustStrip({ locale, city, label }: { locale: GlobalLocale; city: string;
  /** ADDITIVE: şehir eksonimi yerine basılacak ad (band dışı İstanbul ilçesi: ilçe adı). */
  label?: string }) {
  const items = CARGO[locale].trust(label ?? cityDisplayName(locale, city));
  return (
    <Wrap className="mt-8">
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-[20px] border border-[#EFE9E1] bg-white/70 px-5 py-5 md:grid-cols-4 md:px-7" data-cargo-trust>
        {items.map(([head, sub], i) => (
          <div key={i}>
            <p className="text-[13px] font-bold text-[#1A1830]">{head}</p>
            <p className="mt-0.5 text-[11.5px] leading-[1.45] text-[#6B6478]">{sub}</p>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

/**
 * SINIR / BELİRSİZ ERİŞİM güven şeridi (İstanbul'un band kenarındaki ya da motorun çözemediği
 * ilçe/mahallesi): aynı gün VAADİ YOK, "ödemede doğrulanır" dili; ürünler kapatılmaz (reachCopy).
 */
/** UZAK BÖLGE güven şeridi (API 108, reach 'far'): eşik ve üzeri ürünlerde koşullu özel araç + kargo; vaat yok. */
export function FarTrustStrip({ locale, place, threshold }: { locale: GlobalLocale; place: string; threshold: string }) {
  const items = FAR[locale].trust(place, threshold);
  return (
    <Wrap className="mt-8">
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-[20px] border border-[#EFE9E1] bg-white/70 px-5 py-5 md:grid-cols-4 md:px-7" data-far-trust>
        {items.map(([head, sub], i) => (
          <div key={i}>
            <p className="text-[13px] font-bold text-[#1A1830]">{head}</p>
            <p className="mt-0.5 text-[11.5px] leading-[1.45] text-[#6B6478]">{sub}</p>
          </div>
        ))}
      </div>
    </Wrap>
  );
}
export function NeutralTrustStrip({ locale, place }: { locale: GlobalLocale; place: string }) {
  const items = REACH[locale].trust(place);
  return (
    <Wrap className="mt-8">
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-[20px] border border-[#EFE9E1] bg-white/70 px-5 py-5 md:grid-cols-4 md:px-7" data-neutral-trust>
        {items.map(([head, sub], i) => (
          <div key={i}>
            <p className="text-[13px] font-bold text-[#1A1830]">{head}</p>
            <p className="mt-0.5 text-[11.5px] leading-[1.45] text-[#6B6478]">{sub}</p>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

// ---------------------------------------------------------------------------
// 2) DUYGU İLE SEÇİM — "Ne hissetmesini istersiniz?"
//    Her kart, o dilde CANLI ürünü olan bir kategoriye gider (veri yoksa kart yok).
//    categorySlugs verilirse (lokasyon sayfası, katalog modu) hedefler YALNIZ o
//    lokasyonda teslim edilebilir ürünü olan kategorilerdir; verilmezse bugünkü davranış.
// ---------------------------------------------------------------------------
export function EmotionSection({ locale, catalog, categorySlugs }: { locale: GlobalLocale; catalog: LocaleCatalog; categorySlugs?: readonly string[] }) {
  const s = STORY[locale].emotion;
  const seg = SEGMENTS[locale];
  const dolu = categorySlugs ? [...categorySlugs] : catalog.categories.filter((c) => (c.live_products ?? 0) > 0).map((c) => c.slug);
  if (!dolu.length) return null;
  // Duygu → kategori: sırayla dağıtılır (yeni veri sistemi kurulmaz, mevcut kategoriler kullanılır).
  const feels = s.feels.map((f, i) => ({
    ...f,
    img: FEEL_IMAGES[i % FEEL_IMAGES.length],
    href: `/${locale}/${seg.category}/${dolu[i % dolu.length]}`,
  }));
  return (
    <Wrap className="mt-16 md:mt-24">
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <Serif>{s.title}</Serif>
      <p className="mt-3 max-w-[560px] text-[14.5px] leading-[1.6] text-[#6B6478]">{s.sub}</p>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
        {feels.map((f) => (
          <Link
            key={f.label}
            href={f.href}
            className="group relative overflow-hidden rounded-[16px] border border-[#EFE9E1] bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(26,24,48,0.10)]"
          >
            <div className="relative aspect-[2/3] overflow-hidden">
              <Image src={f.img} alt="" fill sizes="(max-width:640px) 45vw, 200px" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A1830]/70 via-[#1A1830]/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="text-[13.5px] font-bold text-white">{f.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-white/85">{f.quote}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Wrap>
  );
}

// ---------------------------------------------------------------------------
// 3) UZAKLIK → YAKINLIK (3 editorial kare)
// ---------------------------------------------------------------------------
export function DistanceSection({ locale }: { locale: GlobalLocale }) {
  const s = STORY[locale].distance;
  const imgs = ["/global/distance-window.jpg", "/global/distance-atelier.jpg", "/global/proof-receiving.jpg"];
  return (
    <Wrap className="mt-16 md:mt-24">
      <div className="rounded-[26px] bg-[#F5F1EB] px-5 py-10 md:px-10 md:py-14">
        <Serif className="max-w-[620px]">
          {s.title[0]}
          <br />
          <span className="text-[#5C3D8F]">{s.title[1]}</span>
        </Serif>
        <p className="mt-4 max-w-[600px] text-[14.5px] leading-[1.65] text-[#5A5366]">{s.sub}</p>
        <div className="mt-9 grid gap-4 md:grid-cols-3 md:gap-5">
          {s.steps.map(([head, sub], i) => (
            <figure key={i} className="overflow-hidden rounded-[18px] bg-white">
              <div className="relative aspect-[4/3]">
                <Image src={imgs[i]} alt="" fill sizes="(max-width:768px) 100vw, 340px" className="object-cover" />
              </div>
              <figcaption className="px-4 py-3.5">
                <p className="text-[14px] font-semibold leading-snug text-[#1A1830]">{head}</p>
                <p className="mt-0.5 text-[11.5px] uppercase tracking-[0.12em] text-[#9A93A6]">{sub}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </Wrap>
  );
}

// ---------------------------------------------------------------------------
// 4) İNSAN KANITI — İstanbul atölyesi (yerel florist gerçeği)
// ---------------------------------------------------------------------------
export function AtelierSection({ locale }: { locale: GlobalLocale }) {
  const s = STORY[locale].atelier;
  return (
    <Wrap className="mt-16 md:mt-24">
      <div className="grid items-center gap-7 md:grid-cols-2 md:gap-12">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] md:aspect-[5/6]">
          <Image src="/global/atelier-hands.jpg" alt="" fill sizes="(max-width:768px) 100vw, 520px" className="object-cover" />
        </div>
        <div>
          <Eyebrow>{s.eyebrow}</Eyebrow>
          <Serif>
            {s.title[0]}
            <br />
            {s.title[1]}
          </Serif>
          <p className="mt-4 text-[14.5px] leading-[1.7] text-[#5A5366]">{s.body}</p>
          <ul className="mt-6 space-y-2.5">
            {s.points.map((p) => (
              <li key={p} className="flex gap-2.5 text-[13.5px] leading-[1.5] text-[#1A1830]">
                <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#C4974A]" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Wrap>
  );
}

// ---------------------------------------------------------------------------
// 5) WHATSAPP CONCIERGE — ikon değil, kişisel florist satış kanalı
//    Mevcut WhatsApp hattına bağlanır; Cloud API zincirine dokunulmaz.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// RELEASE 3 — KESME SAATİ ŞERİDİ (niyet sayfaları): Delivery Motor'un ilçe kararı + bandın gerçek kesme saati.
// Rakam UYDURULMAZ: saat yalnız API /reach cutoff_time'dan; 'mixed'/'unknown' → "ödemede doğrulanır";
// 'out'/'far' → kurye vaadi yok. Ziyaretçi saat dilimi istemcide (LocalTimeHint) gösterilir.
// ---------------------------------------------------------------------------
export interface CutoffRow { district: string; name: string; reach: string; cutoff_time: string | null }
const CUTOFF_COPY: Record<GlobalLocale, { title: string; note: string; until: string; checkout: string; noSameDay: string; tz: string }> = {
  en: { title: "Same-day order cut-off by district", note: "Istanbul time (GMT+3). Read from our delivery engine; the exact option for the recipient's address is shown at checkout.", until: "order until {time}", checkout: "confirmed at checkout for the address", noSameDay: "no same-day courier", tz: "Istanbul" },
  de: { title: "Bestellschluss für Same-Day nach Bezirk", note: "Istanbuler Zeit (GMT+3). Aus unserer Liefer-Engine; die genaue Option für die Adresse erscheint im Checkout.", until: "bestellen bis {time}", checkout: "wird im Checkout für die Adresse bestätigt", noSameDay: "kein Same-Day-Kurier", tz: "Istanbul" },
  fr: { title: "Heure limite de commande pour le jour même, par arrondissement", note: "Heure d'Istanbul (GMT+3). Lue depuis notre moteur de livraison ; l'option exacte pour l'adresse s'affiche au paiement.", until: "commander avant {time}", checkout: "confirmé au paiement pour l'adresse", noSameDay: "pas de coursier le jour même", tz: "Istanbul" },
  nl: { title: "Bestel-deadline voor bezorging dezelfde dag, per district", note: "Tijd in Istanbul (GMT+3). Uit onze bezorgengine; de exacte optie voor het adres verschijnt bij het afrekenen.", until: "bestellen tot {time}", checkout: "bij het afrekenen bevestigd voor het adres", noSameDay: "geen koerier dezelfde dag", tz: "Istanbul" },
  it: { title: "Orario limite per la consegna in giornata, per distretto", note: "Ora di Istanbul (GMT+3). Letta dal nostro motore di consegna; l'opzione esatta per l'indirizzo appare al pagamento.", until: "ordina entro le {time}", checkout: "confermato al pagamento per l'indirizzo", noSameDay: "nessun corriere in giornata", tz: "Istanbul" },
  es: { title: "Hora límite de pedido para entrega el mismo día, por distrito", note: "Hora de Estambul (GMT+3). Leída de nuestro motor de entregas; la opción exacta para la dirección se muestra al pagar.", until: "pide antes de las {time}", checkout: "se confirma al pagar para la dirección", noSameDay: "sin mensajería el mismo día", tz: "Estambul" },
  pt: { title: "Hora limite de encomenda para entrega no mesmo dia, por distrito", note: "Hora de Istambul (GMT+3). Lida do nosso motor de entregas; a opção exata para a morada aparece no pagamento.", until: "encomende até às {time}", checkout: "confirmado no pagamento para a morada", noSameDay: "sem estafeta no mesmo dia", tz: "Istambul" },
  az: { title: "Rayon üzrə eyni gün sifariş son saatı", note: "İstanbul vaxtı (GMT+3). Çatdırılma mühərrikimizdən oxunur; ünvan üçün dəqiq seçim ödəniş zamanı göstərilir.", until: "{time}-a qədər sifariş", checkout: "ünvan üçün ödənişdə təsdiqlənir", noSameDay: "eyni gün kuryer yoxdur", tz: "İstanbul" },
  ru: { title: "Время приёма заказов на доставку в тот же день, по районам", note: "Время Стамбула (GMT+3). Данные нашей системы доставки; точный вариант для адреса показывается при оформлении.", until: "заказ до {time}", checkout: "подтверждается при оформлении для адреса", noSameDay: "курьера в тот же день нет", tz: "Стамбул" },
  ar: { title: "آخر موعد للطلب للتوصيل في نفس اليوم حسب المنطقة", note: "بتوقيت إسطنبول (GMT+3). من محرك التوصيل لدينا؛ الخيار الدقيق للعنوان يظهر عند الدفع.", until: "اطلب حتى {time}", checkout: "يُؤكَّد عند الدفع للعنوان", noSameDay: "لا توصيل بالمندوب في نفس اليوم", tz: "إسطنبول" },
  zh: { title: "各区当日送达下单截止时间", note: "伊斯坦布尔时间（GMT+3）。来自我们的配送引擎；收件地址的准确选项在结账时显示。", until: "{time} 前下单", checkout: "结账时按地址确认", noSameDay: "无当日专人配送", tz: "伊斯坦布尔" },
  ja: { title: "地区別・当日配達の注文締切", note: "イスタンブール時間（GMT+3）。当店の配送エンジンの値です。お届け先住所の正確な選択肢はお会計時に表示されます。", until: "{time} までのご注文", checkout: "お会計時に住所で確認", noSameDay: "当日配達なし", tz: "イスタンブール" },
  ko: { title: "구역별 당일 배송 주문 마감", note: "이스탄불 시간(GMT+3). 배송 엔진 기준이며, 수령 주소의 정확한 옵션은 결제 시 표시됩니다.", until: "{time}까지 주문", checkout: "결제 시 주소 기준으로 확인", noSameDay: "당일 배송 없음", tz: "이스탄불" },
};
const hhmm = (t: string | null) => (t && /^\d{2}:\d{2}/.test(t) ? t.slice(0, 5) : null);

export function CutoffStrip({ locale, rows }: { locale: GlobalLocale; rows: CutoffRow[] }) {
  const c = CUTOFF_COPY[locale];
  const usable = rows.filter((r) => r.name);
  if (!usable.length) return null;
  return (
    <section className="mt-8 rounded-[18px] border border-[#EFE9E1] bg-[#FBFAF7] px-5 py-5" data-cutoff-strip>
      <h2 className="text-[16px] font-semibold text-[#1C0838]">{c.title}</h2>
      <p className="mt-1 text-[12.5px] text-[#6B7280]">{c.note}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {usable.map((r) => {
          const t = hhmm(r.cutoff_time);
          const sameDay = r.reach === "in" && t;
          const label = sameDay ? c.until.replace("{time}", t!) : (r.reach === "mixed" || r.reach === "unknown") ? c.checkout : c.noSameDay;
          return (
            <li key={r.district} className="flex flex-wrap items-baseline gap-x-2 rounded-[12px] bg-white px-3 py-2 text-[13px] text-[#1F2937]" data-reach={r.reach}>
              <span className="font-semibold">{r.name}</span>
              <span className="text-[#4B5563]"><bdi dir="ltr">{label}</bdi></span>
              {sameDay ? <LocalTimeHint istanbulTime={t!} className="text-[11.5px] text-[#9A93A6]" /> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** RELEASE 3: niyet sayfaları WhatsApp bağlantısına sayfa bağlamını (H1) hazır mesaj olarak ekler; verilmezse bugünkü düz link. */
export function waHref(text?: string): string {
  return text && text.trim() ? `${WA}?text=${encodeURIComponent(text.trim())}` : WA;
}

export function ConciergeSection({ locale, waText }: { locale: GlobalLocale; waText?: string }) {
  const s = STORY[locale].concierge;
  const rtl = DIR[locale] === "rtl";
  return (
    <Wrap className="mt-16 md:mt-24">
      <div className="overflow-hidden rounded-[26px] border border-[#EFE9E1] bg-white">
        <div className="grid md:grid-cols-[1.2fr_1fr]">
          {/* ~%60 gerçek florist fotoğrafı */}
          <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[420px]">
            <Image src="/global/florist-portrait.jpg" alt="" fill sizes="(max-width:768px) 100vw, 640px" className="object-cover" />
          </div>
          {/* ~%40 konuşma / satış alanı */}
          <div className="flex flex-col justify-center px-5 py-8 md:px-8">
            <Eyebrow>{s.eyebrow}</Eyebrow>
            <Serif className="!text-[24px] md:!text-[30px]">
              {s.title[0]}
              <br />
              {s.title[1]}
            </Serif>
            <p className="mt-3 text-[14px] leading-[1.6] text-[#5A5366]">{s.sub}</p>

            <div className="mt-6 rounded-[18px] bg-[#F7F5F1] p-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#25D366] text-[13px] font-bold text-white">ÇY</span>
                <div>
                  <p className="text-[12.5px] font-bold text-[#1A1830]">{s.chatName}</p>
                  <p className="text-[10.5px] text-[#25D366]">{s.chatStatus}</p>
                </div>
              </div>
              <div className={`mt-3 space-y-2 ${rtl ? "text-right" : ""}`}>
                <p className="ms-auto w-fit max-w-[85%] rounded-[14px] bg-[#DCF8C6] px-3 py-2 text-[12.5px] leading-snug text-[#1A1830]">{s.chatUser}</p>
                <p className="w-fit max-w-[90%] rounded-[14px] bg-white px-3 py-2 text-[12.5px] leading-snug text-[#1A1830] shadow-sm">{s.chatFlorist}</p>
              </div>
            </div>

            <a
              href={waHref(waText)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-[13.5px] font-bold text-white transition hover:brightness-95"
            >
              {s.cta}
            </a>
            <p className="mt-2.5 text-[11.5px] text-[#9A93A6]">{s.note}</p>
          </div>
        </div>
      </div>
    </Wrap>
  );
}

// ---------------------------------------------------------------------------
// 6) TESLİMAT KANITI — "Geldiğini bileceksiniz" (3 adım)
// ---------------------------------------------------------------------------
export function DeliveryProofSection({ locale }: { locale: GlobalLocale }) {
  const s = STORY[locale].proof;
  return (
    <Wrap className="mt-16 md:mt-24">
      <div className="overflow-hidden rounded-[26px] bg-[#1E1528] text-white">
        <div className="relative aspect-[16/7] w-full">
          <Image src="/global/moment-presenting.jpg" alt="" fill sizes="100vw" className="object-cover opacity-[0.72]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E1528] via-[#1E1528]/45 to-transparent" />
          <p className="absolute inset-x-0 bottom-0 px-5 pb-5 text-[13px] italic leading-snug text-white/85 md:px-10 md:pb-7 md:text-[15px]">
            {s.quote}
          </p>
        </div>
        <div className="px-5 py-9 md:px-10 md:py-12">
          <Eyebrow>{s.eyebrow}</Eyebrow>
          <h2 className="font-serif text-[26px] leading-tight text-white md:text-[34px]">{s.title}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3 md:gap-8">
            {s.steps.map((st) => (
              <div key={st.n}>
                <p className="font-serif text-[22px] text-[#C4974A]">{st.n}</p>
                <p className="mt-1.5 text-[14.5px] font-semibold text-white">{st.t}</p>
                <p className="mt-1 text-[12.5px] leading-[1.6] text-white/70">{st.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {["/global/proof-ready.jpg", "/global/proof-giftbox.jpg"].map((src) => (
              <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-[16px]">
                <Image src={src} alt="" fill sizes="(max-width:640px) 100vw, 420px" className="object-cover" />
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11.5px] uppercase tracking-[0.14em] text-white/55">{s.caption}</p>
        </div>
      </div>
    </Wrap>
  );
}

// ---------------------------------------------------------------------------
// 7) KART MESAJI — bazen mesaj çiçek kadar önemlidir
// ---------------------------------------------------------------------------
export function MessageSection({ locale }: { locale: GlobalLocale }) {
  const s = STORY[locale].message;
  return (
    <Wrap className="mt-16 md:mt-24">
      <div className="grid items-center gap-7 md:grid-cols-2 md:gap-12">
        <div>
          <Eyebrow>{s.eyebrow}</Eyebrow>
          <Serif>
            {s.title[0]}
            <br />
            {s.title[1]}
          </Serif>
          <blockquote className="mt-5 border-s-2 border-[#C4974A] ps-4 font-serif text-[17px] leading-[1.6] text-[#1A1830] md:text-[19px]">
            {s.quote}
          </blockquote>
          <p className="mt-4 text-[11.5px] uppercase tracking-[0.14em] text-[#9A93A6]">{s.note}</p>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-[24px]">
          <Image src="/global/message-card.jpg" alt="" fill sizes="(max-width:768px) 100vw, 520px" className="object-cover" />
        </div>
      </div>
    </Wrap>
  );
}

// ---------------------------------------------------------------------------
// 8) KAPANIŞ — bugün hatırlandığını hissettirin
// ---------------------------------------------------------------------------
export function FinalCta({ locale, catalog, waText }: { locale: GlobalLocale; catalog: LocaleCatalog; waText?: string }) {
  const s = STORY[locale].final;
  const seg = SEGMENTS[locale];
  const ilk = catalog.categories.find((c) => (c.live_products ?? 0) > 0);
  const shopHref = ilk ? `/${locale}/${seg.category}/${ilk.slug}` : `/${locale}`;
  return (
    <Wrap className="mt-16 md:mt-24">
      <div className="relative overflow-hidden rounded-[26px]">
        <div className="relative aspect-[4/5] w-full sm:aspect-[16/9] md:aspect-[21/8]">
          <Image src="/global/hero-atelier.jpg" alt="" fill sizes="100vw" className="object-cover" priority={false} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1830]/85 via-[#1A1830]/45 to-[#1A1830]/10" />
        </div>
        <div className="absolute inset-x-0 bottom-0 px-5 pb-7 md:px-10 md:pb-10">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.28em] text-[#E8C98A]">{s.eyebrow}</p>
          <h2 className="font-serif text-[24px] leading-[1.18] text-white md:text-[34px]">
            {s.title[0]}
            <br />
            {s.title[1]}
          </h2>
          <p className="mt-3 max-w-[520px] text-[13.5px] leading-[1.6] text-white/85">{s.sub}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={shopHref} className="rounded-full bg-white px-6 py-3 text-[13.5px] font-bold text-[#5C3D8F] transition hover:bg-white/90">
              {s.cta}
            </Link>
            <a href={waHref(waText)} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/60 px-6 py-3 text-[13.5px] font-bold text-white transition hover:bg-white/10">
              {s.ctaAlt}
            </a>
          </div>
        </div>
      </div>
    </Wrap>
  );
}
