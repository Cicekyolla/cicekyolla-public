// ============================================================================
// GLOBAL VERSION 80 — Bannerlar (structure.banners; dil metinleri x.banner.<key>.*).
// 1 banner → tam genişlik kart; birden fazla → yatay kaydırmalı şerit (CSS
// scroll-snap; kütüphane YOK). Başlık yoksa yalnız görsel + bağlantı.
// Pasif ya da görselsiz banner görünüm modelinde (view.ts) zaten elenir; liste
// boşsa bölüm hiçbir şey basmaz. Kurallar v80.css'te (.v80-banner…): satır içi
// <style> KULLANILMAZ (">" sunucuda kaçar → hydration uyuşmazlığı).
// ============================================================================
import Image, { getImageProps } from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { V80View, V80BannerView } from "@/lib/global/v80/view";
import { v80ImageUnoptimized } from "@/lib/global/v80/schema";

/** Mobil görsel kırılımı (DESIGN 1.5: <768px). */
export const V80_MOBILE_MEDIA = "(max-width: 767px)";
const V80_DESKTOP_MEDIA = "(min-width: 768px)";
/** Yalnız mobil görsel varken masaüstünde ağ isteği yapmayan 1×1 saydam kaynak. */
const BLANK_GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

interface V80ArtImageProps {
  src: string | null;
  srcMobile: string | null;
  alt: string;
  sizes: string;
  sizesMobile?: string;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Masaüstü + mobil görsel (sanat yönetimi). Mobil görsel yoksa bugünkü tek next/image.
 * İkisi de varsa <picture>: tarayıcı TEK aday indirir; priority → o tek <img> yüksek öncelikli
 * (LCP için tek öncelikli görsel; <picture> içindeki görsel iki kez önyüklenmez).
 * Mutlak URL'ler ve /r2/ proxy yolları optimize edilmez (v80ImageUnoptimized).
 */
export function V80ArtImage({ src, srcMobile, alt, sizes, sizesMobile = "100vw", priority = false, className, style }: V80ArtImageProps) {
  if (!src && !srcMobile) return null;
  if (src && !srcMobile) {
    return <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className={className} style={style} unoptimized={v80ImageUnoptimized(src)} />;
  }
  const mobileSrc = srcMobile as string;
  const mobile = getImageProps({ src: mobileSrc, alt, fill: true, priority, sizes: sizesMobile, className, style, unoptimized: v80ImageUnoptimized(mobileSrc) }).props;
  if (!src) {
    // Masaüstü görseli kaldırılmış: masaüstünde boş çerçeve (bugünkü davranış), mobilde mobil görsel.
    return (
      <picture>
        <source media={V80_DESKTOP_MEDIA} srcSet={BLANK_GIF} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img {...mobile} alt={alt} />
      </picture>
    );
  }
  const desktop = getImageProps({ src, alt, fill: true, priority, sizes, className, style, unoptimized: v80ImageUnoptimized(src) }).props;
  return (
    <picture>
      <source media={V80_MOBILE_MEDIA} srcSet={mobile.srcSet ?? mobile.src} sizes={mobile.srcSet ? mobile.sizes : undefined} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img {...desktop} alt={alt} />
    </picture>
  );
}

/**
 * Başlık, görsel açıklaması ve CTA metni o dilde boşken banner bağlantısının erişilebilir adı
 * (WCAG 2.4.4 / 4.1.2: adsız bağlantı yok). Dil metni girilince bu yedek kullanılmaz.
 */
export const V80_BANNER_LINK_LABEL: Record<V80View["locale"], string> = {
  en: "View campaign",
  de: "Aktion ansehen",
  fr: "Voir l'offre",
  nl: "Actie bekijken",
  it: "Scopri l'offerta",
  es: "Ver la campaña",
  pt: "Ver campanha",
  az: "Kampaniyaya bax",
  ru: "Смотреть акцию",
  ar: "عرض الحملة",
  zh: "查看活动",
  ja: "キャンペーンを見る",
  ko: "캠페인 보기",
};

function BannerCard({ b, sizes, single, fallbackLabel }: { b: V80BannerView; sizes: string; single: boolean; fallbackLabel: string }) {
  const hasText = !!b.title;
  // Alt metin dil metninden; boşsa ve başlık da yoksa bağlantının adı CTA metni olur.
  const alt = b.alt || (hasText ? "" : b.cta);
  // Başlık/alt/CTA hepsi boş → bağlantı adsız kalmasın: dile göre yedek ad (görsel dekoratif kalır).
  const linkLabel = !hasText && !alt ? fallbackLabel : undefined;
  // Metinli kart mobilde daha uzun oran alır (v80.css .has-text) → başlık telefonda kesilmez.
  const mediaCls = ["v80-banner-media", b.imageMobile ? "has-mobile" : "", hasText ? "has-text" : ""].filter(Boolean).join(" ");
  const media = (
    <div className={mediaCls}>
      <V80ArtImage src={b.image} srcMobile={b.imageMobile} alt={alt} sizes={sizes} sizesMobile={single ? "100vw" : "86vw"} className="v80-banner-img" />
      {hasText ? (
        <div className="v80-banner-text">
          <p className="v80-serif v80-banner-title">{b.title}</p>
          {b.body ? <p className="v80-banner-body">{b.body}</p> : null}
          {b.cta && b.href ? (
            <span className="v80-banner-cta">
              {b.cta} <span aria-hidden="true">→</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
  const cls = single ? "v80-banner is-single" : "v80-banner";
  if (!b.href) return <div className={cls}>{media}</div>;
  if (b.href.startsWith("/")) return <Link href={b.href} className={`${cls} v80-card`} aria-label={linkLabel} data-banner-key={b.key}>{media}</Link>;
  return <a href={b.href} className={`${cls} v80-card`} aria-label={linkLabel} data-banner-key={b.key}>{media}</a>;
}

export function V80Banners({ view }: { view: V80View }) {
  // Görünüm modeli zaten aktif + görselli olanları verir; yine de görselsiz öğe ya da boş liste
  // HİÇBİR DOM üretmez: <section> sarmalayıcısından ÖNCE null (başlık/boşluk yok).
  const items = (view.banners ?? []).filter((b) => !!b.image);
  if (!items.length) return null;
  const single = items.length === 1;
  const label = V80_BANNER_LINK_LABEL[view.locale] ?? V80_BANNER_LINK_LABEL.en;
  return (
    <section id="banners" className="v80-banners">
      <div className="v80-wrap">
        {single ? (
          <BannerCard b={items[0]} sizes="(max-width: 767px) 100vw, (max-width: 1440px) 92vw, 1328px" single fallbackLabel={label} />
        ) : (
          <ul className="v80-banner-strip">
            {items.map((b, i) => (
              <li key={b.key}>
                {/* Şeritte yedek adlar sırayla ayrışır (aynı adlı farklı hedefli bağlantı yok). */}
                <BannerCard b={b} sizes="(max-width: 767px) 86vw, (max-width: 1024px) 72vw, 50vw" single={false} fallbackLabel={`${label} (${i + 1}/${items.length})`} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
