// ============================================================================
// GLOBAL BLOG MERKEZİ — veri okuma (ADDITIVE, 11 Eki 2026).
// Kaynak: GET /api/public/seo/page?path=/<dil>/blog (TR blogla aynı uç ve aynı motor).
// Saf kararlar lib/global/blogCore.ts'tedir (test edilir).
// ============================================================================
import type { BlogPost } from "@/components/blog/BlogExperience";
import { fetchSeoPage, fetchSeoPageChecked } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { GLOBAL_LOCALES, localeBlogPath, type GlobalLocale } from "./config";
import { localeBlogPostsFromBlocks, type LocaleBlogDocs } from "./blogCore";

function withServedImages(posts: BlogPost[]): BlogPost[] {
  // R2 mutlak URL'leri same-origin /r2/ yoluna çevrilir (TR lib/blog.ts ile aynı kural).
  return posts.map((p) => ({ ...p, image: mediaUrl(p.image) }));
}

/** O dilin tüm (silinmemiş) kayıtları. Kayıt yoksa / okunamazsa boş — sahte içerik üretilmez. */
export async function fetchLocaleBlogPosts(locale: GlobalLocale): Promise<BlogPost[]> {
  const page = await fetchSeoPage(localeBlogPath(locale));
  return withServedImages(localeBlogPostsFromBlocks(page?.body_blocks));
}

/** Sitemap için: okunamadı (ok=false) ile "kayıt yok" ayrımı. */
export async function fetchLocaleBlogPostsChecked(locale: GlobalLocale): Promise<{ ok: boolean; posts: BlogPost[] }> {
  const res = await fetchSeoPageChecked(localeBlogPath(locale));
  return { ok: res.ok, posts: withServedImages(localeBlogPostsFromBlocks(res.page?.body_blocks)) };
}

/** 13 dilin kayıtları (hreflang ailesi için; her istek 5 dk ISR önbellekli). */
export async function fetchAllLocaleBlogDocs(): Promise<LocaleBlogDocs> {
  const lists = await Promise.all(GLOBAL_LOCALES.map((l) => fetchLocaleBlogPosts(l).catch(() => [] as BlogPost[])));
  const docs: LocaleBlogDocs = {};
  GLOBAL_LOCALES.forEach((l, i) => { docs[l] = lists[i]; });
  return docs;
}
