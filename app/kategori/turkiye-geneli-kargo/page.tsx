import type { Metadata } from "next";
import { CargoCategoryExperience } from "@/components/category/CargoCategoryExperience";
import { fetchProducts, fetchSeoPage, toCardProduct, type PublicProductListItem } from "@/lib/api";
import { getCategoryTree } from "@/lib/categories";
import { findCategoryIdBySlug } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Türkiye Geneli Kargo — ÇiçekYolla",
  description: "Kargoya uygun saksı bitkileri, sukulentler, yapay çiçekler ve hediye kutuları.",
  alternates: { canonical: "/kategori/turkiye-geneli-kargo" },
};

export default async function NationwideCargoPage() {
  const [managed, tree, plants, artificial, gifts] = await Promise.all([
    fetchSeoPage("/kategori/turkiye-geneli-kargo"),
    getCategoryTree(),
    fetchProducts({ product_type: "plant", page_size: 60, sort: "created_at_desc" }),
    fetchProducts({ product_type: "artificial", page_size: 60, sort: "created_at_desc" }),
    fetchProducts({ product_type: "gift", page_size: 60, sort: "created_at_desc" }),
  ]);
  const categoryId = tree ? findCategoryIdBySlug(tree, "turkiye-geneli-kargo") : null;
  const categoryProducts = categoryId
    ? await fetchProducts({ category_id: categoryId, page_size: 60, sort: "created_at_desc" })
    : [];
  const unique = new Map<number, PublicProductListItem>();
  [...categoryProducts, ...plants, ...artificial, ...gifts].forEach((product) => {
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
