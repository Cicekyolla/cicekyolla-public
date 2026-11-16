// ============================================================================
// TELEFON KURALLARI — ülke koduna göre uzunluk doğrulaması (saf, DB/HTTP yok).
//
// 17 Kas 2026 (CY-20261117-218913): gönderen "+971545464667646" (BAE, 3 hane
// fazla) panelde son 10 hanesi alınıp "0546 466 76 46" diye TÜRK numarası gibi
// gösterildi; "Sohbet Başlat" yanlış kişiye yazabilirdi.
//
// KURALLAR
//  1) Ülke kodu 90 OLMAYAN numara asla 0'lı Türk biçimine çevrilmez; E.164
//     ("+<ülke kodu><numara>") olarak korunur.
//  2) Uzunluk, ülke kodunun izin verdiği ulusal hane aralığına uymuyorsa numara
//     GEÇERSİZDİR → WhatsApp kimliği üretilmez, mesaj gönderilmez.
//  3) "+"/"00" yoksa yalnız Türk yazımları (10 hane / 0+10 / 90+10) Türk sayılır.
//
// Tablo ITU ulusal numara uzunluklarıdır (ulusal hane: en az, en çok). Emin
// olunmayan ülkede aralık GENİŞ tutulur: gerçek müşteriyi reddetmek, hatalı
// numarayı kabul etmekten pahalıdır. Tabloda olmayan ülke kodu → genel E.164
// sınırı (toplam 8–15 hane).
//
// Bu dosyanın KOPYASI panelde (src/app/lib/phoneRules.ts) ve sitede
// (lib/phoneRules.ts) durur; kural değişirse üçü birlikte güncellenir.
// ============================================================================

const R = (min: number, max: number = min): readonly [number, number] => [min, max];

export const PHONE_NSN_LENGTHS: Readonly<Record<string, readonly [number, number]>> = {
  '1': R(10), '7': R(10),
  '20': R(8, 10), '27': R(9), '30': R(10), '31': R(9), '32': R(8, 9), '33': R(9), '34': R(9), '36': R(8, 9),
  '39': R(6, 11), '40': R(9), '41': R(9), '43': R(4, 13), '44': R(7, 10), '45': R(8), '46': R(7, 13), '47': R(8),
  '48': R(9), '49': R(6, 13), '51': R(8, 9), '52': R(10), '53': R(6, 8), '54': R(10, 11), '55': R(10, 11),
  '56': R(9), '57': R(8, 10), '58': R(10), '60': R(8, 10), '61': R(9), '62': R(7, 12), '63': R(8, 10),
  '64': R(8, 10), '65': R(8), '66': R(8, 9), '81': R(9, 10), '82': R(8, 11), '84': R(9, 10), '86': R(8, 11),
  '90': R(10), '91': R(10), '92': R(9, 10), '93': R(9), '94': R(9), '95': R(7, 10), '98': R(10),
  '211': R(9), '212': R(9), '213': R(8, 9), '216': R(8), '218': R(8, 10),
  '220': R(7), '221': R(9), '222': R(8), '223': R(8), '224': R(8, 9), '225': R(8, 10), '226': R(8), '227': R(8),
  '228': R(8), '229': R(8, 10), '230': R(7, 8), '231': R(7, 9), '232': R(8), '233': R(9), '234': R(7, 10),
  '235': R(8), '236': R(8), '237': R(9), '238': R(7), '239': R(7), '240': R(9), '241': R(7, 8), '242': R(9),
  '243': R(7, 9), '244': R(9), '245': R(7, 9), '248': R(7), '249': R(9), '250': R(9), '251': R(9), '252': R(6, 9),
  '253': R(8), '254': R(9, 10), '255': R(9), '256': R(9), '257': R(8), '258': R(8, 9), '260': R(9), '261': R(9),
  '262': R(9), '263': R(8, 10), '264': R(6, 10), '265': R(7, 9), '266': R(8), '267': R(7, 8), '268': R(8), '269': R(7),
  '297': R(7), '298': R(6), '299': R(6),
  '350': R(8), '351': R(9), '352': R(4, 12), '353': R(7, 9), '354': R(7, 9), '355': R(8, 9), '356': R(8), '357': R(8),
  '358': R(5, 12), '359': R(7, 9), '370': R(8), '371': R(8), '372': R(7, 10), '373': R(8), '374': R(8), '375': R(9),
  '376': R(6, 9), '377': R(8, 9), '378': R(6, 12), '380': R(9), '381': R(6, 12), '382': R(6, 9), '383': R(8, 9),
  '385': R(8, 12), '386': R(8), '387': R(8, 9), '389': R(8), '420': R(9), '421': R(9), '423': R(7, 9),
  '501': R(7), '502': R(8), '503': R(8), '504': R(8), '505': R(8), '506': R(8), '507': R(7, 8), '509': R(8),
  '590': R(9), '591': R(8, 9), '592': R(7), '593': R(8, 9), '594': R(9), '595': R(6, 9), '596': R(9),
  '597': R(6, 7), '598': R(8), '599': R(7, 8),
  '670': R(7, 8), '673': R(7), '674': R(7), '675': R(7, 8), '676': R(5, 7), '677': R(5, 7), '678': R(5, 7),
  '679': R(7), '680': R(7), '685': R(5, 10), '686': R(5, 8), '687': R(6), '689': R(6, 8), '691': R(7), '692': R(7),
  '850': R(8, 10), '852': R(8), '853': R(8), '855': R(8, 9), '856': R(8, 10), '880': R(8, 10), '886': R(8, 9),
  '960': R(7), '961': R(7, 8), '962': R(8, 9), '963': R(8, 10), '964': R(8, 10), '965': R(7, 8), '966': R(8, 9),
  '967': R(7, 9), '968': R(7, 8), '970': R(8, 9), '971': R(8, 9), '972': R(8, 9), '973': R(8), '974': R(7, 8),
  '975': R(7, 8), '976': R(7, 8), '977': R(8, 10), '992': R(9), '993': R(8), '994': R(9), '995': R(9), '996': R(9),
  '998': R(9),
};

