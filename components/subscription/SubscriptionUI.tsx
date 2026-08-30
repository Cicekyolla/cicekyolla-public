'use client';

// SubscriptionUI.tsx — Figma FINAL MASTER'ın paylaşılan sunum parçaları.
//
// ⚠️ TASARIM DEĞİŞİKLİĞİ 0. Ölçüler, renkler, radius, letter-spacing ve SVG
// path'leri Figma Make export'undan BİREBİR taşınmıştır. Mevcut ÇiçekYolla
// component'leri bu görünümü bozduğu için (farklı font ailesi, farklı radius,
// farklı palet) aboneliğe ÖZEL sunum component'leri üretilmiştir — kural 8.

import { useState, type CSSProperties, type ReactNode } from 'react';
import { C, serif, sans } from './theme';

/** Google Fonts — yalnız abonelik sayfalarında yüklenir, global temaya dokunmaz. */
export function SubscriptionFonts() {
  return (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap"
    />
  );
}

export function SectionLabel({ children, center }: { children: ReactNode; center?: boolean }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.2em', color: C.teal,
      textTransform: 'uppercase', marginBottom: 14, textAlign: center ? 'center' : 'left',
    }}>
      {children}
    </div>
  );
}

export function CTAButton({
  children, small, style, onClick, disabled, type = 'button',
}: {
  children: ReactNode; small?: boolean; style?: CSSProperties;
  onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit';
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: disabled ? C.ink3 : hov ? C.tealDark : C.teal,
        color: '#fff', border: 'none',
        borderRadius: small ? 20 : 28,
        padding: small ? '9px 22px' : '15px 38px',
        fontSize: small ? 13 : 14, fontWeight: 600, letterSpacing: '0.04em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background .15s', ...sans, ...style,
      }}
    >
      {children}
    </button>
  );
}

export function BotanicalDivider({ slim }: { slim?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center',
      padding: slim ? '0 0 8px' : '12px 0 8px', background: C.cream,
    }}>
      <svg width="220" height="28" viewBox="0 0 220 28" fill="none" aria-hidden="true">
        <path d="M60 14 Q80 10 100 14 Q120 18 140 14" stroke="#c8b89a" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M97 14 Q99 7 102 4" stroke="#c8b89a" strokeWidth="1" strokeLinecap="round" />
        <path d="M103 14 Q105 7 108 4" stroke="#c8b89a" strokeWidth="1" strokeLinecap="round" />
        <path d="M90 14 Q87 8 84 6" stroke="#c8b89a" strokeWidth="1" strokeLinecap="round" />
        <path d="M110 14 Q113 8 116 6" stroke="#c8b89a" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </div>
  );
}

const INK = C.ink;

export function BotaMarkFlower() {
  return (
    <svg width="38" height="44" viewBox="0 0 38 44" fill="none" aria-hidden="true">
      <path d="M14 43 Q13 35 12 24 Q11 16 14 8" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M19 43 Q19 34 19 22 Q19 13 18 4" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M25 43 Q25 34 26 23 Q27 15 25 8" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 28 Q8 24 7 20" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M13 28 Q7 26 6 22" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M26 26 Q31 22 32 18" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M26 26 Q32 24 33 20" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11 7 Q8 5 8 2 Q10 -1 13 0 Q16 1 16 4 Q15 7 12 8" stroke={INK} strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <circle cx="12" cy="8" r="1.8" stroke={INK} strokeWidth="1.1" fill="none" />
      <path d="M15 3 Q13 0 15 -2 Q18 -4 21 -2 Q23 0 21 3" stroke={INK} strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <path d="M15 3 Q13 5 14 8 Q17 10 20 8 Q21 5 19 3" stroke={INK} strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <circle cx="18" cy="5" r="2" stroke={INK} strokeWidth="1.1" fill="none" />
      <path d="M23 7 Q22 4 24 2 Q27 0 29 2 Q31 4 29 7 Q27 8 24 8" stroke={INK} strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <circle cx="26" cy="8" r="1.8" stroke={INK} strokeWidth="1.1" fill="none" />
    </svg>
  );
}

export function BotaMarkCard() {
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" aria-hidden="true">
      <path d="M4 8 Q4 5 6 4 L28 4 Q31 4 32 6 L34 32 Q34 35 32 36 L8 36 Q5 36 4 34 Z" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M24 4 L24 11 L32 11" stroke={INK} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 18 L26 18" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M10 23 L22 23" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M10 28 L26 28" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M10 13 Q12 10 16 11 Q18 12 17 14 Q15 16 12 15" stroke={INK} strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <circle cx="13" cy="13" r="1" fill={INK} opacity="0.5" />
    </svg>
  );
}

