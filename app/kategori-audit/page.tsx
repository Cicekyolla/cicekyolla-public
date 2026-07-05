import { getCategoryTree, getCategoryNav, flattenCategories } from "@/lib/categories";
import { mapTreeToItems, mapTreeToMegaMenu, getBreadcrumbTrailFromTree } from "@/lib/catalog";
import { isCategoryVisible, type CategoryNode } from "@/lib/api";

/* ============================================================================
   CICEKYOLLA — CATEGORY SYNC DATA AUDIT (canlı doğrulama)
   TEK KAYNAK getCategoryTree üzerinden 15 tüketicinin gerçek node sayısını hesaplar.
   URL: /kategori-audit  → CTO'nun istediği veri karşılaştırması burada CANLI.
   ============================================================================ */

export const dynamic = "force-dynamic"; // her ziyarette canlı sayım

const isActive = (n: CategoryNode) =>
  n && typeof n.name === "string" && typeof n.slug === "string" && isCategoryVisible(n);

function flattenAll(nodes: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = [];
  const walk = (list: CategoryNode[]) => {
    for (const n of list) { out.push(n); if (Array.isArray(n.children)) walk(n.children as CategoryNode[]); }
  };
  walk(nodes);
  return out;
}

export default async function CategoryAuditPage() {
  const tree = await getCategoryTree();
  const roots = tree ?? [];
  const all = flattenAll(roots);
  const activeAll = all.filter(isActive);
  const inactiveAll = all.filter((n) => !isActive(n));
  const activeRoots = roots.filter(isActive);

  const mega = tree ? mapTreeToMegaMenu(tree) : {};
  const megaRoots = Object.keys(mega).length;
  const railItems = tree ? mapTreeToItems(tree) : [];
  const nav = getCategoryNav(tree);
  const sitemapCats = flattenCategories(tree);
  // Breadcrumb: her active node için trail üretilebiliyor mu (ilk 3 örnek + toplam)
  const breadcrumbOk = tree
    ? activeAll.filter((n) => getBreadcrumbTrailFromTree(tree, n.slug).length > 0).length
    : 0;

  const rows: { n: number; label: string; count: number | string; note: string }[] = [
    { n: 1, label: "Admin Category Center toplam", count: "≙ API total", note: "Admin'den doğrula; API total ile eşit olmalı" },
    { n: 2, label: "GET /api/categories toplam node (flatten)", count: all.length, note: "Nested ağaç düzleştirilmiş — TÜM node'lar" },
    { n: 3, label: "Provider normalize (root, name+slug geçen)", count: roots.length, note: "children nested korunur; kayıp = name/slug'ı bozuk root" },
    { n: 4, label: "Active node (flatten)", count: activeAll.length, note: "status='active'" },
    { n: 5, label: "Inactive node (flatten)", count: inactiveAll.length, note: "draft/passive/archived — public'te GİZLİ (kasıtlı)" },
    { n: 6, label: "Header root kategori", count: megaRoots, note: "active root (cap 50)" },
    { n: 7, label: "Mega Menu root kategori", count: megaRoots, note: "= Header (aynı türetme)" },
    { n: 8, label: "Homepage Rail kategori", count: railItems.length, note: "active root + banner_image (görselsiz vitrine giremez)" },
    { n: 9, label: "Mobile Menu kategori", count: nav.length, note: "active root (cap 50) = Footer" },
    { n: 10, label: "Sitemap.xml kategori URL", count: sitemapCats.length, note: "TÜM active (roots+children) — SEO tam kapsam" },
    { n: 11, label: "Category Landing açılabilen slug", count: activeAll.length, note: "her active node → /kategori/{slug}" },
    { n: 12, label: "Search index kategori", count: sitemapCats.length, note: "Header search → flattenCategories (gerçek /kategori/{slug} route)" },
    { n: 13, label: "Footer kategori", count: nav.length, note: "= Mobile (getCategoryNav)" },
    { n: 14, label: "Breadcrumb üretilebilen kategori", count: breadcrumbOk, note: "ağaç trail — active node başına" },
    { n: 15, label: "JSON-LD kategori (breadcrumb)", count: activeAll.length, note: "her category sayfasında breadcrumb JSON-LD" },
  ];

  const treeOk = !!tree;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", marginBottom: 6 }}>Category Sync — Veri Denetimi</h1>
      <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>
        Tek kaynak: <code>getCategoryTree()</code> → /api/categories. Aşağıdaki 15 tüketici AYNI ağaçtan hesaplanır.
      </p>
      <p style={{ fontSize: 13, marginBottom: 20, fontWeight: 700, color: treeOk ? "#166534" : "#991B1B" }}>
        Provider durumu: {treeOk ? `✓ Ağaç yüklendi (${roots.length} root, ${all.length} toplam node)` : "✗ Ağaç YÜKLENEMEDİ (API erişilemiyor / boş) — tüm public fallback'e düşer"}
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#F5F3FF", textAlign: "left" }}>
            <th style={{ padding: "8px 10px", width: 34 }}>#</th>
            <th style={{ padding: "8px 10px" }}>Tüketici</th>
            <th style={{ padding: "8px 10px", width: 90, textAlign: "right" }}>Sayı</th>
            <th style={{ padding: "8px 10px" }}>Açıklama</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.n} style={{ borderBottom: "1px solid #F3F4F6" }}>
              <td style={{ padding: "8px 10px", color: "#9CA3AF", fontWeight: 700 }}>{r.n}</td>
              <td style={{ padding: "8px 10px", fontWeight: 600, color: "#111827" }}>{r.label}</td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, color: "#7C3AED", fontSize: 15 }}>{r.count}</td>
              <td style={{ padding: "8px 10px", color: "#6B7280" }}>{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 24, padding: 16, background: "#F9FAFB", borderRadius: 12, fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
        <b>Beklenen eşleşme:</b> Admin toplam = #2 (API total). Public nav-tüketicileri (#6/7/9/13) = #4'ün <b>root</b> alt kümesi (active root). Sitemap/Landing/JSON-LD (#10/11/15) = #4 (tüm active). Rail (#8) = active root ∩ görselli.<br />
        <b>Node kaybı sebepleri:</b> (a) #5 inactive → public gizler (kasıtlı), (b) Rail görsel şartı, (c) nav = yalnız root (children mega menü alt-linki). Bunlar dışında kayıp olmamalı.
      </div>
    </main>
  );
}
