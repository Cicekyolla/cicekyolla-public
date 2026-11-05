// ============================================================================
// GLOBAL — WHATSAPP ÖNMETNİ + SAYFA ETİKETİ (C4, 5 Kas 2026, ADDITIVE).
//
// SORUN: 13 dil sayfalarındaki WhatsApp bağlantılarının çoğu (üst menü, alt
// bilgi, yüzen buton, sayfa sonu çağrıları) hazır mesajsız açılıyordu. Müşteri
// boş kutuyla WhatsApp'a düşüyor, dili ve geldiği sayfa kayboluyordu.
//
// ÇÖZÜM: tıklama anında (components/AdsWhatsAppRef.tsx) — yalnız 13 global dil
// yolunda — boş bağlantıya o dilde genel önmetin, her bağlantıya da aynı satırın
// sonuna kısa sayfa etiketi `[p: en/hotel-delivery]` eklenir.
//   • TR yolları hiç değişmez (null döner).
//   • Dolu önmetin (ürün, otel, güvence bloğu) korunur; yalnız etiket eklenir.
//   • Etiket AYNI SATIRDA: WhatsApp ikinci satırı düşürüyor (27 Ağu dersi).
//   • Reklam etiketi `[ref: …]` bundan SONRA eklenir; API deseni satırın
//     herhangi bir yerinde bulur (whatsappOrderBridge.ts REF_DESENI).
// ============================================================================
// Yalnız tip içe aktarılır: dosya node --test altında da (uzantısız yol) yüklenebilsin.
import type { GlobalLocale } from "./config";

/** 13 dilde genel önmetin (sahip onayı: master §23). */
export const WA_PREFILL: Readonly<Record<GlobalLocale, string>> = Object.freeze({
  en: "Hello, I'd like to order flowers.",
  de: "Hallo, ich möchte Blumen bestellen.",
  fr: "Bonjour, je souhaite commander des fleurs.",
  nl: "Hallo, ik wil graag bloemen bestellen.",
  it: "Buongiorno, vorrei ordinare dei fiori.",
  es: "Hola, quiero pedir flores.",
  pt: "Olá, gostaria de encomendar flores.",
  az: "Salam, gül sifariş etmək istəyirəm.",
  ru: "Здравствуйте, я хочу заказать цветы.",
  ar: "مرحباً، أريد طلب الزهور.",
  zh: "您好，我想订购鲜花。",
  ja: "こんにちは、お花を注文したいです。",
  ko: "안녕하세요, 꽃을 주문하고 싶습니다.",
});

/** Sayfa etiketinin başlangıcı (ikinci kez eklenmesin diye aranır). */
export const WA_PAGE_TAG = "[p:";
const TAG_MAX = 60;

/** Yol 13 global dilden biriyle başlıyorsa o dil; değilse null (TR ve diğer her şey). */
export function globalLocaleOfPath(pathname: string | null | undefined): GlobalLocale | null {
  const seg = String(pathname || "").split("/")[1] || "";
  return Object.prototype.hasOwnProperty.call(WA_PREFILL, seg) ? (seg as GlobalLocale) : null;
}

/**
 * Yol → kısa etiket gövdesi: "en/hotel-delivery". Sorgu/parça atılır, yalnız
 * [a-z0-9/_-] kalır, en çok 60 karakter. Global dil yolu değilse null.
 */
export function pageTagOf(pathname: string | null | undefined): string | null {
  if (!globalLocaleOfPath(pathname)) return null;
  let p = String(pathname).split(/[?#]/)[0];
  try { p = decodeURIComponent(p); } catch { /* ham haliyle devam */ }
  const body = p
    .toLowerCase()
    .replace(/[^a-z0-9/_-]/g, "")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .slice(0, TAG_MAX)
    .replace(/\/+$/, "");
  return body || null;
}

/**
 * Global dil yolunda WhatsApp bağlantısını önmetin + sayfa etiketiyle
 * zenginleştirir. Değişiklik gerekmiyorsa (TR yolu, WhatsApp değil, etiket
 * zaten var, çözümlenemiyor) null döner — çağıran bağlantıya karışmaz.
 */
export function withGlobalWaPrefill(href: string, pathname: string, taban: string): string | null {
  const locale = globalLocaleOfPath(pathname);
  const tag = pageTagOf(pathname);
  if (!locale || !tag) return null;

  let url: URL;
  try { url = new URL(href, taban); } catch { return null; }
  if (url.hostname !== "wa.me" && url.hostname !== "api.whatsapp.com") return null;

  const mevcut = (url.searchParams.get("text") ?? "").trim();
  if (mevcut.includes(WA_PAGE_TAG)) return null;
  // Satır sonlarını tek boşluğa indir: etiket ve önmetin TEK satırda kalmalı.
  const govde = (mevcut || WA_PREFILL[locale]).replace(/\s*\n+\s*/g, " ");
  url.searchParams.set("text", `${govde} ${WA_PAGE_TAG} ${tag}]`);
  return url.toString();
}
