'use client';

// SubscriptionCreate.tsx — /abonelik/olustur SAYFA 2.
//
// Figma abonelik ailesinin devamı: aynı palet, tipografi, radius ve editorial
// spacing. Yeni bir tasarım dili ÜRETİLMEZ.
//
// AKIŞ: takvim → alıcı → adres → müşteri → not → premium özet → talep oluştur.
// ⛔ ÖDEME YOK. PayTR tekrarlayan tahsilat desteklemiyor (kanıt: PR açıklaması);
//    sahte recurring kurulmaz. Talep oluşur, ekip iletişime geçer.
// ⛔ TARİH HESABI İSTEMCİDE YAPILMAZ: gelecek teslimatlar /schedule/preview
//    ucundan gelir; kapalı gün kaydırması canlı delivery kurallarından türer.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { C, serif, sans, kurus, tarihTr, tarihUzunTr } from './theme';
import { SectionLabel, CTAButton, TickIcon } from './SubscriptionUI';
import { DeliveryCalendar } from './DeliveryCalendar';
import {
  takvimOnizle, abonelikTalebiGonder,
  type PublicPlan, type SchedulePreview, type TalepSonucu,
} from '@/lib/subscription';

const WHATSAPP = '905458813450';

function Alan({
  label, value, onChange, placeholder, type = 'text', required, textarea, maxLength,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean; textarea?: boolean; maxLength?: number;
}) {
  const ortak = {
    width: '100%', padding: '12px 14px', fontSize: 14, ...sans,
    color: C.ink, background: '#fff', border: `1.5px solid ${C.border}`,
    borderRadius: 10, outline: 'none',
  } as const;
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: C.ink2, textTransform: 'uppercase', marginBottom: 7 }}>
        {label}{required && <span style={{ color: C.rose }}> *</span>}
      </span>
      {textarea ? (
        <textarea
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} maxLength={maxLength} rows={3}
          style={{ ...ortak, resize: 'vertical' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = C.teal; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
        />
      ) : (
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} maxLength={maxLength} style={ortak}
          onFocus={(e) => { e.currentTarget.style.borderColor = C.teal; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
        />
      )}
    </label>
  );
}

function Kart({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', border: `1.5px solid ${C.border}`, padding: '26px 26px 28px', ...style }}>
      {children}
    </div>
  );
}

/* ─── TESLİMAT PROGRAMI ────────────────────────────────────────────── */
function Program({ onizleme }: { onizleme: SchedulePreview }) {
  const [ilk, ...digerleri] = onizleme.deliveries;
  return (
    <div>
      <SectionLabel>Teslimat Programınız</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {onizleme.deliveries.map((d, i) => (
          <div
            key={d.sequenceNo}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '14px 0',
              borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: i === 0 ? C.teal : C.tealLight,
              color: i === 0 ? '#fff' : C.teal,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
            }}>
              {d.sequenceNo}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...serif, fontSize: 16, fontWeight: 600, color: C.ink }}>
                {tarihTr(d.scheduledDate, true)}
              </div>
              <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 2 }}>
                {i === 0 ? 'İlk teslimat' : `${i + 1}. teslimat`}
                {d.shiftedFrom && ` · ${tarihTr(d.shiftedFrom)} teslimata kapalı olduğu için kaydırıldı`}
              </div>
            </div>
          </div>
        ))}
      </div>
      {ilk && digerleri.length > 0 && (
        <p style={{ fontSize: 12, color: C.ink3, marginTop: 14, lineHeight: 1.7 }}>
          Program aboneliğiniz sürdükçe aynı ritimde devam eder.
        </p>
      )}
    </div>
  );
}

