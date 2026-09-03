// ---------------------------------------------------------------------------
// GLOBAL LOKASYON ETİKETLERİ (saf modül; JSX yok → node --test ile doğrudan
// test edilir). Bölüm başlığı / breadcrumb etiketleri ve ŞEHİR EKSONİMLERİ.
//
// Buradaki metinler ARAYÜZ etiketidir — SEO içeriği DEĞİL. Yer adları TR
// location core'dan olduğu gibi kullanılır; yalnız ŞEHİR adı o dilin
// eksonimiyle yazılır (Istanbul/Estambul/Стамбул…), çünkü müşteri şehri kendi
// dilinde arar (3 Eyl 2026 genişlemesi: 4 destinasyon).
// ---------------------------------------------------------------------------
import { isDestinationRoot, type DestinationRoot, type GlobalLocale } from "./config.ts";

/** Şehir eksonimleri — o dilde aranan/yazılan biçim. TR core adı breadcrumb'da kalır. */
export const CITY_NAMES: Record<GlobalLocale, Record<DestinationRoot, string>> = {
  en: { istanbul: "Istanbul", antalya: "Antalya", mugla: "Mugla", izmir: "Izmir" },
  de: { istanbul: "Istanbul", antalya: "Antalya", mugla: "Muğla", izmir: "Izmir" },
  fr: { istanbul: "Istanbul", antalya: "Antalya", mugla: "Muğla", izmir: "Izmir" },
  nl: { istanbul: "Istanbul", antalya: "Antalya", mugla: "Muğla", izmir: "Izmir" },
  it: { istanbul: "Istanbul", antalya: "Antalya", mugla: "Muğla", izmir: "Smirne" },
  es: { istanbul: "Estambul", antalya: "Antalya", mugla: "Muğla", izmir: "Esmirna" },
  pt: { istanbul: "Istambul", antalya: "Antália", mugla: "Muğla", izmir: "Esmirna" },
  az: { istanbul: "İstanbul", antalya: "Antalya", mugla: "Muğla", izmir: "İzmir" },
  ru: { istanbul: "Стамбул", antalya: "Анталья", mugla: "Мугла", izmir: "Измир" },
  ar: { istanbul: "إسطنبول", antalya: "أنطاليا", mugla: "موغلا", izmir: "إزمير" },
  zh: { istanbul: "伊斯坦布尔", antalya: "安塔利亚", mugla: "穆拉", izmir: "伊兹密尔" },
  ja: { istanbul: "イスタンブール", antalya: "アンタルヤ", mugla: "ムーラ", izmir: "イズミル" },
  ko: { istanbul: "이스탄불", antalya: "안탈리아", mugla: "무을라", izmir: "이즈미르" },
};

/** Çekimli diller: "İstanbulun rayonları", "Районы Стамбула". */
const CITY_GEN: Record<"az" | "ru", Record<DestinationRoot, string>> = {
  az: { istanbul: "İstanbulun", antalya: "Antalyanın", mugla: "Muğlanın", izmir: "İzmirin" },
  ru: { istanbul: "Стамбула", antalya: "Антальи", mugla: "Муглы", izmir: "Измира" },
};

/** O dilde şehir adı (bilinmeyen kök gelirse slug okunabilir yedek). */
export function cityDisplayName(locale: GlobalLocale, city: string): string {
  const m = CITY_NAMES[locale] as Record<string, string>;
  return m[city] ?? city.charAt(0).toUpperCase() + city.slice(1);
}

/** Fransızca: sesli harfle başlayan şehirde "d'" (d'Istanbul, d'Izmir), aksi "de ". */
function frDe(name: string): string {
  return /^[aeiouyàâäéèêëîïôöùûüAEIOUY]/.test(name) ? `d'${name}` : `de ${name}`;
}

export type Etiket = {
  /** Şehir kökünde ilçe bölümünün başlığı */
  ilceler: (locale: GlobalLocale, city: DestinationRoot) => string;
  /** İlçe sayfasında mahalle bölümünün başlığı — {d} = ilçe adı */
  mahalleler: (d: string) => string;
  /** Bölüm üstü küçük etiket */
  ustEtiket: string;
  /** Breadcrumb aria-label */
  yol: string;
};

export const LABELS: Record<GlobalLocale, Etiket> = {
  en: { ilceler: (l, c) => `Districts of ${CITY_NAMES[l][c]}`, mahalleler: (d) => `Neighbourhoods of ${d}`, ustEtiket: "Delivery areas", yol: "Breadcrumb" },
  de: { ilceler: (l, c) => `Bezirke von ${CITY_NAMES[l][c]}`, mahalleler: (d) => `Stadtteile von ${d}`, ustEtiket: "Liefergebiete", yol: "Navigationspfad" },
  fr: { ilceler: (l, c) => `Arrondissements ${frDe(CITY_NAMES[l][c])}`, mahalleler: (d) => `Quartiers de ${d}`, ustEtiket: "Zones de livraison", yol: "Fil d'Ariane" },
  nl: { ilceler: (l, c) => `Districten van ${CITY_NAMES[l][c]}`, mahalleler: (d) => `Wijken van ${d}`, ustEtiket: "Bezorggebieden", yol: "Kruimelpad" },
  it: { ilceler: (l, c) => `Distretti di ${CITY_NAMES[l][c]}`, mahalleler: (d) => `Quartieri di ${d}`, ustEtiket: "Zone di consegna", yol: "Percorso" },
  es: { ilceler: (l, c) => `Distritos de ${CITY_NAMES[l][c]}`, mahalleler: (d) => `Barrios de ${d}`, ustEtiket: "Zonas de entrega", yol: "Ruta de navegación" },
  pt: { ilceler: (l, c) => `Distritos de ${CITY_NAMES[l][c]}`, mahalleler: (d) => `Bairros de ${d}`, ustEtiket: "Áreas de entrega", yol: "Caminho" },
  az: { ilceler: (_l, c) => `${CITY_GEN.az[c]} rayonları`, mahalleler: (d) => `${d} məhəllələri`, ustEtiket: "Çatdırılma bölgələri", yol: "Naviqasiya" },
  ru: { ilceler: (_l, c) => `Районы ${CITY_GEN.ru[c]}`, mahalleler: (d) => `Кварталы района ${d}`, ustEtiket: "Зоны доставки", yol: "Навигация" },
  ar: { ilceler: (l, c) => `مناطق ${CITY_NAMES[l][c]}`, mahalleler: (d) => `أحياء ${d}`, ustEtiket: "مناطق التوصيل", yol: "مسار التنقل" },
  zh: { ilceler: (l, c) => `${CITY_NAMES[l][c]}各区`, mahalleler: (d) => `${d}的街区`, ustEtiket: "配送区域", yol: "导航路径" },
  ja: { ilceler: (l, c) => `${CITY_NAMES[l][c]}の地区`, mahalleler: (d) => `${d}の町名`, ustEtiket: "配達エリア", yol: "パンくずリスト" },
  ko: { ilceler: (l, c) => `${CITY_NAMES[l][c]}의 구`, mahalleler: (d) => `${d}의 동네`, ustEtiket: "배송 지역", yol: "경로" },
};

/** Şehir kökü bilinmiyorsa İstanbul etiketi (eski çağıranlar: tek parametre). */
export function ilceBasligi(locale: GlobalLocale, city: string = "istanbul"): string {
  return LABELS[locale].ilceler(locale, isDestinationRoot(city) ? city : "istanbul");
}
export function mahalleBasligi(locale: GlobalLocale, districtName: string): string {
  return LABELS[locale].mahalleler(districtName);
}