export type PhoneReason = 'ok' | 'empty' | 'too_short' | 'too_long' | 'bad_shape';

export interface PhoneCheck {
  /** Ülke kurallarına göre geçerli mi? */
  valid: boolean;
  /** Geçerliyse "+<ülke kodu><numara>"; değilse null (uydurma numara ÜRETİLMEZ). */
  e164: string | null;
  /** Çözülen ülke kodu ("90", "971" …); çözülemediyse null. */
  cc: string | null;
  /** Ülke kodu 90 mı (Türkiye)? Geçersiz numarada da ülke biliniyorsa dolar. */
  isTR: boolean;
  reason: PhoneReason;
}

/** Ülke kodunu ayır (1, sonra 2, sonra 3 hane — ITU kodları önek-çakışmasızdır). */
export function splitCountryCode(intlDigits: string): { cc: string; nsn: string } | null {
  for (const n of [1, 2, 3]) {
    const cc = intlDigits.slice(0, n);
    if (PHONE_NSN_LENGTHS[cc]) return { cc, nsn: intlDigits.slice(n) };
  }
  return null;
}

function checkIntl(d: string): PhoneCheck {
  if (!d || d.startsWith('0')) return { valid: false, e164: null, cc: null, isTR: false, reason: 'bad_shape' };
  const s = splitCountryCode(d);
  if (!s) {
    // Tabloda olmayan ülke kodu: genel E.164 sınırı.
    if (d.length < 8) return { valid: false, e164: null, cc: null, isTR: false, reason: 'too_short' };
    if (d.length > 15) return { valid: false, e164: null, cc: null, isTR: false, reason: 'too_long' };
    return { valid: true, e164: `+${d}`, cc: null, isTR: false, reason: 'ok' };
  }
  const [min, max] = PHONE_NSN_LENGTHS[s.cc];
  const isTR = s.cc === '90';
  if (s.nsn.length < min) return { valid: false, e164: null, cc: s.cc, isTR, reason: 'too_short' };
  if (s.nsn.length > max) return { valid: false, e164: null, cc: s.cc, isTR, reason: 'too_long' };
  if (s.nsn.startsWith('0')) return { valid: false, e164: null, cc: s.cc, isTR, reason: 'bad_shape' };
  return { valid: true, e164: `+${d}`, cc: s.cc, isTR, reason: 'ok' };
}

/**
 * Ham telefon → ülke + geçerlilik. Biçim ayraçları (boşluk . - ( ) /) serbest.
 *  • "+…" / "00…"  → uluslararası; ülke kodunun uzunluk aralığına bakılır.
 *  • 10 hane / 0+10 hane / 90+10 hane (artısız) → Türkiye.
 *  • Artısız, Türk yazımına uymayan 11–15 hane → ülke kodlu sayılır (WhatsApp
 *    kimliği biçimi: "971501234567"); kurala uymuyorsa geçersiz.
 */
export function analyzePhone(raw: string | null | undefined): PhoneCheck {
  const s = String(raw ?? '').trim();
  const digits = s.replace(/\D/g, '');
  if (!digits) return { valid: false, e164: null, cc: null, isTR: false, reason: 'empty' };

  if (s.startsWith('+') || s.startsWith('00')) {
    const d = s.startsWith('+') ? digits : digits.slice(2);
    // "+5321234567": ülke kodu unutulmuş Türk cebi (5 ile başlayan tam 10 hane).
    // whatsappOrderBridge.internationalPhoneDigits ve üyelik SQL'i ile AYNI kural.
    if (/^5\d{9}$/.test(d)) return { valid: true, e164: `+90${d}`, cc: '90', isTR: true, reason: 'ok' };
    return checkIntl(d);
  }

  if (digits.length === 10 && !digits.startsWith('0')) return checkIntl(`90${digits}`);
  if (digits.length === 11 && digits.startsWith('0') && digits[1] !== '0') return checkIntl(`90${digits.slice(1)}`);
  if (digits.length === 12 && digits.startsWith('90')) return checkIntl(digits);
  if (digits.startsWith('90')) return checkIntl(digits); // 90'lı ama uzunluğu yanlış → geçersiz TR
  if (digits.startsWith('0')) {
    return { valid: false, e164: null, cc: '90', isTR: true, reason: digits.length < 11 ? 'too_short' : 'too_long' };
  }
  if (digits.length < 10) return { valid: false, e164: null, cc: null, isTR: false, reason: 'too_short' };
  return checkIntl(digits);
}

/** Geçerli numaranın E.164 yazımı; geçersizse null. */
export function toE164(raw: string | null | undefined): string | null {
  return analyzePhone(raw).e164;
}

/**
 * Gösterim: Türk numarası "0507 441 34 74"; yurt dışı numara E.164 ("+971501234567");
 * geçersiz numara YAZILDIĞI GİBİ (asla kırpılıp Türk numarasına benzetilmez).
 */
export function phonePretty(raw: string | null | undefined): string {
  const s = String(raw ?? '').trim();
  const c = analyzePhone(s);
  if (!c.valid || !c.e164) return s;
  if (!c.isTR) return c.e164;
  const n = c.e164.slice(3);
  return `0${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 8)} ${n.slice(8)}`;
}
