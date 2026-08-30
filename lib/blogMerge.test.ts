// lib/blogMerge.test.ts — blog kaynak birleştirmesinin regresyon testleri (ADDITIVE).
// Çalıştırma: node --test lib/blogMerge.test.ts   (npm run test:unit)
//
// BU TESTLERİN VARLIK SEBEBİ: 30.08.2026 denetiminde, DB'ye tek bir blog yazısı
// yazıldığında koddaki TÜM yazıların kaybolduğu (all-or-nothing) bir kusur
// bulundu. Admin'deki eski "Blog Yönetimi" ekranı 5 yazı kaydetseydi canlı blog
// 15 → 5'e düşecekti. Aşağıdaki testler bu sınıfın bir daha geri gelmemesini
// garanti eder.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fromBlock,
  parseBlocks,
  mergeSources,
  isPublished,
  isIndexable,
  isReachableDetail,
  selectHomepagePosts,
  normalizeState,
  toNumber,
} from "./blogMerge.ts";

type Post = ReturnType<typeof fromBlock>;

function post(slug: string, extra: Record<string, unknown> = {}) {
  return {
    title: `Başlık ${slug}`,
    slug,
    category: "Rehber",
    image: `/blog/${slug}.jpg`,
    excerpt: "özet",
    content: "içerik",
    ...extra,
  } as NonNullable<Post>;
}

