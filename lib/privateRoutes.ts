// ============================================================================
// EK (SEO YAYIN ZİNCİRİ) — KİŞİSEL / İŞLEM SAYFALARI ARAMA DİZİNİNE GİRMEZ.
//
// Kanıt (4 Eki 2026, canlı, düz GET): /sepet, /checkout, /checkout/sonuc, /hesabim,
// /siparis-takip ve /kategori-audit kök layout'un varsayılanını ("index, follow") basıyordu;
// robots.txt her yolu taramaya açık. Bu sayfalar kişiye özel ya da iç denetim sayfasıdır:
// aramada görünmeleri hem değersiz hem risklidir (boş sepet / boş hesap sayfası "soft 404",
// taranma bütçesi). Aynı karar zaten /siparis-takibi, /giris, /sifre-belirle … sayfalarında var.
//
// Kural tek yerde: bu sabit + aşağıdaki liste. İstemci bileşeni sayfalar ("use client") metadata
// taşıyamadığı için karar rota segmentinin layout.tsx dosyasında verilir (çocukları aynen döndürür;
// akışa, veriye, ödeme adımlarına dokunmaz).
// ============================================================================
import type { Metadata } from "next";

export const PRIVATE_ROUTE_ROBOTS: NonNullable<Metadata["robots"]> = { index: false, follow: false };

/** Index dışı tutulan kişisel / işlem / iç denetim rotaları (kaynak koruma testi bunu denetler). */
export const PRIVATE_ROUTES = [
  "/sepet",
  "/checkout",
  "/checkout/sonuc",
  "/hesabim",
  "/siparis-takip",
  "/kategori-audit",
] as const;

/** Index'lenebilir statik sayfalar: her biri KENDİ yolunu canonical verir (kaynak koruma testi). */
export const SELF_CANONICAL_STATIC_ROUTES = [
  "/hakkimizda",
  "/iletisim",
  "/dekorasyon",
  "/kvkk",
  "/mesafeli-satis-sozlesmesi",
  "/sik-sorulan-sorular",
  "/blog",
  "/kurumsal",
  "/teslimat-bolgeleri",
] as const;
