// ============================================================================
// GLOBAL BLOG MERKEZİ — saf çekirdek (ADDITIVE, 11 Eki 2026; ağ yok → node --test:
// lib/globalBlog.test.ts).
//
// TEK İÇERİK MOTORU: TR blogla AYNI kayıt biçimi. Her dilin yazıları kendi
// seo_page("/<dil>/blog") kaydının body_blocks dizisinde "blog-post" bloklarıdır
// (Admin Blog Merkezi'nin dil seçicisi yazar; alan eşlemesi lib/blogMerge.ts ile
// birebir aynı). İkinci CMS / ikinci kaynak YOK; yeni tablo / migration YOK.
//
// KURALLAR:
//  • Dil bağımsızlığı: her dil ayrı kayıt → bir dilin yayını diğer dili değiştirmez.
//  • Kod güvenlik ağı YOK (içerik kod değildir): o dilde yayında yazı yoksa liste 404.
//  • Görünürlük TR ile aynı: published → listede + index; unpublished → adres açık,
//    noindex, listede yok; draft / deleted → 404.
//  • hreflang: aynı `translationKey`i taşıyan, indexlenebilir ve kendine canonical
//    dil sürümleri + (anahtar bir TR yazısının slug'ı ise ve o yazı indexlenebilirse)
//    Türkçe sürüm. Aile kurucusu ürün/kategoriyle AYNI fonksiyon (hreflangFamily).
// ============================================================================
import type { BlogPost } from "../../components/blog/BlogExperience";
import { isIndexable, isPublished, isReachableDetail, parseBlocks, selectHomepagePosts, type ManagedBlock } from "../blogMerge.ts";
import { GLOBAL_LOCALES, localeBlogPath, type GlobalLocale } from "./config.ts";
import { hreflangFamily } from "./hreflangFamily.ts";
import { withXDefault } from "./hreflang.ts";

export type LocaleBlogDocs = Partial<Record<GlobalLocale, BlogPost[]>>;
type Absolute = (path: string) => string;

/** body_blocks → o dilin kayıtları (kalıcı silinenler düşer). Sıra Admin'deki sıradır. */
export function localeBlogPostsFromBlocks(blocks: unknown): BlogPost[] {
  if (!Array.isArray(blocks)) return [];
  return parseBlocks(blocks as ManagedBlock[]).filter((p) => p.state !== "deleted");
}

/** Liste / ana sayfa / rehber: yalnız yayında olanlar. */
export function listedBlogPosts(posts: BlogPost[]): BlogPost[] {
  return posts.filter(isPublished);
}

/** Detay sayfası: yayında + yayından kaldırılan (noindex) görünür; taslak ve silinen 404. */
export function reachableBlogPost(posts: BlogPost[], slug: string): BlogPost | null {
  const post = posts.find((p) => p.slug === slug);
  return post && isReachableDetail(post) ? post : null;
}

/** Ana sayfa rehber bölümü: "Ana sayfada göster" sırası, yoksa en yeni yayınlar (TR ile aynı kural). */
export function homepageBlogPosts(posts: BlogPost[], limit = 3): BlogPost[] {
  return selectHomepagePosts(listedBlogPosts(posts), limit);
}

/** Canonical yolu: Admin'de girilen canonical (göreli ya da mutlak) yoksa kendi adresi. */
export function blogPostCanonical(locale: GlobalLocale, post: BlogPost): string {
  const c = post.canonical?.trim();
  return c ? c : localeBlogPath(locale, post.slug);
}

/** Kendine canonical mı? (Başka adrese canonical edilen sürüm hreflang / sitemap'e girmez.) */
export function isSelfCanonical(locale: GlobalLocale, post: BlogPost): boolean {
  const self = localeBlogPath(locale, post.slug);
  const c = post.canonical?.trim();
  if (!c) return true;
  const path = c.replace(/^https?:\/\/[^/]+/i, "").replace(/\/+$/, "");
  return path === self;
}

/** TR yazısı (kendi slug'ı ya da translationKey'i) bu anahtarla eşleşiyor mu? */
function trMatches(post: BlogPost, key: string): boolean {
  return post.slug === key || post.translationKey === key;
}

function trSelfCanonical(post: BlogPost): boolean {
  const c = post.canonical?.trim();
  if (!c) return true;
  return c.replace(/^https?:\/\/[^/]+/i, "").replace(/\/+$/, "") === `/blog/${post.slug}`;
}

/** Bir anahtarın dil sürümleri (indexlenebilir + kendine canonical). */
export function blogLocaleVersions(key: string, docs: LocaleBlogDocs): Partial<Record<GlobalLocale, BlogPost>> {
  const out: Partial<Record<GlobalLocale, BlogPost>> = {};
  if (!key) return out;
  for (const l of GLOBAL_LOCALES) {
    const p = (docs[l] ?? []).find((x) => x.translationKey === key && isIndexable(x) && isSelfCanonical(l, x));
    if (p) out[l] = p;
  }
  return out;
}

