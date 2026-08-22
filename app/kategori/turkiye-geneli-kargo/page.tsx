import type { Metadata } from "next";
import { CargoCategoryExperience } from "@/components/category/CargoCategoryExperience";
import { fetchProducts, fetchProductsPaged, fetchSeoPage, toCardProduct, type PublicProductListItem } from "@/lib/api";
import { getCategoryTree } from "@/lib/categories";
import { findCategoryIdBySlug } from "@/lib/catalog";

/** Tüm kargoya uygun aktif ürünler (profil filtresi, sayfalı toplanır; üst sınır 1000). */
async function fetchCargoCapableProducts(): Promise<PublicProductListItem[]> {
  const out: PublicProductListItem[] = [];
  for (let page = 1; page <= 10; page++) {
    const r = await fetchProductsPaged({ delivery_model: "cargo_capable", page_size: 100, page, sort: "created_at_desc" });
    out.push(...r.items);
    if (page >= (r.pagination?.total_pages ?? 1)) break;
  }
  return out;
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Türkiye Geneli Kargo",
  description: "Kargoya uygun saksı bitkileri, sukulentler, yapay çiçekler ve hediye kutuları.",
  alternates: { canonical: "/kategori/turkiye-geneli-kargo" },
};

export default async function NationwideCargoPage() {
  // ÜRÜN KAYNAĞI = TESLİMAT PROFİLİ (cargo ∪ same_day_and_cargo). Legacy delivery_scope
  // ve product_type şehir dışı gönderim yetkisi VEREMEZ; kategori kendi başına da vermez.
  // Kargo Merkezi'nde onaylanmamış ürün bu vitrine giremez. SEO/metadata/bloklar AYNEN.
  const [managed, tree, cargoCapable] = await Promise.all([
    fetchSeoPage("/kategori/turkiye-geneli-kargo"),
    getCategoryTree(),
    fetchCargoCapableProducts(),
  ]);
  const categoryId = tree ? findCategoryIdBySlug(tree, "turkiye-geneli-kargo") : null;
  const categoryProducts = categoryId
    ? await fetchProducts({ category_id: categoryId, delivery_model: "cargo_capable", page_size: 100, sort: "created_at_desc" })
    : [];
  const unique = new Map<number, PublicProductListItem>();
  [...categoryProducts, ...cargoCapable].forEach((product) => {
    if (product.status === "active" && product.cover_image_url) unique.set(product.id, product);
  });
  const selectedIds = (managed?.body_blocks ?? [])
    .filter((block) => block.type === "cargo-product" && block.enabled !== false && block.value !== "false")
    .map((block) => Number(block.product_id ?? block.value))
    .filter(Number.isFinite);
  const products = selectedIds.length
    ? selectedIds.map((id) => unique.get(id)).filter((product): product is PublicProductListItem => Boolean(product))
    : [...unique.values()];
  return <CargoCategoryExperience products={products.map(toCardProduct)} blocks={managed?.body_blocks ?? []} />;
}
