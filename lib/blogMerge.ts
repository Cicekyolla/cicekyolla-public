// lib/blogMerge.ts — blog kaynak birleştirmesinin SAF çekirdeği (ADDITIVE, 30.08.2026).
//
// Neden ayrı dosya: burada ağ çağrısı, Next.js bağımlılığı ve yan etki YOKTUR.
// Böylece "veri kaybı imkansız" iddiası birim testle kanıtlanabilir
// (lib/blogMerge.test.ts). lib/blog.ts yalnız veriyi çekip bu fonksiyonları çağırır.
//
// KRİTİK DAVRANIŞ DEĞİŞİKLİĞİ (eski → yeni):
//   ESKİ: saved.length ? saved : codePosts        ← all-or-nothing
//         DB'ye tek yazı yazıldığında koddaki TÜM yazılar kaybolurdu.
//   YENİ: slug bazlı birleştirme                  ← kayıp imkansız
//         DB kaydı olan yazıda DB kazanır; DB'de olmayan kod kaydı listede kalır.
//         Bir yazı ancak DB'de açık bir işaretle listeden çıkar:
//           state:'unpublished' → adres ayakta, noindex, listede yok
//           state:'deleted'     → 404, kod ağı da bastırılır

import type { BlogPost, BlogPostState } from "../components/blog/BlogExperience";

export type ManagedBlock = Record<string, unknown>;

export function str(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return fallback;
}

export function normalizeState(v: unknown): BlogPostState {
  const s = str(v).trim().toLowerCase();
  return s === "draft" || s === "unpublished" || s === "deleted" ? s : "published";
}

export function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/** body_blocks kaydı → BlogPost. Başlığı ya da slug'ı olmayan kayıt yok sayılır. */
export function fromBlock(b: ManagedBlock): BlogPost | null {
  if (str(b.type) !== "blog-post") return null;
  const slug = str(b.value).trim();
  const title = str(b.title).trim();
  if (!slug || !title) return null;

  const post: BlogPost = {
    title,
    slug,
    category: str(b.kind).trim() || "Rehber",
    image: str(b.note).trim(),
    excerpt: str(b.text),
    content: str(b.label),
    state: normalizeState(b.state),
    indexState: str(b.indexState).trim().toLowerCase() === "noindex" ? "noindex" : "index",
  };

  const seoTitle = str(b.seoTitle).trim();
  if (seoTitle) post.seoTitle = seoTitle;
  const metaDescription = str(b.metaDescription).trim();
  if (metaDescription) post.metaDescription = metaDescription;
  const canonical = str(b.canonical).trim();
  if (canonical) post.canonical = canonical;
  const publishedAt = str(b.publishedAt).trim();
  if (publishedAt) post.publishedAt = publishedAt;
  if (b.featured === true || str(b.featured).trim().toLowerCase() === "true") post.featured = true;
  const homeOrder = toNumber(b.homeOrder);
  if (homeOrder !== null) post.homeOrder = homeOrder;

  return post;
}

/** body_blocks dizisi → geçerli blog kayıtları. */
export function parseBlocks(blocks: ManagedBlock[]): BlogPost[] {
  const out: BlogPost[] = [];
  for (const b of blocks) {
    const post = fromBlock(b);
    if (post) out.push(post);
  }
  return out;
}

/**
 * DB kayıtları önce ve öncelikli; DB'de karşılığı olmayan kod kayıtları arkaya eklenir.
 * Kalıcı silinenler (state:'deleted') sonuçtan düşer.
 */
export function mergeSources(saved: BlogPost[], code: BlogPost[]): BlogPost[] {
  const bySlug = new Map<string, BlogPost>();
  const order: string[] = [];
  const seen = new Set<string>();

  for (const post of saved) {
    bySlug.set(post.slug, post);
    if (!seen.has(post.slug)) {
      seen.add(post.slug);
      order.push(post.slug);
    }
  }
  for (const post of code) {
    if (!bySlug.has(post.slug)) bySlug.set(post.slug, post);
    if (!seen.has(post.slug)) {
      seen.add(post.slug);
      order.push(post.slug);
    }
  }

  const out: BlogPost[] = [];
  for (const slug of order) {
    const post = bySlug.get(slug);
    if (post && post.state !== "deleted") out.push(post);
  }
  return out;
}

export function isPublished(post: BlogPost): boolean {
  return (post.state ?? "published") === "published";
}

export function isIndexable(post: BlogPost): boolean {
  return isPublished(post) && (post.indexState ?? "index") === "index";
}

/** Detay sayfası: yayında + yayından kaldırılan görünür (adres kırılmaz); taslak görünmez. */
export function isReachableDetail(post: BlogPost): boolean {
  const state = post.state ?? "published";
  return state === "published" || state === "unpublished";
}

/**
 * Ana sayfa seçimi: "Ana sayfada göster" işaretliler, verilen sıraya göre.
 * Hiç işaret yoksa en yeni yayınlar. Sabit slug listesi YOKTUR.
 */
export function selectHomepagePosts(published: BlogPost[], limit = 3): BlogPost[] {
  const featured = published
    .filter((p) => p.featured === true)
    .sort(
      (a, b) =>
        (a.homeOrder ?? Number.MAX_SAFE_INTEGER) - (b.homeOrder ?? Number.MAX_SAFE_INTEGER)
    );
  if (featured.length > 0) return featured.slice(0, limit);

  const time = (p: BlogPost): number => {
    const t = Date.parse(p.publishedAt ?? "");
    return Number.isFinite(t) ? t : 0;
  };
  // Array.prototype.sort kararlıdır: publishedAt yoksa mevcut liste sırası korunur.
  return published.slice().sort((a, b) => time(b) - time(a)).slice(0, limit);
}
