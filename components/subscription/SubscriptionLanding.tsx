'use client';

// SubscriptionLanding.tsx — /abonelik SAYFA 1.
//
// ⚠️ FIGMA FINAL MASTER — TASARIM DEĞİŞİKLİĞİ 0.
// Bölüm sırası, ölçüler, renkler, tipografi, metinler ve responsive
// breakpoint'ler (860/960/600/480) Figma Make export'undan BİREBİR alınmıştır.
//
// SUNUM = FIGMA · VERİ = API. Plan adı, açıklama, avantajlar, görsel, rozet ve
// FİYAT `/api/public/subscriptions/plans` uçundan gelir; koda GÖMÜLÜ DEĞİLDİR.
// Admin fiyatı değiştirdiğinde bu sayfa deploy'suz güncel fiyatı gösterir.
//
// FIGMA'DAN ÇIKARILAN TEK BLOK: Hero'daki "14.654 değerlendirme · Trustpilot"
// rozeti. ÇiçekYolla'nın Trustpilot hesabı yoktur ve sayı gerçek değildir;
// operatör kararıyla kaldırılmıştır. Başka hiçbir metin/ölçü değişmemiştir.

import { useState } from 'react';
import Link from 'next/link';
import {
  C, serif, sans, IMG, PLAN_GORSELI, kurus,
} from './theme';
import {
  SectionLabel, CTAButton, BotanicalDivider, GuaranteeBand, TickIcon,
  BotaMarkFlower, BotaMarkCard, BotaMarkTouch, PerkControl, PerkDates,
} from './SubscriptionUI';

export interface PublicPlan {
  id: string;
  key: string;
  name: string;
  freqLabel: string;
  description: string;
  intervalDays: number;
  occurrenceCount: number;
  priceMinor: number;
  listPriceMinor: number | null;
  currency: string;
  features: string[];
  imageUrl: string | null;
  badge: string | null;
  ctaLabel: string;
  purchasable: boolean;
}

