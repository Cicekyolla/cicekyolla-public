// lib/managedSeoContent.ts — ADDITIVE. Operatör-onaylı SEO içeriği kapısı.
//
// SORUN (Lokasyon SEO Merkezi entegrasyon eksiği): konum sayfalarında
// getLocationMetadata() her zaman sabit "{place} Çiçekçi — {place} Çiçek
// Siparişi" şablonunu üretiyor ve admin'de onaylanan title/meta/H1 canlıya
// hiç çıkmıyordu.
//
// ÇÖZÜM: yalnız güncel içerik versiyonunun provenance kaynağı OPERATÖR-ONAYLI
// olduğunda admin değeri şablonun önüne geçer. 057 envanter şablonu (source
// NULL) ve otomatik AI üretimi (ai-content / ai) KAPI DIŞINDADIR — yani bugün
// yayında olan hiçbir sayfanın davranışı değişmez; yalnız operatörün bilerek
// kaydettiği/onayladığı içerik canlıya yansır.
//
// Kaynak değerleri (backend provenance, migration 060):
//   seo-merkezi     → admin panel elle kaydetme (POST /content varsayılanı)
//   haiku-approved  → AI önerisinin OPERATÖR tarafından onaylanması
//   manual          → açık manuel işaretleme
//   restore         → operatörün versiyon geri alması
import type { SeoPublicPage } from "./api";

export const OPERATOR_SOURCES = ["seo-merkezi", "haiku-approved", "manual", "restore"] as const;

export function isOperatorManaged(source: string | null | undefined): boolean {
  return typeof source === "string" && (OPERATOR_SOURCES as readonly string[]).includes(source);
}

type ManagedFields = Pick<SeoPublicPage, "content_source" | "title_tag" | "meta_description" | "h1">;

function nonEmpty(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : null;
}

/** Operatör-onaylı title (yoksa null → mevcut şablon davranışı sürer). */
export function managedTitle(page: ManagedFields): string | null {
  return isOperatorManaged(page.content_source) ? nonEmpty(page.title_tag) : null;
}

/** Operatör-onaylı meta description (yoksa null). */
export function managedDescription(page: ManagedFields): string | null {
  return isOperatorManaged(page.content_source) ? nonEmpty(page.meta_description) : null;
}

/** Operatör-onaylı H1 (yoksa null → sabit konum şablonu sürer). */
export function managedH1(page: ManagedFields): string | null {
  return isOperatorManaged(page.content_source) ? nonEmpty(page.h1) : null;
}
