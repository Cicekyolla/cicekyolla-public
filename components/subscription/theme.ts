// theme.ts — ABONELİK sayfasının Figma FINAL MASTER tasarım değerleri.
//
// ⚠️ BU DEĞERLER FIGMA EXPORT'UNDAN BİREBİR ALINMIŞTIR. Değiştirilmemiştir,
// yorumlanmamıştır, "iyileştirilmemiştir". Kaynak: Figma Make export
// `src/index.css` @theme bloğu + `src/App.tsx` C sabiti.
//
// NEDEN SAYFAYA ÖZEL: Bu palet ve tipografi (Playfair Display + DM Sans, teal)
// mevcut V72 tasarım sisteminden (Fraunces + Manrope, mor) FARKLIDIR. Figma
// FINAL MASTER olduğu için Figma kazanır; ancak stiller YALNIZ abonelik
// sayfalarına uygulanır — global tema ve mevcut sayfalar ETKİLENMEZ.

export const C = {
  cream: '#faf8f4',
  creamDeep: '#f4efe5',
  petal: '#fdf6f0',
  teal: '#5a8a7d',
  tealDark: '#3d6b60',
  tealLight: '#e8f1ef',
  ink: '#2c2925',
  ink2: '#5a534c',
  ink3: '#9a9088',
  border: '#e4ddd3',
  rose: '#d4857a',
  imgBg: '#ede8df',
} as const;

export const serif = { fontFamily: "'Playfair Display', Georgia, serif" } as const;
export const sans = { fontFamily: "'DM Sans', system-ui, sans-serif" } as const;

/** Figma'daki asset'lerin production yolları. */
export const IMG = {
  hero: '/abonelik/hero.jpg',
  neden: '/abonelik/neden.jpg',
  teslimat: '/abonelik/teslimat.jpg',
  planHaftalik: '/abonelik/plan-haftalik.jpg',
  plan15: '/abonelik/plan-15gunluk.jpg',
  planAylik: '/abonelik/plan-aylik.jpg',
  adimPlan: '/abonelik/adim-plan.gif',
  adimTakvim: '/abonelik/adim-takvim.gif',
  adimKapi: '/abonelik/adim-kapi.gif',
  adimYonet: '/abonelik/adim-yonet.gif',
  perkCicek: '/abonelik/perk-cicek.svg',
  perkAvantaj: '/abonelik/perk-avantaj.svg',
} as const;

/**
 * Plan görselleri plan_key'e göre eşlenir.
 * Admin plana kendi görselini yüklerse (image_url) O KULLANILIR; bu eşleme
 * yalnız Figma'daki varsayılan görselleri korumak içindir.
 */
export const PLAN_GORSELI: Record<string, string> = {
  weekly: IMG.planHaftalik,
  biweekly: IMG.plan15,
  monthly: IMG.planAylik,
};

export const kurus = (minor: number, currency = 'TRY'): string =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(minor / 100);

const AY_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
const GUN_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

/** '2026-09-10' → '10 Eylül'. UTC okunur; saat dilimi kaymasına kapalı. */
export function tarihTr(iso: string, gunAdiIle = false): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  const temel = `${d.getUTCDate()} ${AY_TR[d.getUTCMonth()]}`;
  return gunAdiIle ? `${temel} ${GUN_TR[d.getUTCDay()]}` : temel;
}

export function tarihUzunTr(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${AY_TR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