/* ─── HERO ─────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section style={{ background: C.creamDeep, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '87vh' }} className="ab-hero-grid">
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 60px 80px 80px' }} className="ab-hero-copy">
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.2em', color: C.teal, textTransform: 'uppercase', marginBottom: 22 }}>
            ÇiçekYolla Abonelik
          </span>
          <h1 style={{ ...serif, fontSize: 'clamp(36px, 4vw, 58px)', fontWeight: 700, color: C.ink, lineHeight: 1.12, letterSpacing: '-0.025em', margin: '0 0 22px' }}>
            Abonelik çiçekleri?<br />
            Çünkü bir buket<br />
            hiç yetmez…
          </h1>
          <p style={{ fontSize: 16, color: C.ink2, lineHeight: 1.75, maxWidth: 400, margin: '0 0 40px' }}>
            Her teslimatla kapınıza gelen bir mutluluk. İstediğin sıklıkta, istediğin zaman.
          </p>
          <div>
            <a href="#planlar" style={{ textDecoration: 'none' }}>
              <CTAButton>Abonelik Planlarını Keşfet</CTAButton>
            </a>
          </div>
        </div>
        <div style={{ position: 'relative', background: C.creamDeep, minHeight: 480 }} className="ab-hero-img">
          <img src={IMG.hero} alt="Güneş çiçeği ve yıldız çiçeği buketi" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${C.creamDeep} 0%, transparent 14%)` }} />
        </div>
      </div>
      <style>{`
        @media(max-width:860px){
          .ab-hero-grid{grid-template-columns:1fr!important;min-height:unset!important}
          .ab-hero-copy{padding:48px 24px 40px!important;order:2}
          .ab-hero-img{min-height:320px!important;height:65vw!important;order:1}
        }
        @media(max-width:480px){ .ab-hero-img{height:80vw!important} }
      `}</style>
    </section>
  );
}

/* ─── NEDEN ────────────────────────────────────────────────────────── */
function WhySection() {
  const items = [
    { num: '01', title: 'Her Zaman Taze', text: 'Düzenli teslimatlarla evinizde taze çiçeklerin keyfini çıkarın.' },
    { num: '02', title: 'Her Teslimatda Yeni Bir Heyecan', text: 'Mevsime ve planınıza göre özenle hazırlanan çiçeklerle karşılaşın.' },
    { num: '03', title: 'Planınız Size Uysun', text: 'Teslimat tarihinizi yönetin, gerektiğinde atlayın veya ara verin.' },
    { num: '04', title: 'Aboneliğe Özel Avantajlar', text: 'Düzenli abonelere özel ayrıcalıklardan yararlanın.' },
  ];
  return (
    <section style={{ background: C.cream }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '5fr 6fr' }} className="ab-why-grid">
        <div style={{ position: 'relative', minHeight: 560, background: C.imgBg }} className="ab-why-img">
          <img src={IMG.neden} alt="Masa düzeni pembe çiçek aranjmanı" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }} />
        </div>
        <div style={{ padding: '88px 80px 88px 72px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="ab-why-copy">
          <SectionLabel>Neden Abone Olmalıyım?</SectionLabel>
          <h2 style={{ ...serif, fontSize: 'clamp(28px, 3vw, 44px)', fontWeight: 700, color: C.ink, lineHeight: 1.18, letterSpacing: '-0.022em', margin: '0 0 52px' }}>
            Taze Çiçek Aboneliğini<br />Neden Seveceksiniz?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {items.map((b) => (
              <div key={b.num} style={{ display: 'flex', gap: 22 }}>
                <span style={{ ...serif, fontSize: 12, fontWeight: 600, color: C.teal, minWidth: 24, paddingTop: 3, letterSpacing: '0.05em', flexShrink: 0 }}>{b.num}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7 }}>{b.title}</div>
                  <div style={{ fontSize: 14, color: C.ink2, lineHeight: 1.7 }}>{b.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @media(max-width:860px){.ab-why-grid{grid-template-columns:1fr!important}.ab-why-img{min-height:300px!important}.ab-why-copy{padding:48px 24px!important}}
      `}</style>
    </section>
  );
}

/* ─── NASIL ÇALIŞIR ────────────────────────────────────────────────── */
function HowItWorksSection() {
  const steps = [
    { num: '01', title: 'Planını Seç', text: 'Çiçeklerinin ne sıklıkla gelmesini istediğini seç.', gif: IMG.adimPlan },
    { num: '02', title: 'Teslimat Gününü Belirle', text: 'Sana uygun teslimat gününü belirle.', gif: IMG.adimTakvim },
    { num: '03', title: 'Taze Çiçeklerin Gelsin', text: 'Özenle hazırlanan çiçeklerin belirlediğin gün kapına gelsin.', gif: IMG.adimKapi },
    { num: '04', title: 'Planını Kolayca Yönet', text: 'Teslimatını değiştir, atla veya aboneliğine ara ver.', gif: IMG.adimYonet },
  ];
  return (
    <section style={{ background: C.creamDeep, padding: '100px 40px 112px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <h2 style={{ ...serif, textAlign: 'center', fontSize: 'clamp(26px, 3vw, 44px)', fontWeight: 700, fontStyle: 'italic', color: C.ink, lineHeight: 1.2, letterSpacing: '-0.022em', margin: '0 0 88px' }}>
          Çiçek Aboneliğiniz Nasıl Çalışır?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }} className="ab-how-grid">
          {steps.map((s) => (
            <div key={s.num} style={{ textAlign: 'center', padding: '0 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: C.ink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, ...sans }}>
                  {parseInt(s.num, 10)}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28, height: 140, alignItems: 'center' }}>
                <img src={s.gif} alt={s.title} style={{ height: 130, width: 'auto', objectFit: 'contain' }} />
              </div>
              <h3 style={{ ...serif, fontSize: 16.5, fontWeight: 600, color: C.ink, margin: '0 0 10px', lineHeight: 1.3 }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: C.ink2, lineHeight: 1.72, maxWidth: 200, margin: '0 auto' }}>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media(max-width:860px){.ab-how-grid{grid-template-columns:repeat(2,1fr)!important;gap:56px 24px!important}}
        @media(max-width:480px){.ab-how-grid{grid-template-columns:1fr!important}}
      `}</style>
    </section>
  );
}

/* ─── HER TESLİMATTA ───────────────────────────────────────────────── */
function WhatsInSection() {
  const items = [
    { mark: <BotaMarkFlower />, title: 'Özenle Seçilen Taze Çiçekler', text: 'Teslimatınız için hazırlanan taze ve uyumlu çiçekler.' },
    { mark: <BotaMarkCard />, title: 'Çiçek Bakım Rehberi', text: 'Çiçeklerinizin güzelliğini daha uzun süre korumanıza yardımcı olacak küçük bakım önerileri.' },
    { mark: <BotaMarkTouch />, title: 'ÇiçekYolla Dokunuşu', text: 'Her teslimatta özenli hazırlık, sunum ve marka deneyimi.' },
  ];
  return (
    <section style={{ background: C.creamDeep }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '6fr 5fr' }} className="ab-whats-grid">
        <div style={{ padding: '88px 72px 88px 80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="ab-whats-copy">
          <SectionLabel>Her Teslimatta</SectionLabel>
          <h2 style={{ ...serif, fontSize: 'clamp(28px, 3vw, 44px)', fontWeight: 700, color: C.ink, lineHeight: 1.18, letterSpacing: '-0.022em', margin: '0 0 52px' }}>
            Sizi Ne Bekliyor?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {items.map((item) => (
              <div key={item.title} style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, paddingTop: 2 }}>{item.mark}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 7 }}>{item.title}</div>
                  <div style={{ fontSize: 14, color: C.ink2, lineHeight: 1.7 }}>{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', minHeight: 520, background: C.imgBg }} className="ab-whats-img">
          <img src={IMG.teslimat} alt="Renkli mevsim buketi teslimat" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 15%', display: 'block' }} />
        </div>
      </div>
      <style>{`
        @media(max-width:860px){.ab-whats-grid{grid-template-columns:1fr!important}.ab-whats-img{min-height:300px!important;order:-1}.ab-whats-copy{padding:48px 24px!important}}
      `}</style>
    </section>
  );
}

/* ─── PLAN KARTI — görünüm Figma, veri API ─────────────────────────── */
function PlanCard({ plan }: { plan: PublicPlan }) {
  const [hov, setHov] = useState(false);
  const featured = !!plan.badge;
  const gorsel = plan.imageUrl || PLAN_GORSELI[plan.key] || IMG.planAylik;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#fff',
        border: `1.5px solid ${featured ? C.teal : C.border}`,
        overflow: 'hidden', position: 'relative',
        transition: 'transform .2s, box-shadow .2s',
        transform: hov ? 'translateY(-5px)' : 'none',
        boxShadow: hov ? '0 16px 44px rgba(44,41,37,.09)' : featured ? '0 4px 24px rgba(90,138,125,.12)' : 'none',
      }}
    >
      {plan.badge && (
        <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 2, background: C.teal, color: '#fff', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '4px 10px' }}>
          {plan.badge}
        </div>
      )}
      <div style={{ height: 260, background: C.creamDeep }}>
        <img src={gorsel} alt={plan.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }} />
      </div>
      <div style={{ padding: '28px 28px 32px' }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', color: C.teal, marginBottom: 10, textTransform: 'uppercase' }}>
          {plan.freqLabel}
        </div>
        <h3 style={{ ...serif, fontSize: 22, fontWeight: 700, color: C.ink, margin: '0 0 10px', letterSpacing: '-0.01em' }}>{plan.name}</h3>

        {/* FİYAT — Figma kartında ad ile açıklama arasında; değer API'den gelir. */}
        {plan.purchasable ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '0 0 10px' }}>
            <span style={{ ...serif, fontSize: 26, fontWeight: 700, color: C.ink, letterSpacing: '-0.01em' }}>
              {kurus(plan.priceMinor, plan.currency)}
            </span>
            {plan.listPriceMinor !== null && (
              <span style={{ fontSize: 13, color: C.ink3, textDecoration: 'line-through' }}>
                {kurus(plan.listPriceMinor, plan.currency)}
              </span>
            )}
            <span style={{ fontSize: 12, color: C.ink3 }}>/ teslimat</span>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: C.ink3, margin: '0 0 10px' }}>Fiyat yakında</div>
        )}

        <p style={{ fontSize: 14, color: C.ink2, lineHeight: 1.65, margin: '0 0 20px' }}>{plan.description}</p>
        <ul style={{ listStyle: 'none', margin: '0 0 24px', padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {plan.features.map((f) => (
            <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: C.ink2 }}>
              <TickIcon />{f}
            </li>
          ))}
        </ul>

        {plan.purchasable ? (
          <Link href={`/abonelik/olustur?plan=${encodeURIComponent(plan.id)}`} style={{ textDecoration: 'none' }}>
            <button
              style={{
                width: '100%', background: featured ? C.teal : 'transparent',
                color: featured ? '#fff' : C.ink,
                border: `1.5px solid ${featured ? C.teal : C.border}`,
                borderRadius: 24, padding: '13px', fontSize: 13, fontWeight: 600,
                letterSpacing: '0.04em', cursor: 'pointer', transition: 'all .15s', ...sans,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.teal; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = C.teal; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = featured ? C.teal : 'transparent'; e.currentTarget.style.color = featured ? '#fff' : C.ink; e.currentTarget.style.borderColor = featured ? C.teal : C.border; }}
            >
              {plan.ctaLabel}
            </button>
          </Link>
        ) : (
          // Fiyatı girilmemiş plan satın alınamaz — çalışmayan buton konmaz.
          <button
            disabled
            style={{
              width: '100%', background: 'transparent', color: C.ink3,
              border: `1.5px solid ${C.border}`, borderRadius: 24, padding: '13px',
              fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
              cursor: 'not-allowed', ...sans,
            }}
          >
            Yakında
          </button>
        )}
        <p style={{ fontSize: 11, color: C.ink3, textAlign: 'center', marginTop: 10 }}>Atla veya istediğinde iptal et</p>
      </div>
    </div>
  );
}

