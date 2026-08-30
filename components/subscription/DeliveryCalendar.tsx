'use client';

// DeliveryCalendar.tsx — PREMIUM TESLİMAT TAKVİMİ (/abonelik/olustur).
//
// ⚠️ Jenerik <input type="date"> DEĞİLDİR. Figma abonelik ailesinin devamıdır:
// aynı krem/teal palet, Playfair + DM Sans, aynı radius ve editorial spacing.
//
// ⛔ İKİNCİ TAKVİM MOTORU KURMAZ. Bu bileşen yalnız ay ızgarasını ÇİZER ve
// seçilen tarihi yukarı bildirir. Gelecek teslimatların hesabı ve kapalı gün
// kaydırması SUNUCUDA yapılır (/schedule/preview); burada tarih üretilmez.
//
// MOBİL: gün hücreleri en az 40px dokunma alanı; ızgara yatay taşmaz
// (grid 7 sütun, minmax(0,1fr)). 380px altında hücre 38px'e iner.

import { useMemo, useState } from 'react';
import { C, serif, sans } from './theme';

const AY_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
/** Pazartesi başlangıçlı hafta — Türkiye takvim alışkanlığı. */
const GUN_KISA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
/**
 * "Bugün" — İSTANBUL saatiyle.
 *
 * ⚠️ Ne `toISOString()` (UTC) ne de tarayıcının yerel saati kullanılabilir.
 * UTC, Türkiye'de 00:00–03:00 arasında bir gün geride kalır ve müşteri
 * BUGÜNÜ seçebilir hale gelir ("en erken yarın" kuralı delinir, sipariş
 * kesme saati atlanır). Tarayıcının yerel saati ise müşteri yurt dışındaysa
 * yanlış olur. İşletme İstanbul'da çalışır; takvim İstanbul gününü esas alır.
 * Sunucu tarafı da aynı hesabı yapar (subscriptionSchedule.bugunIstanbul).
 */
function bugunIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}
function gunEkleIso(s: string, n: number): string {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function DeliveryCalendar({
  value, onChange, minIso, maxIso,
}: {
  value: string | null;
  onChange: (iso: string) => void;
  minIso?: string;
  maxIso?: string;
}) {
  const min = minIso ?? gunEkleIso(bugunIso(), 1);   // en erken yarın
  const max = maxIso ?? gunEkleIso(bugunIso(), 180); // en geç ~6 ay

  const ilkAy = useMemo(() => {
    const d = new Date(`${value ?? min}T00:00:00Z`);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
  }, [value, min]);

  const [gosterilen, setGosterilen] = useState(ilkAy);

  const { y, m } = gosterilen;
  const ilkGun = new Date(Date.UTC(y, m, 1));
  const gunSayisi = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  // getUTCDay: 0=Pazar. Pazartesi başlangıcı için kaydır.
  const bosluk = (ilkGun.getUTCDay() + 6) % 7;

  const oncekiVar = iso(y, m, gunSayisi) > min;
  const sonrakiVar = iso(y, m, 1) < max;

  const ayDegistir = (yon: -1 | 1) => {
    const d = new Date(Date.UTC(y, m + yon, 1));
    setGosterilen({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
  };

  return (
    <div style={{
      background: '#fff', border: `1.5px solid ${C.border}`, padding: '22px 20px 24px', ...sans,
    }}>
      {/* Ay başlığı */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => ayDegistir(-1)}
          disabled={!oncekiVar}
          aria-label="Önceki ay"
          style={okStil(!oncekiVar)}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12.5 5 L7.5 10 L12.5 15" stroke={C.ink2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{ ...serif, fontSize: 18, fontWeight: 700, color: C.ink, letterSpacing: '-0.01em' }}>
          {AY_TR[m]} {y}
        </div>
        <button
          type="button"
          onClick={() => ayDegistir(1)}
          disabled={!sonrakiVar}
          aria-label="Sonraki ay"
          style={okStil(!sonrakiVar)}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M7.5 5 L12.5 10 L7.5 15" stroke={C.ink2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Gün başlıkları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 4, marginBottom: 8 }}>
        {GUN_KISA.map((g) => (
          <div key={g} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', color: C.ink3, textTransform: 'uppercase' }}>
            {g}
          </div>
        ))}
      </div>

      {/* Gün ızgarası */}
      <div className="ab-cal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 4 }}>
        {Array.from({ length: bosluk }).map((_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: gunSayisi }, (_, i) => i + 1).map((gun) => {
          const t = iso(y, m, gun);
          const secilebilir = t >= min && t <= max;
          const secili = value === t;
          return (
            <button
              key={t}
              type="button"
              disabled={!secilebilir}
              onClick={() => onChange(t)}
              aria-label={`${gun} ${AY_TR[m]} ${y}`}
              aria-pressed={secili}
              className="ab-cal-day"
              style={{
                height: 40, borderRadius: 8, ...sans, fontSize: 13.5,
                fontWeight: secili ? 700 : 500,
                background: secili ? C.teal : 'transparent',
                color: secili ? '#fff' : secilebilir ? C.ink : C.ink3,
                border: `1px solid ${secili ? C.teal : 'transparent'}`,
                cursor: secilebilir ? 'pointer' : 'not-allowed',
                opacity: secilebilir ? 1 : 0.35,
                transition: 'background .12s, color .12s',
              }}
              onMouseEnter={(e) => {
                if (!secili && secilebilir) e.currentTarget.style.background = C.tealLight;
              }}
              onMouseLeave={(e) => {
                if (!secili) e.currentTarget.style.background = 'transparent';
              }}
            >
              {gun}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 11.5, color: C.ink3, marginTop: 14, lineHeight: 1.6 }}>
        İlk teslimat en erken yarın seçilebilir. Teslimata kapalı bir güne denk gelirse
        program otomatik olarak ilk uygun güne kaydırılır.
      </p>

      <style>{`
        @media(max-width:380px){
          .ab-cal-day{height:38px!important;font-size:12.5px!important}
          .ab-cal-grid{gap:3px!important}
        }
      `}</style>
    </div>
  );
}

function okStil(disabled: boolean) {
  return {
    width: 34, height: 34, borderRadius: '50%',
    border: `1px solid ${C.border}`, background: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  } as const;
}
