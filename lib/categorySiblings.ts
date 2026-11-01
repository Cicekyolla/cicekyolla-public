// EK (KÜME İÇ LİNK, 1 Kas 2026): yaprak kategori sayfasında kardeş koleksiyon rayı.
// Yaprak (görünür children'ı yok) + üst kategorisi var → üst düğüm ve kendisi hariç görünür kardeşleri.
// Aksi halde null → sayfa bugünkü gibi (children'ı olan kategori kendi alt rayını gösterir).
// Saf modül: düz `node --test` ile sınanır; görünürlük kuralı çağırandan gelir (lib/api isCategoryVisible).

export interface SiblingNode {
  name: string;
  slug: string;
  parent_slug?: string | null;
  children?: SiblingNode[];
  status?: string;
  [key: string]: unknown;
}

function findBySlug<T extends SiblingNode>(nodes: T[], slug: string): T | null {
  for (const n of nodes) {
    if (n?.slug === slug) return n;
    if (Array.isArray(n?.children)) {
      const hit = findBySlug(n.children as T[], slug);
      if (hit) return hit;
    }
  }
  return null;
}

export function findSiblingRail<T extends SiblingNode>(
  nodes: T[],
  slug: string,
  isVisible: (n: T) => boolean,
): { parent: T; siblings: T[] } | null {
  const self = findBySlug(nodes, slug);
  if (!self) return null;
  const ownKids = Array.isArray(self.children) ? (self.children as T[]) : [];
  if (ownKids.some((k) => k && isVisible(k))) return null;
  const parentSlug = typeof self.parent_slug === "string" ? self.parent_slug : "";
  const parent = parentSlug ? findBySlug(nodes, parentSlug) : null;
  if (!parent || !isVisible(parent)) return null;
  const kids = Array.isArray(parent.children) ? (parent.children as T[]) : [];
  const siblings = kids.filter((k) => k && typeof k.slug === "string" && k.slug !== slug && isVisible(k));
  return siblings.length > 0 ? { parent, siblings } : null;
}
