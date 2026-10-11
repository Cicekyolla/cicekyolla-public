// lib/globalBlog.test.ts — GLOBAL BLOG MERKEZİ saf çekirdeğinin testleri (ADDITIVE, 11 Eki 2026).
// Çalıştırma: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseLocalePath, localeBlogPath, GLOBAL_LOCALES } from "./global/config.ts";
import {
  localeBlogPostsFromBlocks,
  listedBlogPosts,
  reachableBlogPost,
  homepageBlogPosts,
  blogPostCanonical,
  isSelfCanonical,
  localeBlogPostFamily,
  trBlogPostFamily,
  localeBlogIndexFamily,
  blogSitemapEntries,
  blogPostingJsonLd,
} from "./global/blogCore.ts";
import { fromBlock } from "./blogMerge.ts";
import { BLOG_COPY, formatBlogDate } from "./global/blogCopy.ts";

const abs = (p: string) => `https://www.cicekyolla.com.tr${p}`;

function block(slug: string, extra: Record<string, unknown> = {}) {
  return { type: "blog-post", value: slug, title: `T ${slug}`, kind: "Guide", note: `/img/${slug}.jpg`, text: `E ${slug}`, label: `C ${slug}`, ...extra };
}

test("parseLocalePath: /xx/blog ve /xx/blog/<slug>; geçersiz biçim unknown; mevcut türler değişmedi", () => {
  for (const l of GLOBAL_LOCALES) {
    assert.deepEqual(parseLocalePath(l, ["blog"]), { kind: "blog" });
    assert.deepEqual(parseLocalePath(l, ["blog", "send-flowers-to-istanbul"]), { kind: "blog-post", slug: "send-flowers-to-istanbul" });
  }
  assert.equal(parseLocalePath("en", ["blog", "Bad-Slug"]).kind, "unknown");
  assert.equal(parseLocalePath("en", ["blog", "a", "b"]).kind, "unknown");
  assert.equal(parseLocalePath("en", ["blog", "çiçek"]).kind, "unknown");
  // Mevcut yüzeyler aynen.
  assert.deepEqual(parseLocalePath("en", ["product", "red-roses"]), { kind: "product", slug: "red-roses" });
  assert.deepEqual(parseLocalePath("en", ["istanbul"]), { kind: "page", key: "istanbul" });
  assert.deepEqual(parseLocalePath("en", ["hotel-delivery"]), { kind: "page", key: "hotel-delivery" });
  assert.equal(localeBlogPath("de"), "/de/blog");
  assert.equal(localeBlogPath("de", "x"), "/de/blog/x");
});

test("fromBlock: translationKey yalnız varken eklenir (TR kayıtları birebir aynı)", () => {
  const plain = fromBlock(block("a"));
  assert.ok(plain && !("translationKey" in plain));
  assert.equal(fromBlock(block("a", { translationKey: " gul-renkleri " }))?.translationKey, "gul-renkleri");
});

test("görünürlük: published listede; unpublished adres açık + listede yok; draft/deleted 404; sahte içerik yok", () => {
  const posts = localeBlogPostsFromBlocks([
    block("pub"),
    block("unpub", { state: "unpublished" }),
    block("draft", { state: "draft" }),
    block("gone", { state: "deleted" }),
    { type: "faq", value: "x" },
  ]);
  assert.deepEqual(posts.map((p) => p.slug), ["pub", "unpub", "draft"]);
  assert.deepEqual(listedBlogPosts(posts).map((p) => p.slug), ["pub"]);
  assert.equal(reachableBlogPost(posts, "pub")?.slug, "pub");
  assert.equal(reachableBlogPost(posts, "unpub")?.slug, "unpub");
  assert.equal(reachableBlogPost(posts, "draft"), null);
  assert.equal(reachableBlogPost(posts, "gone"), null);
  assert.deepEqual(localeBlogPostsFromBlocks(undefined), []);
  assert.deepEqual(localeBlogPostsFromBlocks(null), []);
});

test("ana sayfa rehberi: yalnız yayındakiler, işaretli sıra; boş dilde boş", () => {
  const posts = localeBlogPostsFromBlocks([
    block("a", { publishedAt: "2026-10-01" }),
    block("b", { featured: true, homeOrder: 2 }),
    block("c", { featured: true, homeOrder: 1 }),
    block("d", { featured: true, homeOrder: 0, state: "draft" }),
  ]);
  assert.deepEqual(homepageBlogPosts(posts).map((p) => p.slug), ["c", "b"]);
  assert.deepEqual(homepageBlogPosts([]), []);
});

test("canonical: boşsa kendi adresi; özel canonical kendine değilse hreflang/sitemap dışı", () => {
  const [p] = localeBlogPostsFromBlocks([block("a")]);
  assert.equal(blogPostCanonical("en", p), "/en/blog/a");
  assert.equal(isSelfCanonical("en", p), true);
  const [q] = localeBlogPostsFromBlocks([block("a", { canonical: "https://www.cicekyolla.com.tr/en/blog/a/" })]);
  assert.equal(isSelfCanonical("en", q), true);
  const [r] = localeBlogPostsFromBlocks([block("a", { canonical: "/en/blog/b" })]);
  assert.equal(isSelfCanonical("en", r), false);
});