/** Türkçe karşılık (indexlenebilir + kendine canonical) — yoksa null. */
export function trBlogCounterpart(key: string, trPosts: BlogPost[] | null | undefined): BlogPost | null {
  if (!key || !trPosts) return null;
  return trPosts.find((p) => trMatches(p, key) && isIndexable(p) && trSelfCanonical(p)) ?? null;
}

/**
 * Dil yazısı sayfasının hreflang ailesi. Yazı kendisi indexlenebilir + kendine canonical değilse
 * ya da anahtarı yoksa null (küme basılmaz). Türkçe sayfa AYNI girdiden aynı kümeyi basar
 * (trBlogPostFamily) → karşılıklılık korunur.
 */
export function localeBlogPostFamily(
  locale: GlobalLocale,
  post: BlogPost,
  docs: LocaleBlogDocs,
  trPosts: BlogPost[] | null | undefined,
  absolute: Absolute,
): Record<string, string> | null {
  const key = post.translationKey?.trim();
  if (!key || !isIndexable(post) || !isSelfCanonical(locale, post)) return null;
  const versions = blogLocaleVersions(key, { ...docs, [locale]: [post, ...(docs[locale] ?? []).filter((p) => p.slug !== post.slug)] });
  const localeUrls: Record<string, string> = {};
  for (const [l, p] of Object.entries(versions)) localeUrls[l] = absolute(localeBlogPath(l as GlobalLocale, p!.slug));
  const tr = trBlogCounterpart(key, trPosts);
  return hreflangFamily(tr ? absolute(`/blog/${tr.slug}`) : null, localeUrls);
}

/**
 * Türkçe yazı sayfasının hreflang ailesi: anahtar = TR yazısının translationKey'i, yoksa slug'ı.
 * Dil sürümü yoksa null → TR sayfanın çıktısı bugünküyle birebir aynı.
 */
export function trBlogPostFamily(
  post: BlogPost,
  docs: LocaleBlogDocs,
  absolute: Absolute,
): Record<string, string> | null {
  if (!isIndexable(post) || !trSelfCanonical(post)) return null;
  const keys = new Set([post.slug, post.translationKey?.trim()].filter((k): k is string => !!k));
  const localeUrls: Record<string, string> = {};
  for (const key of keys) {
    for (const [l, p] of Object.entries(blogLocaleVersions(key, docs))) {
      if (!localeUrls[l]) localeUrls[l] = absolute(localeBlogPath(l as GlobalLocale, p!.slug));
    }
  }
  if (Object.keys(localeUrls).length === 0) return null;
  return hreflangFamily(absolute(`/blog/${post.slug}`), localeUrls);
}

/** Dil blog listesi sayfalarının ailesi: en az bir indexlenebilir yazısı olan diller (TR liste sayfası küme dışı). */
export function localeBlogIndexFamily(docs: LocaleBlogDocs, absolute: Absolute): Record<string, string> | null {
  const urls: Record<string, string> = {};
  for (const l of GLOBAL_LOCALES) {
    if ((docs[l] ?? []).some((p) => isIndexable(p) && isSelfCanonical(l, p))) urls[l] = absolute(localeBlogPath(l));
  }
  if (Object.keys(urls).length < 2) return null;
  return withXDefault(urls);
}

/** Sitemap girdileri: liste sayfası (en az bir indexlenebilir yazı varken) + indexlenebilir, kendine canonical yazılar. */
export function blogSitemapEntries(locale: GlobalLocale, posts: BlogPost[]): { path: string; lastmod: string | null }[] {
  const indexable = posts.filter((p) => isIndexable(p) && isSelfCanonical(locale, p));
  if (indexable.length === 0) return [];
  const dates = indexable.map((p) => p.publishedAt).filter((d): d is string => !!d && !Number.isNaN(Date.parse(d)));
  const newest = dates.length ? dates.sort().at(-1)! : null;
  return [
    { path: localeBlogPath(locale), lastmod: newest },
    ...indexable.map((p) => ({ path: localeBlogPath(locale, p.slug), lastmod: p.publishedAt && !Number.isNaN(Date.parse(p.publishedAt)) ? p.publishedAt : null })),
  ];
}

/** BlogPosting yapılandırılmış verisi (TR detay sayfasıyla aynı alanlar + dil + tarih). */
export function blogPostingJsonLd(locale: GlobalLocale, post: BlogPost, absolute: Absolute): Record<string, unknown> {
  const url = absolute(localeBlogPath(locale, post.slug));
  const image = post.image ? (/^https?:\/\//i.test(post.image) ? post.image : absolute(post.image)) : undefined;
  const date = post.publishedAt && !Number.isNaN(Date.parse(post.publishedAt)) ? new Date(post.publishedAt).toISOString() : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription || post.excerpt,
    ...(image ? { image } : {}),
    inLanguage: locale,
    ...(date ? { datePublished: date } : {}),
    author: { "@type": "Organization", name: "ÇiçekYolla" },
    publisher: { "@type": "Organization", name: "ÇiçekYolla" },
    mainEntityOfPage: url,
    url,
  };
}

