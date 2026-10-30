// lib/placePages.ts — YER SAYFALARI (hastane, otel, fuar, cami, AVM) — saf çekirdek (27 Eki 2026, ADDITIVE).
// ----------------------------------------------------------------------------
// Dekorasyon yöntemi: içerik paneldeki SEO kaydında (page_type 'delivery_info', DB şeması DEĞİŞMEZ).
//   Hub sayfası  : /{hub}                 → body_blocks içinde { type: 'place-hub', places: [...] } (panel yönetir)
//   Yer sayfası  : /{hub}/{yer-slug}      → body_blocks içinde { type: 'place-info', ... }
// Başlık, açıklama, H1, giriş, bloklar, SSS, index durumu: tamamı panelden (SEO kaydı).
// Hub adresleri SABİT (panel yer slug'ını seçer). Admin aynı listeyi taşır: src/app/lib/placePagesCore.ts.
// ============================================================================

export type PlaceKind = "hastane" | "otel" | "fuar" | "cami" | "avm" | "dugun";

export interface PlaceKindDef {
  kind: PlaceKind;
  /** Hub yolu (başında "/"). */
  hub: string;
  /** Kırıntı ve boş durum etiketi. */
  label: string;
}

export const PLACE_KINDS: readonly PlaceKindDef[] = [
  { kind: "hastane", hub: "/hastaneye-cicek-gonderimi", label: "Hastanelere Çiçek Gönderimi" },
  { kind: "otel", hub: "/otele-cicek-gonderimi", label: "Otellere Çiçek Gönderimi" },
  { kind: "fuar", hub: "/fuara-cicek-gonderimi", label: "Fuarlara Çiçek Gönderimi" },
  { kind: "cami", hub: "/camiye-celenk-gonderimi", label: "Camilere Çelenk Gönderimi" },
  { kind: "avm", hub: "/avmye-cicek-gonderimi", label: "AVM'lere Çiçek Gönderimi" },
  { kind: "dugun", hub: "/dugun-salonuna-cicek-gonderimi", label: "Düğün Salonlarına Çiçek Gönderimi" }, // 30 Eki 2026, ADDITIVE
];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function placeKindDef(kind: PlaceKind): PlaceKindDef {
  return PLACE_KINDS.find((k) => k.kind === kind)!;
}

/** Yol bir yer sayfası ailesine mi ait (hub ya da hub/yer)? Middleware eski URL kurallarını bunlarda çalıştırmaz. */
export function isPlacePagePath(pathname: string): boolean {
  return parsePlacePath(pathname) !== null;
}

/** "/hastaneye-cicek-gonderimi" → { kind, slug: null }; "/hastaneye-cicek-gonderimi/acibadem" → { kind, slug }. Değilse null. */
export function parsePlacePath(pathname: string): { kind: PlaceKind; slug: string | null } | null {
  const clean = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  for (const def of PLACE_KINDS) {
    if (clean === def.hub) return { kind: def.kind, slug: null };
    if (clean.startsWith(`${def.hub}/`)) {
      const rest = clean.slice(def.hub.length + 1);
      return SLUG_RE.test(rest) ? { kind: def.kind, slug: rest } : null;
    }
  }
  return null;
}

export function placePath(kind: PlaceKind, slug?: string | null): string {
  const hub = placeKindDef(kind).hub;
  return slug ? `${hub}/${slug}` : hub;
}

/** Panelin yazdığı bloklar (ek alanlar sayfayı bozmaz; eksik alan boş kalır). */
export interface PlaceInfoBlock { type: "place-info"; name?: string; district?: string; address?: string; note?: string; category_id?: number | null }
export interface PlaceHubBlock { type: "place-hub"; category_id?: number | null; places?: { slug: string; name: string; district?: string }[] }

type AnyBlock = { type?: unknown } & Record<string, unknown>;

export function getPlaceInfo(blocks: readonly unknown[] | null | undefined): PlaceInfoBlock | null {
  const b = (blocks ?? []).find((x) => (x as AnyBlock)?.type === "place-info") as PlaceInfoBlock | undefined;
  return b ?? null;
}

export function getPlaceHub(blocks: readonly unknown[] | null | undefined): PlaceHubBlock | null {
  const b = (blocks ?? []).find((x) => (x as AnyBlock)?.type === "place-hub") as PlaceHubBlock | undefined;
  if (!b) return null;
  const places = Array.isArray(b.places)
    ? b.places.filter((p) => p && typeof p.slug === "string" && SLUG_RE.test(p.slug) && typeof p.name === "string" && p.name.trim())
    : [];
  return { ...b, places };
}

/** Metin blokları (paragraph / heading) — özel bloklar hariç. */
export function textBlocks(blocks: readonly unknown[] | null | undefined): { type: "paragraph" | "heading"; text: string }[] {
  return (blocks ?? [])
    .filter((x): x is { type: "paragraph" | "heading"; text: string } => {
      const b = x as AnyBlock;
      return (b?.type === "paragraph" || b?.type === "heading") && typeof b.text === "string" && b.text.trim().length > 0;
    });
}

export function validCategoryId(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null;
}
