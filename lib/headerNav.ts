import { isCategoryVisible, type CategoryNode } from "./api";
import { CATEGORY_PLACEHOLDER_IMAGE } from "./catalog";

export interface HeaderNavItem { match: string; label: string }

export const HEADER_NAV_CONFIG: HeaderNavItem[] = [
  { match: "Çiçekler", label: "Çiçekler" },
  { match: "Gönderim Amacına Göre", label: "Gönderim Amacı" },
  { match: "Buketler", label: "Buketler" },
  { match: "Güller", label: "Güller" },
  { match: "Premium Çiçekler", label: "Premium" },
  { match: "Doğum Günü", label: "Doğum Günü" },
  { match: "Orkideler", label: "Orkideler" },
  { match: "Saksı Bitkileri", label: "Saksı Bitkileri" },
  { match: "Kampanyalar", label: "Kampanyalar" },
  { match: "Koleksiyonlar", label: "Koleksiyonlar" },
];

export interface MegaGroup {
  href: string;
  featured?: { label: string; title: string; href: string; image: string };
  categories: { name: string; sub?: string; href: string }[];
}

const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
const visible = (n: CategoryNode) => !!n?.name && !!n?.slug && isCategoryVisible(n);

function findByName(nodes: CategoryNode[], name: string): CategoryNode | null {
  const target = norm(name);
  let found: CategoryNode | null = null;
  const walk = (list: CategoryNode[]): void => {
    for (const n of list) {
      if (found) return;
      if (visible(n) && norm(n.name) === target) {
        found = n;
        return;
      }
      if (Array.isArray(n?.children)) walk(n.children as CategoryNode[]);
    }
  };
  walk(nodes);
  return found;
}

function nodeImage(node: CategoryNode): string {
  const raw = node as { banner_image?: unknown; image_url?: unknown; image?: unknown; icon?: unknown };
  return (
    (typeof raw.banner_image === "string" && raw.banner_image) ||
    (typeof raw.image_url === "string" && raw.image_url) ||
    (typeof raw.image === "string" && raw.image) ||
    (typeof raw.icon === "string" && raw.icon) ||
    CATEGORY_PLACEHOLDER_IMAGE
  );
}

function flattenDescendants(nodes: CategoryNode[], max = 32): { name: string; sub?: string; href: string }[] {
  const out: { name: string; sub?: string; href: string }[] = [];
  const walk = (list: CategoryNode[], depth: number): void => {
    for (const n of list) {
      if (out.length >= max) return;
      if (visible(n)) {
        const description = (n as { description?: unknown }).description;
        out.push({
          name: depth > 1 ? `— ${n.name}` : n.name,
          href: `/kategori/${n.slug}`,
          sub: typeof description === "string" && description ? description.slice(0, 42) : undefined,
        });
      }
      if (Array.isArray(n?.children)) walk(n.children as CategoryNode[], depth + 1);
    }
  };
  walk(nodes, 1);
  return out;
}

export function buildHeaderMenu(
  tree: CategoryNode[] | null,
  config: HeaderNavItem[] = HEADER_NAV_CONFIG,
): { menu: Record<string, MegaGroup>; missing: string[] } {
  const menu: Record<string, MegaGroup> = {};
  const missing: string[] = [];
  if (!tree) return { menu, missing: config.map((c) => c.label) };

  for (const item of config) {
    const node = findByName(tree, item.match);
    if (!node) {
      missing.push(item.label);
      continue;
    }

    const href = `/kategori/${node.slug}`;
    const kids = Array.isArray(node.children) ? (node.children as CategoryNode[]) : [];
    const links = flattenDescendants(kids, 32);

    menu[item.label] = {
      href,
      categories: links.length > 0 ? links : [{ name: `Tüm ${item.label}`, href }],
      featured: { label: "Koleksiyon", title: item.label, href, image: nodeImage(node) },
    };
  }

  return { menu, missing };
}