export function BotaMarkTouch() {
  return (
    <svg width="38" height="40" viewBox="0 0 38 40" fill="none" aria-hidden="true">
      <path d="M8 22 Q8 38 19 39 Q30 38 30 22 L28 14 Q24 10 19 10 Q14 10 10 14 Z" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M19 10 L19 39" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8 22 L30 22" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M19 10 Q14 6 10 8 Q8 10 11 12 Q15 13 19 10" stroke={INK} strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <path d="M19 10 Q24 6 28 8 Q30 10 27 12 Q23 13 19 10" stroke={INK} strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <circle cx="19" cy="10" r="2" stroke={INK} strokeWidth="1.2" fill="none" />
      <path d="M15 10 Q13 7 14 5 Q16 3 18 4 Q20 3 22 5 Q23 7 21 10" stroke={INK} strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <circle cx="18" cy="9" r="1.5" stroke={INK} strokeWidth="1" fill="none" />
    </svg>
  );
}

export function PerkControl() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M20 8 Q18 6 16 6 L14 6 Q10 6 10 10 L10 54 Q10 58 14 58 L50 58 Q54 58 54 54 L54 10 Q54 6 50 6 L38 6 Q36 6 34 8 L30 8 Z" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M10 16 L54 16" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10 50 L54 50" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M17 22 L47 22" stroke={INK} strokeWidth="1" strokeLinecap="round" />
      {[24, 28, 32, 36, 40, 44].flatMap((y) =>
        [17, 23, 29, 35, 41, 47].map((x) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" fill={INK} opacity="0.5" />
        )))}
      <circle cx="29" cy="32" r="4" stroke={INK} strokeWidth="1.3" fill="none" />
      <circle cx="29" cy="32" r="1.5" fill={INK} />
    </svg>
  );
}

export function PerkDates() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M8 16 Q8 12 12 12 L52 12 Q56 12 56 16 L56 56 Q56 60 52 60 L12 60 Q8 60 8 56 Z" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M8 24 L56 24" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M20 8 L20 18" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M44 8 L44 18" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      {[30, 38, 46, 54].flatMap((y) => [14, 22, 30, 38, 46, 52].map((x) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill={INK} opacity="0.35" />
      )))}
      <path d="M30 34 Q30 31 32 31 Q34 31 34 34 Q34 37 32 38 Q30 37 30 34 Z" stroke={INK} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Plan kartındaki tik ikonu. */
export function TickIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
      <circle cx="7" cy="7" r="6.5" stroke={C.teal} strokeWidth="1" />
      <path d="M4 7 L6.2 9.2 L10 5" stroke={C.teal} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Garanti bandı — Figma'daki dairesel mühür + güven öğeleri. */
export function GuaranteeBand() {
  return (
    <div style={{ background: C.teal, padding: '36px 24px' }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center',
        gap: 32, flexWrap: 'wrap',
      }}>
        <div style={{
          flexShrink: 0, width: 96, height: 96, borderRadius: '50%',
          border: '2px dashed rgba(255,255,255,0.5)', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 8, position: 'relative',
        }}>
          <svg width="96" height="96" viewBox="0 0 96 96" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
            <path id="abonelik-arc" d="M 48,12 m -30,0 a 30,30 0 1,1 60,0" fill="none" />
            <text style={{ fontSize: '7.5px', fill: 'rgba(255,255,255,0.85)', fontWeight: 700, letterSpacing: '0.18em' }}>
              <textPath href="#abonelik-arc" startOffset="12%">%100 · ÇİÇEKYOLLA · GARANTİ</textPath>
            </text>
          </svg>
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none" style={{ marginTop: 6 }} aria-hidden="true">
            <path d="M17 28 C17 28 5 20 5 12 C5 8 8 5 12 5 C14.5 5 16.5 6.5 17 8 C17.5 6.5 19.5 5 22 5 C26 5 29 8 29 12 C29 20 17 28 17 28Z" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', ...serif, marginBottom: 6 }}>
            %100 ÇiçekYolla Garantisi
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
            Her siparişte taze teslimat güvencesi · ÇiçekYolla kalite standartları
          </div>
        </div>

        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {['Taze Teslimat', 'Kolay İptal', 'Güvenli Ödeme'].map((text) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.6)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 11,
                color: '#fff', fontWeight: 700, flexShrink: 0,
              }}>✓</div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