function PlansSection({ plans }: { plans: PublicPlan[] }) {
  return (
    <section id="planlar" style={{ background: C.cream, padding: '96px 40px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <SectionLabel center>Abonelik Planları</SectionLabel>
          <h2 style={{ ...serif, fontSize: 'clamp(28px, 3.2vw, 46px)', fontWeight: 700, color: C.ink, lineHeight: 1.18, letterSpacing: '-0.022em', margin: '0 0 16px' }}>
            Size Uygun Çiçek Ritmini Seçin
          </h2>
          <p style={{ fontSize: 15, color: C.ink2, maxWidth: 440, margin: '0 auto', lineHeight: 1.65 }}>
            Dilediğiniz planı seçin, teslimat takviminizi belirleyin.
          </p>
        </div>
        {plans.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: 14, color: C.ink3 }}>
            Abonelik planları çok yakında burada olacak.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, alignItems: 'start' }} className="ab-plans-grid">
            {plans.map((p) => <PlanCard key={p.id} plan={p} />)}
          </div>
        )}
        <p style={{ textAlign: 'center', fontSize: 12, color: C.ink3, marginTop: 28 }}>
          Planını yönet · Teslimatı atla · Dilediğinde ara ver
        </p>
      </div>
      <style>{`
        @media(max-width:960px){.ab-plans-grid{grid-template-columns:1fr 1fr!important}}
        @media(max-width:600px){.ab-plans-grid{grid-template-columns:1fr!important;max-width:400px;margin:0 auto}}
      `}</style>
    </section>
  );
}

