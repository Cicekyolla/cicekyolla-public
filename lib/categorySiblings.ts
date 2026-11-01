// EK (KÜME İÇ LİNK, 1 Kas 2026): yaprak kategori sayfasında kardeş koleksiyon rayı.
// Yaprak (görünür children'ı yok) + üst kategorisi var → üst düğüm ve kendisi hariç görünür kardeşleri.
// Aksi halde null → sayfa bugünkü gibi (children'ı olan kategori kendi alt rayını gösterir).
// Üst düğüm AĞAÇTAKİ YERİNDEN bulunur (kimin children'ı içinde): canlı hafif ağaç
// (/api/categories/public-tree) parent_slug TAŞIMAZ, yalnız parent_id + iç içe children.
// Saf modül: düz `node --test` ile sınanır; görünürlük kuralı çağırandan gelir (lib/api isCategoryVisible).

export interface SiblingNode {
  name: string;
  slug: string;
  children?: SiblingNode[];
  status?: string;
  [key: string]: unknown;
}

function findWithParent<T extends SiblingNode>(
  nodes: T[],
  slug: string,
  parent: T | null = null,
): { node: T; parent: T | null } | null {
  for (const n of nodes) {
    if (n?.slug === slug) return { node: n, parent };
    if (Array.isArray(n?.children)) {
      const hit = findWithParent(n.children as T[], slug, n);
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
  const hit = findWithParent(nodes, slug);
  if (!hit) return null;
  const { node: self, parent } = hit;
  const ownKids = Array.isArray(self.children) ? (self.children as T[]) : [];
  if (ownKids.some((k) => k && isVisible(k))) return null;
  if (!parent || !isVisible(parent)) return null;
  const kids = Array.isArray(parent.children) ? (parent.children as T[]) : [];
  const siblings = kids.filter((k) => k && typeof k.slug === "string" && k.slug !== slug && isVisible(k));
  return siblings.length > 0 ? { parent, siblings } : null;
}
