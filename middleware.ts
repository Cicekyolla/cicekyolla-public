import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SITE_INDEXABLE } from "@/lib/site-config";
import { resolveLegacyLocation, type LegacyLocationResult } from "@/lib/legacy-location-redirect";
import {
  resolveMidCicek,
  resolveSayfaLegacy,
  resolveKategoriLegacy,
  resolveCicekleriLegacy,
  locationFallback,
  guardedCategoryTarget,
} from "@/lib/legacy-recovery";
import legacyCategorySlugs from "@/lib/legacy-category-slugs.json";
import { resolveManagedRedirect, isManagedRedirectTarget } from "@/lib/managed-redirects";
import { isGlobalLocalePath } from "@/lib/global/config";
const categorySlugs = new Set(legacyCategorySlugs);
/* ADDITIVE (Kategori Merkezi URL Kararı): legacy kategori kuralları hedefi
   statik listeden (/kategori/{eski-slug}) üretir. Kategori Merkezi'nden onaylı
   bir URL değişikliği varsa o hedef artık yönetilen bir 301 KAYNAĞIDIR; burada
   tek adımda nihai hedefe düzleştirilir (301→301 zinciri YOK, statik dosya
   elle senkron GEREKMEZ). Yönetilen yönlendirme yoksa / API erişilemezse hedef
   bugünkü haliyle döner — mevcut davranış birebir korunur. */