function block(slug: string, extra: Record<string, unknown> = {}) {
  return {
    type: "blog-post",
    title: `Başlık ${slug}`,
    value: slug,
    kind: "Rehber",
    note: `/blog/${slug}.jpg`,
    text: "özet",
    label: "içerik",
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// 1) KAYIP İMKANSIZ — kusurun birebir senaryosu
// ---------------------------------------------------------------------------

test("REGRESYON: DB'de yalnız 5 yazı varken koddaki 15 yazı KAYBOLMAZ", () => {
  const kod = Array.from({ length: 15 }, (_, i) => post(`yazi-${i + 1}`));
  const db = kod.slice(0, 5).map((p) => ({ ...p, title: "DB'den güncellendi" }));

  const sonuc = mergeSources(db, kod);

  assert.equal(sonuc.length, 15, "15 yazının tamamı korunmalı");
  // DB kaydı olan ilk 5'te DB kazanır
  assert.equal(sonuc[0].title, "DB'den güncellendi");
  // DB'de olmayan 10 yazı kod ağından gelir
  assert.equal(sonuc.find((p) => p.slug === "yazi-15")?.title, "Başlık yazi-15");
});

test("REGRESYON: DB tamamen boşken kod ağının tamamı döner", () => {
  const kod = Array.from({ length: 15 }, (_, i) => post(`yazi-${i + 1}`));
  assert.equal(mergeSources([], kod).length, 15);
});

test("REGRESYON: DB'de tek yazı varken bile diğer 14'ü kalır", () => {
  const kod = Array.from({ length: 15 }, (_, i) => post(`yazi-${i + 1}`));
  const sonuc = mergeSources([post("yazi-7", { title: "Tek kayıt" })], kod);
  assert.equal(sonuc.length, 15);
  assert.equal(sonuc.find((p) => p.slug === "yazi-7")?.title, "Tek kayıt");
});

test("bir yazı listeden ancak AÇIK işaretle çıkar: state 'deleted'", () => {
  const kod = [post("a"), post("b"), post("c")];
  const sonuc = mergeSources([post("b", { state: "deleted" })], kod);
  assert.deepEqual(sonuc.map((p) => p.slug), ["a", "c"]);
});

test("DB kaydı kod kaydını ezer — aynı slug iki kez listelenmez", () => {
  const kod = [post("a", { title: "Kod" })];
  const sonuc = mergeSources([post("a", { title: "DB" })], kod);
  assert.equal(sonuc.length, 1);
  assert.equal(sonuc[0].title, "DB");
});

test("DB'deki yeni yazı listenin başında, kod yazıları arkada durur", () => {
  const kod = [post("eski-1"), post("eski-2")];
  const sonuc = mergeSources([post("yeni")], kod);
  assert.deepEqual(sonuc.map((p) => p.slug), ["yeni", "eski-1", "eski-2"]);
});

// ---------------------------------------------------------------------------
// 2) Yayın durumu — public görünürlük
// ---------------------------------------------------------------------------

test("yayın durumu: alan yoksa 'published' sayılır (mevcut 15 yazı bozulmaz)", () => {
  assert.equal(isPublished(post("a")), true);
  assert.equal(normalizeState(undefined), "published");
  assert.equal(normalizeState(""), "published");
  assert.equal(normalizeState("bilinmeyen"), "published");
});

test("taslak public listede YOK ve detay sayfasında da YOK (404)", () => {
  const taslak = post("a", { state: "draft" });
  assert.equal(isPublished(taslak), false);
  assert.equal(isReachableDetail(taslak), false);
});

test("yayından kaldırılan: listede YOK ama ADRESİ ayakta (SEO değeri korunur)", () => {
  const kaldirilan = post("a", { state: "unpublished" });
  assert.equal(isPublished(kaldirilan), false, "listede görünmez");
  assert.equal(isReachableDetail(kaldirilan), true, "adres 404 olmaz");
  assert.equal(isIndexable(kaldirilan), false, "sitemap'e girmez");
});

test("sitemap: yalnız yayında VE index olanlar", () => {
  assert.equal(isIndexable(post("a")), true);
  assert.equal(isIndexable(post("b", { indexState: "noindex" })), false);
  assert.equal(isIndexable(post("c", { state: "draft" })), false);
});

// ---------------------------------------------------------------------------
// 3) Blok ayrıştırma
// ---------------------------------------------------------------------------

test("blok ayrıştırma: zorunlu alanlar ve varsayılanlar", () => {
  const p = fromBlock(block("test-slug"));
  assert.ok(p);
  assert.equal(p.slug, "test-slug");
  assert.equal(p.category, "Rehber");
  assert.equal(p.state, "published");
  assert.equal(p.indexState, "index");
});

test("blok ayrıştırma: bozuk kayıtlar sessizce düşer, sağlamlar kalır", () => {
  const blocks = [
    block("saglam"),
    { type: "blog-post", value: "slugu-var-basligi-yok" },
    { type: "blog-post", title: "Başlığı var slug'ı yok" },
    { type: "faq-item", title: "Blog değil", value: "x" },
    block("saglam-2"),
  ];
  assert.deepEqual(parseBlocks(blocks).map((p) => p.slug), ["saglam", "saglam-2"]);
});

test("blok ayrıştırma: SEO ve ana sayfa alanları okunur", () => {
  const p = fromBlock(
    block("x", {
      seoTitle: "SEO Başlığı",
      metaDescription: "Meta açıklama",
      canonical: "/blog/kanonik",
      indexState: "noindex",
      state: "unpublished",
      publishedAt: "2026-08-30",
      featured: true,
      homeOrder: 2,
    })
  );
  assert.ok(p);
  assert.equal(p.seoTitle, "SEO Başlığı");
  assert.equal(p.metaDescription, "Meta açıklama");
  assert.equal(p.canonical, "/blog/kanonik");
  assert.equal(p.indexState, "noindex");
  assert.equal(p.state, "unpublished");
  assert.equal(p.featured, true);
  assert.equal(p.homeOrder, 2);
});

test("blok ayrıştırma: boş SEO alanları eklenmez (bugünkü davranış korunur)", () => {
  const p = fromBlock(block("x", { seoTitle: "   ", metaDescription: "", canonical: "" }));
  assert.ok(p);
  assert.equal(p.seoTitle, undefined);
  assert.equal(p.metaDescription, undefined);
  assert.equal(p.canonical, undefined);
});

test("sayı dönüşümü: JSONB'den string gelen sıra numarası da çalışır", () => {
  assert.equal(toNumber(3), 3);
  assert.equal(toNumber("3"), 3);
  assert.equal(toNumber(""), null);
  assert.equal(toNumber("abc"), null);
  assert.equal(toNumber(null), null);
  assert.equal(fromBlock(block("x", { homeOrder: "5" }))?.homeOrder, 5);
});

// ---------------------------------------------------------------------------
// 4) Ana sayfa seçimi
// ---------------------------------------------------------------------------

test("ana sayfa: 'göster' işaretliler, Admin'deki sıraya göre", () => {
  const posts = [
    post("a", { featured: true, homeOrder: 3 }),
    post("b"),
    post("c", { featured: true, homeOrder: 1 }),
    post("d", { featured: true, homeOrder: 2 }),
  ];
  assert.deepEqual(selectHomepagePosts(posts, 3).map((p) => p.slug), ["c", "d", "a"]);
});

test("ana sayfa: hiç işaret yoksa en yeni yayınlar (sabit slug listesi yok)", () => {
  const posts = [
    post("eski", { publishedAt: "2026-01-01" }),
    post("yeni", { publishedAt: "2026-08-30" }),
    post("orta", { publishedAt: "2026-05-15" }),
  ];
  assert.deepEqual(selectHomepagePosts(posts, 3).map((p) => p.slug), ["yeni", "orta", "eski"]);
});

test("ana sayfa: tarih yoksa liste sırası korunur (sort kararlı)", () => {
  const posts = [post("a"), post("b"), post("c")];
  assert.deepEqual(selectHomepagePosts(posts, 3).map((p) => p.slug), ["a", "b", "c"]);
});

test("ana sayfa: limit uygulanır ve sıra numarası olmayan işaretli sona düşer", () => {
  const posts = [
    post("a", { featured: true }),
    post("b", { featured: true, homeOrder: 1 }),
    post("c", { featured: true, homeOrder: 2 }),
    post("d", { featured: true, homeOrder: 3 }),
  ];
  assert.deepEqual(selectHomepagePosts(posts, 3).map((p) => p.slug), ["b", "c", "d"]);
});

test("ana sayfa: ana sayfadan kaldırılan yazı blogda KALIR", () => {
  const posts = [post("a", { featured: true }), post("b")];
  const anaSayfa = selectHomepagePosts(posts, 3);
  assert.deepEqual(anaSayfa.map((p) => p.slug), ["a"]);
  // "b" ana sayfada yok ama yayında ve blog listesinde duruyor
  assert.equal(isPublished(posts[1]), true);
});

test("ana sayfa: yayında yazı yoksa boş döner (bölüm kendini gizler)", () => {
  assert.deepEqual(selectHomepagePosts([], 3), []);
});