test("hreflang: anahtarlı dil sürümleri + TR karşılığı; iki taraf aynı kümeyi basar", () => {
  const docs = {
    en: localeBlogPostsFromBlocks([block("rose-colours", { translationKey: "gul-renkleri" })]),
    de: localeBlogPostsFromBlocks([block("rosenfarben", { translationKey: "gul-renkleri" })]),
    fr: localeBlogPostsFromBlocks([block("couleurs", { translationKey: "gul-renkleri", state: "draft" })]),
  };
  const tr = localeBlogPostsFromBlocks([block("gul-renkleri")]);
  const fromEn = localeBlogPostFamily("en", docs.en[0], docs, tr, abs);
  assert.deepEqual(fromEn, {
    tr: abs("/blog/gul-renkleri"),
    en: abs("/en/blog/rose-colours"),
    de: abs("/de/blog/rosenfarben"),
    "x-default": abs("/en/blog/rose-colours"),
  });
  const fromTr = trBlogPostFamily(tr[0], docs, abs);
  assert.deepEqual(fromTr, fromEn, "TR sayfası aynı aileyi basar (karşılıklılık)");
  // Taslak fr kümede yok.
  assert.ok(!("fr" in (fromEn ?? {})));
});

test("hreflang: anahtarsız / noindex / tek üyeli yazı küme basmaz; TR karşılığı yoksa TR çıktısı değişmez", () => {
  const solo = localeBlogPostsFromBlocks([block("only-en")]);
  assert.equal(localeBlogPostFamily("en", solo[0], { en: solo }, [], abs), null);
  const keyed = localeBlogPostsFromBlocks([block("x", { translationKey: "k" })]);
  assert.equal(localeBlogPostFamily("en", keyed[0], { en: keyed }, [], abs), null, "tek üye → null");
  const noindex = localeBlogPostsFromBlocks([block("y", { translationKey: "k", indexState: "noindex" })]);
  assert.equal(localeBlogPostFamily("en", noindex[0], { en: noindex }, [], abs), null);
  const tr = localeBlogPostsFromBlocks([block("tr-yazi")]);
  assert.equal(trBlogPostFamily(tr[0], {}, abs), null);
  // Özgün EN yazısı + aynı anahtarlı DE → TR'siz iki dilli aile.
  const en = localeBlogPostsFromBlocks([block("a", { translationKey: "g" })]);
  const de = localeBlogPostsFromBlocks([block("b", { translationKey: "g" })]);
  assert.deepEqual(localeBlogPostFamily("de", de[0], { en, de }, tr, abs), {
    en: abs("/en/blog/a"), de: abs("/de/blog/b"), "x-default": abs("/en/blog/a"),
  });
});

test("liste sayfası ailesi: en az iki dilde indexlenebilir yazı varken", () => {
  const en = localeBlogPostsFromBlocks([block("a")]);
  assert.equal(localeBlogIndexFamily({ en }, abs), null);
  const de = localeBlogPostsFromBlocks([block("b")]);
  assert.deepEqual(localeBlogIndexFamily({ en, de }, abs), { de: abs("/de/blog"), en: abs("/en/blog"), "x-default": abs("/en/blog") });
});

test("sitemap: yalnız indexlenebilir + kendine canonical; yazı yoksa hiç düğüm yok", () => {
  const posts = localeBlogPostsFromBlocks([
    block("a", { publishedAt: "2026-10-01" }),
    block("b", { publishedAt: "2026-10-05" }),
    block("c", { state: "unpublished" }),
    block("d", { indexState: "noindex" }),
    block("e", { canonical: "/en/blog/a" }),
    block("f", { state: "draft" }),
  ]);
  assert.deepEqual(blogSitemapEntries("en", posts), [
    { path: "/en/blog", lastmod: "2026-10-05" },
    { path: "/en/blog/a", lastmod: "2026-10-01" },
    { path: "/en/blog/b", lastmod: "2026-10-05" },
  ]);
  assert.deepEqual(blogSitemapEntries("en", []), []);
  assert.deepEqual(blogSitemapEntries("en", localeBlogPostsFromBlocks([block("x", { state: "draft" })])), []);
});

test("BlogPosting: dil, tarih, mutlak görsel ve adres", () => {
  const [p] = localeBlogPostsFromBlocks([block("a", { publishedAt: "2026-10-01", metaDescription: "M" })]);
  const ld = blogPostingJsonLd("en", p, abs);
  assert.equal(ld["@type"], "BlogPosting");
  assert.equal(ld.inLanguage, "en");
  assert.equal(ld.description, "M");
  assert.equal(ld.image, abs("/img/a.jpg"));
  assert.equal(ld.mainEntityOfPage, abs("/en/blog/a"));
  assert.equal(ld.datePublished, "2026-10-01T00:00:00.000Z");
});

test("arayüz metinleri 13 dilde eksiksiz; tarih biçimi geçersizde null", () => {
  for (const l of GLOBAL_LOCALES) {
    const c = BLOG_COPY[l];
    for (const k of ["title", "description", "guide", "all", "read", "back", "ctaTitle", "ctaButton"] as const) {
      assert.ok(c[k] && c[k].trim().length > 0, `${l}.${k}`);
    }
  }
  assert.equal(formatBlogDate("en", "yok"), null);
  assert.equal(formatBlogDate("en", undefined), null);
  assert.ok(formatBlogDate("de", "2026-10-01"));
});

test("V80 ana sayfa: rehber bölümü opsiyonel prop; TR blog sayfası hreflang'i yalnız aile varken basar", () => {
  const page = readFileSync(join(process.cwd(), "components", "global", "v80", "V80Page.tsx"), "utf8");
  assert.match(page, /guide\?: ReactNode/);
  const tr = readFileSync(join(process.cwd(), "app", "blog", "[slug]", "page.tsx"), "utf8");
  assert.match(tr, /alternates:languages\?\{canonical:post\.canonical\|\|`\/blog\/\$\{post\.slug\}`,languages\}:\{canonical:post\.canonical\|\|`\/blog\/\$\{post\.slug\}`\}/);
});