/* ─── BAŞARI ───────────────────────────────────────────────────────── */
function Basarili({ sonuc, plan }: { sonuc: TalepSonucu; plan: PublicPlan }) {
  const mesaj = encodeURIComponent(
    `Merhaba, ${sonuc.code} numaralı abonelik talebimi oluşturdum. `
    + `Plan: ${sonuc.planName}. İlk teslimat: ${tarihUzunTr(sonuc.startDate)}.`,
  );
  return (
    <div style={{ maxWidth: 620, margin: '0 auto', textAlign: 'center', padding: '20px 0 10px' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', background: C.tealLight,
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
      }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12.5 L10 17.5 L19 7" stroke={C.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 style={{ ...serif, fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 700, color: C.ink, lineHeight: 1.2, letterSpacing: '-0.02em', margin: '0 0 14px' }}>
        Abonelik talebiniz alındı
      </h1>
      <p style={{ fontSize: 15, color: C.ink2, lineHeight: 1.7, margin: '0 0 28px' }}>
        Ekibimiz kısa süre içinde sizinle iletişime geçip aboneliğinizi başlatacak.
      </p>

      <Kart style={{ textAlign: 'left', marginBottom: 24 }}>
        <Satir k="Referans" v={sonuc.code} guclu />
        <Satir k="Plan" v={sonuc.planName} />
        <Satir k="Teslimat periyodu" v={`${plan.intervalDays} günde bir`} />
        <Satir k="İlk teslimat" v={tarihUzunTr(sonuc.startDate)} />
        {sonuc.nextDeliveryDate && sonuc.nextDeliveryDate !== sonuc.startDate && (
          <Satir k="Sonraki teslimat" v={tarihUzunTr(sonuc.nextDeliveryDate)} />
        )}
        <Satir k="Durum" v="Onay bekliyor" son />
      </Kart>

      <a href={`https://wa.me/${WHATSAPP}?text=${mesaj}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
        <CTAButton>WhatsApp&apos;tan Devam Et</CTAButton>
      </a>
      <div style={{ marginTop: 18 }}>
        <Link href="/abonelik" style={{ fontSize: 13, color: C.ink2, textDecoration: 'underline' }}>
          Abonelik sayfasına dön
        </Link>
      </div>
    </div>
  );
}

function Satir({ k, v, guclu, son }: { k: string; v: string; guclu?: boolean; son?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: 16,
      padding: '11px 0', borderBottom: son ? 'none' : `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: 13, color: C.ink2 }}>{k}</span>
      <span style={{
        fontSize: guclu ? 15 : 13.5, fontWeight: guclu ? 700 : 600,
        color: C.ink, textAlign: 'right', ...(guclu ? serif : {}),
      }}>{v}</span>
    </div>
  );
}