/* ─── ABONE AVANTAJLARI ────────────────────────────────────────────── */
function PerksSection() {
  const perks = [
    { title: 'Taze Çiçek Rutini', text: 'Evinizde düzenli olarak taze çiçeklerin keyfini yaşayın.', icon: <img src={IMG.perkCicek} alt="" style={{ width: 64, height: 64, objectFit: 'contain' }} /> },
    { title: 'Planını Sen Yönet', text: 'Teslimatlarını ihtiyaçlarına göre kolayca düzenle.', icon: <PerkControl /> },
    { title: 'Özel Günleri Planla', text: 'Düzenli teslimatı hayatının özel anlarına göre ayarla.', icon: <PerkDates /> },
    { title: 'Aboneliğe Özel Avantajlar', text: 'Abonelere özel fırsat ve ayrıcalıklardan yararlan.', icon: <img src={IMG.perkAvantaj} alt="" style={{ width: 64, height: 64, objectFit: 'contain' }} /> },
  ];
  return (
    <section style={{ background: C.petal, padding: '92px 40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionLabel center>Abone Avantajları</SectionLabel>
        <h2 style={{ ...serif, textAlign: 'center', fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 700, color: C.ink, lineHeight: 1.18, letterSpacing: '-0.022em', margin: '0 0 72px' }}>
          Aboneliğin Size Kazandırdıkları
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 40 }} className="ab-perks-grid">
          {perks.map((p) => (
            <div key={p.title} style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 80, margin: '0 auto 22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.icon}</div>
              <h3 style={{ ...serif, fontSize: 16, fontWeight: 600, color: C.ink, margin: '0 0 10px', lineHeight: 1.3 }}>{p.title}</h3>
              <p style={{ fontSize: 13, color: C.ink2, lineHeight: 1.7 }}>{p.text}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media(max-width:860px){.ab-perks-grid{grid-template-columns:repeat(2,1fr)!important;gap:40px 28px!important}}
        @media(max-width:480px){.ab-perks-grid{grid-template-columns:1fr!important}}
      `}</style>
    </section>
  );
}

/* ─── SSS ──────────────────────────────────────────────────────────── */
function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  const faqs = [
    { q: 'Çiçeklerim ne zaman teslim edilir?', a: 'Abone olurken teslimat gününü kendin seçersin. Seçtiğin güne göre düzenli teslimat programın oluşturulur. Teslimat saatini belirttiğin aralıkta kapıda olacak şekilde planlanır.' },
    { q: 'Hangi tür çiçekler gönderilir?', a: 'Her teslimatında mevsimin en taze ve güzel çiçekleri özenle seçilir. Güller, şakayıklar, ortancalar, lale, kasımpatı ve daha fazlası — her seferinde farklı bir sürpriz.' },
    { q: 'Teslimatı atlayabilir veya ara verebilir miyim?', a: 'Evet, istediğin teslimatı kolayca atlayabilir ya da aboneliğine dilediğin süre ara verebilirsin.' },
    { q: 'Aboneliği ne zaman iptal edebilirim?', a: 'Dilediğin zaman, herhangi bir ceza ödemeden iptal edebilirsin.' },
    { q: 'Teslimat adresimi değiştirebilir miyim?', a: 'Evet. Teslimat adresini istediğin zaman güncelleyebilirsin. Değişiklik bir sonraki teslimatından itibaren geçerli olur.' },
    { q: 'Çiçekler ne kadar süre dayanır?', a: 'Çiçeklerimiz tam açmadan önce gönderilir. Beraberinde gelen bakım rehberimiz ve özel çiçek besini ömrü uzatır.' },
  ];
  return (
    <section style={{ background: C.cream, padding: '96px 40px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <SectionLabel center>Sıkça Sorulan Sorular</SectionLabel>
        <h2 style={{ ...serif, textAlign: 'center', fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 700, color: C.ink, lineHeight: 1.2, letterSpacing: '-0.02em', margin: '0 0 56px' }}>
          Aklınızdaki Sorular
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {faqs.map((faq, i) => (
            <div key={faq.q} style={{ borderTop: `1px solid ${C.border}` }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', padding: '22px 0', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ ...serif, fontSize: 17, fontWeight: 600, color: C.ink, lineHeight: 1.3, paddingRight: 24 }}>{faq.q}</span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} aria-hidden="true">
                  <path d="M5 7.5 L10 12.5 L15 7.5" stroke={C.ink2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {open === i && (
                <p style={{ fontSize: 14.5, color: C.ink2, lineHeight: 1.75, margin: '0 0 22px', paddingRight: 40 }}>{faq.a}</p>
              )}
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${C.border}` }} />
        </div>
      </div>
    </section>
  );
}

/* ─── FİNAL CTA ────────────────────────────────────────────────────── */
// ⚠️ MISSING FIGMA ASSET: Figma'daki arka plan görseli bir Unsplash hotlink'iydi
// (paket içinde yok). Yerine BAŞKA GÖRSEL KONMADI; bölüm Figma'daki krem
// örtü rengiyle (rgba(250,248,244,0.80) → düz krem) render edilir. Gerçek
// ÇiçekYolla fotoğrafı geldiğinde tek satırda takılır.
function FinalCTA() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: C.creamDeep }}>
      <div style={{ minHeight: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 32px' }}>
        <SectionLabel center>Son Adım</SectionLabel>
        <h2 style={{ ...serif, fontSize: 'clamp(28px, 4vw, 54px)', fontWeight: 700, color: C.ink, lineHeight: 1.15, letterSpacing: '-0.022em', margin: '0 0 20px', maxWidth: 580 }}>
          Evinize Düzenli Olarak Biraz Çiçek Gelsin.
        </h2>
        <p style={{ fontSize: 16, color: C.ink2, maxWidth: 440, margin: '0 0 40px', lineHeight: 1.7 }}>
          Çiçek planınızı seçin, teslimat programınızı oluşturun,<br />gerisini ÇiçekYolla&apos;ya bırakın.
        </p>
        <a href="#planlar" style={{ textDecoration: 'none' }}>
          <CTAButton>Abonelik Planlarını Keşfet</CTAButton>
        </a>
        <p style={{ fontSize: 12, color: C.ink3, marginTop: 14 }}>Planını daha sonra değiştirebilir veya ara verebilirsin.</p>
      </div>
    </section>
  );
}

/* ─── SAYFA ────────────────────────────────────────────────────────── */
export function SubscriptionLanding({ plans }: { plans: PublicPlan[] }) {
  return (
    <div style={{ background: C.cream, ...sans, color: C.ink }}>
      <Hero />
      <WhySection />
      <BotanicalDivider />
      <HowItWorksSection />
      <WhatsInSection />
      <BotanicalDivider slim />
      <PlansSection plans={plans} />
      <GuaranteeBand />
      <PerksSection />
      <FAQSection />
      <FinalCTA />
    </div>
  );
}
