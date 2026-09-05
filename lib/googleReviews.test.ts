// ============================================================================
// googleReviews.test.ts — 5★ seçiminin GERÇEK veriyi bozmadığını kanıtlar.
// Talep listesindeki her doğrulama maddesinin karşılığı burada bir testtir.
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FIVE_STAR,
  isGoogleReviewsPayload,
  selectFiveStar,
  selectTrustReviews,
  type GoogleReviewItem,
  type GoogleReviewsPayload,
} from "./googleReviews.ts";

const yorum = (
  rating: number | null,
  body: string,
  author = "Müşteri",
): GoogleReviewItem => ({
  author,
  authorUri: "https://www.google.com/maps/contrib/123",
  rating,
  body,
  relativeTime: "2 ay önce",
  publishTime: "2026-07-05T10:00:00Z",
});

const PLACE = {
  id: "place-1",
  name: "Çiçek Yolla",
  address: "İstanbul",
  rating: 4.8,
  userRatingCount: 412,
  googleMapsUri: "https://maps.google.com/?cid=1",
};

const PAYLOAD: GoogleReviewsPayload = {
  source: "google",
  place: PLACE,
  reviews: [
    yorum(5, "Çiçekler çok tazeydi, zamanında ulaştı.", "Ayşe K."),
    yorum(4, "Güzeldi ama kargo biraz gecikti.", "Mehmet T."),
    yorum(5, "Annemin doğum gününe yetişti, teşekkürler.", "Zeynep A."),
    yorum(3, "Ortalama.", "Ali V."),
    yorum(null, "Puansız yorum.", "Puansız"),
    yorum(5, "   ", "Boş metin"),
  ],
};

test("YALNIZ 5★: 4★ ve altı seçimden çıkar, puansız da çıkar", () => {
  const secilen = selectFiveStar(PAYLOAD.reviews);
  assert.equal(secilen.length, 2);
  assert.ok(secilen.every((r) => r.rating === FIVE_STAR), "hepsi tam 5 yıldız olmalı");
  const yazarlar = secilen.map((r) => r.author);
  assert.deepEqual(yazarlar, ["Ayşe K.", "Zeynep A."]);
  assert.ok(!yazarlar.includes("Mehmet T."), "4★ gösterilmemeli");
  assert.ok(!yazarlar.includes("Ali V."), "3★ gösterilmemeli");
});

test("METİN/YAZAR DEĞİŞTİRİLMEDİ: seçim nesneyi yeniden kurmaz, referans aynı", () => {
  const kaynak = PAYLOAD.reviews;
  const secilen = selectFiveStar(kaynak);
  // Referans kimliği: metin veya yazar üzerinde herhangi bir dönüşüm yapılsaydı
  // yeni nesne oluşurdu ve bu iddia düşerdi.
  assert.equal(secilen[0], kaynak[0], "aynı nesne dönmeli (kopya/dönüşüm yok)");
  assert.equal(secilen[1], kaynak[2]);
  assert.equal(secilen[0].body, "Çiçekler çok tazeydi, zamanında ulaştı.");
  assert.equal(secilen[0].author, "Ayşe K.");
  assert.equal(secilen[0].authorUri, "https://www.google.com/maps/contrib/123");
});

test("BOŞ METİN: 5★ olsa bile metni olmayan yorum gösterilmez", () => {
  assert.ok(!selectFiveStar(PAYLOAD.reviews).some((r) => r.author === "Boş metin"));
});

test("SIRA KORUNUR: Google'ın verdiği sıra değiştirilmez", () => {
  const p = [yorum(5, "ikinci", "B"), yorum(5, "birinci", "A")];
  assert.deepEqual(selectFiveStar(p).map((r) => r.author), ["B", "A"]);
});

test("İŞLETME PUANI YENİDEN HESAPLANMAZ: place.rating Google'ınki kalır", () => {
  const s = selectTrustReviews(PAYLOAD);
  assert.ok(s.visible);
  if (!s.visible) return;
  assert.equal(s.place.rating, 4.8, "5★ süzgeci ortalamayı 5,0 yapmamalı");
  assert.equal(s.place.userRatingCount, 412, "toplam sayı kart sayısına düşmemeli");
  assert.notEqual(s.place.userRatingCount, s.reviews.length);
});

test("BOŞ DURUM: hiç 5★ yoksa bölüm gizlenir, sahte üretilmez", () => {
  const yok: GoogleReviewsPayload = {
    ...PAYLOAD,
    reviews: [yorum(4, "iyi"), yorum(3, "orta")],
  };
  assert.deepEqual(selectTrustReviews(yok), { visible: false });
  assert.deepEqual(selectTrustReviews({ ...PAYLOAD, reviews: [] }), { visible: false });
});

test("HATA DURUMU: bozuk/eksik yanıt bölümü kırmaz, gizler", () => {
  for (const bozuk of [
    null,
    undefined,
    {},
    "hata",
    { error: "google_reviews_unavailable" },
    { source: "manual", place: PLACE, reviews: [yorum(5, "x")] },
    { source: "google", place: { ...PLACE, googleMapsUri: "" }, reviews: [yorum(5, "x")] },
    { source: "google", place: { ...PLACE, rating: "4.8" }, reviews: [yorum(5, "x")] },
    { source: "google", place: PLACE, reviews: null },
  ]) {
    assert.deepEqual(selectTrustReviews(bozuk), { visible: false }, JSON.stringify(bozuk));
    assert.equal(isGoogleReviewsPayload(bozuk), false);
  }
  assert.deepEqual(selectFiveStar(null), []);
  assert.deepEqual(selectFiveStar(undefined), []);
});

test("GEÇERLİ YANIT: gerçek Google yükü tanınır", () => {
  assert.equal(isGoogleReviewsPayload(PAYLOAD), true);
});

test("SAHTE İSİM YOK: modül hiçbir yorum/isim sabiti taşımaz", async () => {
  const { readFileSync } = await import("node:fs");
  const kaynak = readFileSync(new URL("./googleReviews.ts", import.meta.url), "utf8");
  for (const yasak of ["Marta", "Sophie", "James", "Vogue", "Monocle", "Wallpaper", "200K", "2012"]) {
    assert.ok(!kaynak.includes(yasak), `modülde uydurma trust öğesi olmamalı: ${yasak}`);
  }
});
