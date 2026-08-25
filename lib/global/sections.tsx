// ============================================================================
// GLOBAL VİTRİN — Figma final bölümleri (duygu hiyerarşisi).
// Sıra: Hero → Güven → Duygu → Kategori → Ürün → Uzaklık → Atölye →
//       WhatsApp Concierge → Teslimat kanıtı → Mesaj → Kapanış CTA
//
// KURAL: Bu dosya YALNIZ sunum katmanıdır. Ürün/kategori/fiyat/sayı DAİMA
// production motorundan (localeCatalog) gelir; burada hard-code ürün YOKTUR.
// Fotoğraflar Figma final seçimleridir (public/global/*.jpg).
// ============================================================================
import Link from "next/link";
import Image from "next/image";
import { DIR, SEGMENTS, type GlobalLocale } from "./config";
import { STORY, FEEL_IMAGES } from "./story";
import type { LocaleCatalog } from "./api";

const WA = "https://wa.me/905458813450";

/** Bölüm kabı — editorial genişlik, bol whitespace. */
function Wrap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto w-full max-w-6xl px-4 ${className}`}>{children}</section>;
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

// ---------------------------------------------------------------------------
// 2) DUYGU İLE SEÇİM — "Ne hissetmesini istersiniz?"
//    Her kart, o dilde CANLI ürünü olan bir kategoriye gider (veri yoksa kart yok).
// ---------------------------------------------------------------------------
export function EmotionSection({ locale, catalog }: { locale: GlobalLocale; catalog: LocaleCatalog }) {
  const s = STORY[locale].emotion;
  const seg = SEGMENTS[locale];
  const dolu = catalog.categories.filter((c) => (c.live_products ?? 0) > 0);
  if (!dolu.length) return null;
  // Duygu → kategori: sırayla dağıtılır (yeni veri sistemi kurulmaz, mevcut kategoriler kullanılır).
  const feels = s.feels.map((f, i) => ({
    ...f,
    img: FEEL_IMAGES[i % FEEL_IMAGES.length],
    href: `/${locale}/${seg.category}/${dolu[i % dolu.length].slug}`,
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
export function ConciergeSection({ locale }: { locale: GlobalLocale }) {
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
              href={WA}
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
export function FinalCta({ locale, catalog }: { locale: GlobalLocale; catalog: LocaleCatalog }) {
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
            <a href={WA} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/60 px-6 py-3 text-[13.5px] font-bold text-white transition hover:bg-white/10">
              {s.ctaAlt}
            </a>
          </div>
        </div>
      </div>
    </Wrap>
  );
}