async function flattenManagedTarget(target: string): Promise<string> {
  const managed = await resolveManagedRedirect(target);
  return managed?.to ?? target;
}
export async function middleware(req: NextRequest) {
  // GLOBAL Faz 1: /de ve /en locale yüzeyleri legacy redirect/location
  // resolver'larına GİRMEZ (kanun: locale path'leri yutulmamalı).
  if (isGlobalLocalePath(req.nextUrl.pathname)) {
    return NextResponse.next();
  }
  /* EK (DÖNGÜ GUARD) — ADDITIVE: gelen yol, onaylı bir yönetilen 301'in HEDEFİ
     ise o yol canlı bir sayfadır; legacy kurallar onu yutmamalı. Aksi halde
     "/il → /il-cicekci" ile legacy "/il-cicekci → /il" birbirini kovalar
     (ERR_TOO_MANY_REDIRECTS). Legacy listelerden hiçbir şey silinmedi.
     FAIL-SAFE: API erişilemezse false → bugünkü davranış birebir sürer. */
  const legacyMuaf = await isManagedRedirectTarget(req.nextUrl.pathname);
  /* EK (ÖZEL GÜN "-cicekleri") — next.config.js'ten TAŞINDI (bkz.
     legacy-recovery.ts::resolveCicekleriLegacy). Config katmanı middleware'den
     ÖNCE çalıştığı ve statik olduğu için operatör onaylı yönetilen 301'i
     eziyordu: /masa-cicekleri → 308 /kategori/masa → 404, oysa onaylı hedef
     /kategori/nikah-masasi-cicekleri (200).
     Kural zincirin BAŞINDA kalır (config'teki yeriyle aynı sıra); tek fark:
     adres yönetilen bir 301'in KAYNAĞI ya da HEDEFİ ise devreye girmez. */
  const cicekleriTarget = resolveCicekleriLegacy(req.nextUrl.pathname);
  if (cicekleriTarget && !legacyMuaf && !(await resolveManagedRedirect(req.nextUrl.pathname))) {
    return NextResponse.redirect(new URL(cicekleriTarget, req.nextUrl.origin), 308);
  }
const sayfaTarget = legacyMuaf ? null : resolveSayfaLegacy(req.nextUrl.pathname);
  if (sayfaTarget) {
    return NextResponse.redirect(new URL(sayfaTarget, req.nextUrl.origin), 301);
  }
  // EK (KATEGORİ KONUM KURTARMA): /kategori/{il}-{ilce}-cicek-yolla → /il/ilce 301.
  // Yalnızca konum çözülürse yönlendirir; gerçek kategori sayfaları etkilenmez.
  const kategoriTarget = legacyMuaf ? null : resolveKategoriLegacy(req.nextUrl.pathname);
  if (kategoriTarget) {
    return NextResponse.redirect(new URL(kategoriTarget, req.nextUrl.origin), 301);
  }
  const legacyLocation: LegacyLocationResult = legacyMuaf
    ? { matched: false }
    : resolveLegacyLocation(req.nextUrl.pathname);
  if (legacyLocation.matched && legacyLocation.destination) {
    return NextResponse.redirect(
      new URL(legacyLocation.destination, req.nextUrl.origin),
      301,
    );
  }
  // "-cicek-ID" hem eski konum hem kategori biçiminde kullanılmış. Gerçek bir
  // konum hedefi bulunamadığında yalnız mevcut kategori envanterinde birebir
  // karşılığı varsa kategoriye yönlendir.
  if (
    legacyLocation.matched &&
    !legacyLocation.destination &&
    legacyLocation.suffix === "cicek"
  ) {
    const categorySlug = `${legacyLocation.normalizedBase}-cicek`;
    if (categorySlugs.has(categorySlug)) {
      return NextResponse.redirect(
        new URL(await flattenManagedTarget(`/kategori/${categorySlug}`), req.nextUrl.origin),
        301,
      );
    }
  }
  // EK (kurtarma): Konum eşleşti ama whitelist'te yayınlanmış hedef yok.
  // Doğal 404'e düşmek yerine güvenli konum hedefine 301 (il sayfası ya da
  // /urunler). Backend il/ilçe sayfalarını yayınlayıp whitelist genişleyince
  // bu URL'ler otomatik olarak yukarıdaki /il/ilce dalından geçer.
  if (legacyLocation.matched && !legacyLocation.destination) {
    return NextResponse.redirect(
      new URL(locationFallback(legacyLocation.normalizedBase), req.nextUrl.origin),
      301,
    );
  }
  // EK (kurtarma): "{il}-cicek-{ilce}-{id}" ortada-cicek formatı. Ana resolver
  // soneki sonda aradığı için bunu kaçırır; burada güvenli konuma çözülür.
  const midCicek = legacyMuaf ? null : resolveMidCicek(req.nextUrl.pathname);
  if (midCicek) {
    return NextResponse.redirect(new URL(midCicek, req.nextUrl.origin), 301);
  }
  // Konum kalıbına girmeyen eski "/kategori-slug-123" adreslerini korur.
  // GUARD: hedef kategori gerçekten yoksa var olmayan kategoriye 301 verilmez
  // (301→404 zinciri engellenir); güvenli hedefe (/urunler) düşülür.
  if (!legacyMuaf && !legacyLocation.matched) {
    const legacyCategory = req.nextUrl.pathname.match(/^\/([a-z0-9-]+)-\d+\/?$/);
    if (legacyCategory) {
      return NextResponse.redirect(
        new URL(await flattenManagedTarget(guardedCategoryTarget(legacyCategory[1])), req.nextUrl.origin),
        301,
      );
    }
  }
  // EK (YÖNETİLEN YÖNLENDİRME): AI Merkezi'nde onaylanmış 301'ler.
  // EN SONDA bakılır — yukarıdaki hiçbir kural tutmadıysa. Mevcut kurallar
  // her zaman önceliklidir ve davranışları değişmemiştir.
  // API erişilemezse/yavaşsa null döner ve istek bugünkü gibi devam eder.
  const managed = await resolveManagedRedirect(req.nextUrl.pathname);
  if (managed) {
    return NextResponse.redirect(
      new URL(managed.to, req.nextUrl.origin),
      managed.code,
    );
  }

  const res = NextResponse.next();
  const isPreview = req.nextUrl.pathname === "/onizleme";
  if (!SITE_INDEXABLE || isPreview) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  if (isPreview) {
    res.headers.set("Referrer-Policy", "no-referrer");
    res.headers.set("Cache-Control", "private, no-store");
  }
  return res;
}
export const config = {
  matcher: [
    "/onizleme",
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|sitemaps|checkout|sepet|hesabim|giris|siparis-takibi|siparis-takip|.*\\..*).*)",
    /* EK (ÖZEL GÜN "-cicekleri") — DAR KAPSAM.
       Kural next.config.js'ten middleware'e taşındığı için bu sınıfın middleware'e
       ULAŞMASI gerekiyor. Yukarıdaki genel dışlama listesi önekleri SINIR OLMADAN
       eşliyor: "sepette-aranjmanlar-cicekleri" adresi "sepet" token'ına takılıp
       middleware'e hiç ulaşmıyordu (308 -> 404 regresyonu).
       Genel matcher semantiği DEĞİŞMEDİ; yalnız "-cicekleri" ile biten TEK SEGMENTLİ
       yollar ek olarak kapsanır — taşınan kuralın kendi kalıbıyla birebir aynı
       karakter sınıfı ([a-z-]+). Gerçek /sepet, /sepet/..., /checkout, /giris,
       /hesabim, /siparis-takibi rotaları bu kalıba uymadığı için etkilenmez.
       Genel önek dışlaması (sepet/giris/hesabim...) bu PR'da ELE ALINMIYOR. */
    "/:slug([a-z-]+)-cicekleri",
    "/:slug([a-z-]+)-cicekleri-:id(\\d+)",
  ],
};