/* ─── SAYFA ────────────────────────────────────────────────────────── */
export function SubscriptionCreate({ plan }: { plan: PublicPlan }) {
  const [startDate, setStartDate] = useState<string | null>(null);
  const [onizleme, setOnizleme] = useState<SchedulePreview | null>(null);
  const [takvimHata, setTakvimHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDistrict, setDeliveryDistrict] = useState('');
  const [note, setNote] = useState('');
  const [cardMessage, setCardMessage] = useState('');

  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<TalepSonucu | null>(null);

  // Tarih seçilince takvim SUNUCUDAN alınır — istemci tarih hesaplamaz.
  useEffect(() => {
    if (!startDate) return;
    let iptal = false;
    setYukleniyor(true); setTakvimHata(null);
    void takvimOnizle(plan.id, startDate).then((r) => {
      if (iptal) return;
      if (r.ok) { setOnizleme(r.data); } else { setOnizleme(null); setTakvimHata(r.message); }
      setYukleniyor(false);
    });
    return () => { iptal = true; };
  }, [startDate, plan.id]);

  const gecerli = Boolean(
    startDate && onizleme && customerName.trim().length >= 2
    && customerPhone.trim().length >= 10 && recipientName.trim().length >= 2,
  );

  const gonder = useCallback(async () => {
    if (!gecerli || !startDate) return;
    setGonderiliyor(true); setHata(null);
    const r = await abonelikTalebiGonder({
      planId: plan.id,
      startDate,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || null,
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim() || null,
      deliveryAddress: deliveryAddress.trim() || null,
      deliveryCity: 'İstanbul',
      deliveryDistrict: deliveryDistrict.trim() || null,
      note: note.trim() || null,
      cardMessage: cardMessage.trim() || null,
    });
    if (r.ok) setSonuc(r.data); else setHata(r.message);
    setGonderiliyor(false);
  }, [gecerli, startDate, plan.id, customerName, customerPhone, customerEmail,
    recipientName, recipientPhone, deliveryAddress, deliveryDistrict, note, cardMessage]);

  if (sonuc) {
    return (
      <div style={{ background: C.cream, ...sans, color: C.ink, padding: '64px 24px 96px' }}>
        <Basarili sonuc={sonuc} plan={plan} />
      </div>
    );
  }

  return (
    <div style={{ background: C.cream, ...sans, color: C.ink }}>
      <section style={{ background: C.creamDeep, padding: '56px 40px 48px' }} className="ab-c-head">
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Link href="/abonelik" style={{ fontSize: 12.5, color: C.ink2, textDecoration: 'none' }}>
            ← Planlara dön
          </Link>
          <div style={{ marginTop: 18 }}>
            <SectionLabel>{plan.freqLabel}</SectionLabel>
            <h1 style={{ ...serif, fontSize: 'clamp(28px, 3.4vw, 46px)', fontWeight: 700, color: C.ink, lineHeight: 1.15, letterSpacing: '-0.022em', margin: '0 0 12px' }}>
              Teslimat Takviminizi Oluşturun
            </h1>
            <p style={{ fontSize: 15.5, color: C.ink2, lineHeight: 1.7, maxWidth: 520, margin: 0 }}>
              İlk teslimat tarihinizi seçin; {plan.name} için sonraki teslimatları sizin için hesaplayalım.
            </p>
          </div>
        </div>
      </section>

      <section style={{ padding: '56px 40px 96px' }} className="ab-c-body">
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 40, alignItems: 'start' }} className="ab-c-grid">
          {/* SOL — takvim + form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div>
              <SectionLabel>İlk Teslimat Tarihi</SectionLabel>
              <DeliveryCalendar value={startDate} onChange={setStartDate} />
              {takvimHata && (
                <p style={{ fontSize: 13, color: C.rose, marginTop: 12 }}>{takvimHata}</p>
              )}
            </div>

            <Kart>
              <SectionLabel>Alıcı Bilgileri</SectionLabel>
              <div style={{ display: 'grid', gap: 16 }}>
                <Alan label="Alıcı adı" value={recipientName} onChange={setRecipientName} required maxLength={200} placeholder="Çiçeği kim alacak?" />
                <Alan label="Alıcı telefonu" value={recipientPhone} onChange={setRecipientPhone} type="tel" maxLength={20} placeholder="05xx xxx xx xx" />
                <Alan label="Teslimat adresi" value={deliveryAddress} onChange={setDeliveryAddress} textarea maxLength={1000} placeholder="Mahalle, sokak, bina, daire" />
                <Alan label="İlçe" value={deliveryDistrict} onChange={setDeliveryDistrict} maxLength={100} placeholder="Kadıköy" />
                <Alan label="Kart mesajı" value={cardMessage} onChange={setCardMessage} textarea maxLength={1000} placeholder="Çiçeğinizle gidecek not" />
              </div>
            </Kart>

            <Kart>
              <SectionLabel>Sizin Bilgileriniz</SectionLabel>
              <div style={{ display: 'grid', gap: 16 }}>
                <Alan label="Ad soyad" value={customerName} onChange={setCustomerName} required maxLength={200} />
                <Alan label="Telefon" value={customerPhone} onChange={setCustomerPhone} type="tel" required maxLength={20} placeholder="05xx xxx xx xx" />
                <Alan label="E-posta" value={customerEmail} onChange={setCustomerEmail} type="email" maxLength={200} />
                <Alan label="Özel not" value={note} onChange={setNote} textarea maxLength={1000} placeholder="Bilmemizi istediğiniz bir şey var mı?" />
              </div>
            </Kart>
          </div>

          {/* SAĞ — premium özet */}
          <aside style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 20 }} className="ab-c-aside">
            <Kart>
              <SectionLabel>Sipariş Özeti</SectionLabel>
              <div style={{ ...serif, fontSize: 21, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{plan.name}</div>
              <div style={{ fontSize: 12.5, color: C.teal, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18 }}>
                {plan.freqLabel}
              </div>
              <Satir k="Teslimat periyodu" v={`${plan.intervalDays} günde bir`} />
              <Satir k="Teslimat başına" v={kurus(plan.priceMinor, plan.currency)} />
              <Satir
                k="İlk teslimat"
                v={onizleme ? tarihUzunTr(onizleme.startDate) : 'Tarih seçin'}
              />
              <Satir
                k="Sonraki teslimat"
                v={onizleme?.deliveries[1] ? tarihUzunTr(onizleme.deliveries[1].scheduledDate) : '—'}
                son
              />
              <ul style={{ listStyle: 'none', margin: '20px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: C.ink2 }}>
                    <TickIcon />{f}
                  </li>
                ))}
              </ul>
            </Kart>

            {yukleniyor && (
              <Kart><p style={{ fontSize: 13, color: C.ink3, margin: 0 }}>Teslimat programı hesaplanıyor…</p></Kart>
            )}
            {onizleme && !yukleniyor && (
              <Kart><Program onizleme={onizleme} /></Kart>
            )}

            {hata && (
              <div style={{ background: '#fdeceb', border: `1px solid ${C.rose}`, padding: '14px 16px', fontSize: 13, color: '#8c3b33', lineHeight: 1.6 }}>
                {hata}
              </div>
            )}

            <CTAButton onClick={() => void gonder()} disabled={!gecerli || gonderiliyor} style={{ width: '100%' }}>
              {gonderiliyor ? 'Gönderiliyor…' : 'Abonelik Siparişini Oluştur'}
            </CTAButton>
            <p style={{ fontSize: 11.5, color: C.ink3, textAlign: 'center', lineHeight: 1.7, margin: 0 }}>
              Bu adımda ödeme alınmaz. Talebiniz oluşturulur, ekibimiz sizinle iletişime geçer.
            </p>
          </aside>
        </div>
      </section>

      <style>{`
        @media(max-width:900px){
          .ab-c-grid{grid-template-columns:1fr!important;gap:28px!important}
          .ab-c-aside{position:static!important}
        }
        @media(max-width:600px){
          .ab-c-head{padding:40px 20px 32px!important}
          .ab-c-body{padding:32px 20px 72px!important}
        }
      `}</style>
    </div>
  );
}
