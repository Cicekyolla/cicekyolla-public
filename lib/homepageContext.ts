// Homepage render context — kategori-kaynaklı bölümler için (collection_rail,
// featured_collections, occasion_shopping). page.tsx ve önizleme route'u aynı
// gerçek Category Center verisini kullanır (tek kaynak).
import { getCategoryTree } from "@/lib/categories";
import { mapTreeToItems } from "@/lib/catalog";
import { buildCollectionSlider } from "@/lib/collectionSlider";
import type { RenderCtx } from "@/components/home/HomepageRenderer";

export async function getHomepageContext(): Promise<RenderCtx> {
  const tree = await getCategoryTree();
  const liveItems = tree ? mapTreeToItems(tree) : [];
  const collections = buildCollectionSlider(tree, 50);
  const imagedCollections = liveItems.filter((c) => c.image);
  return { collections, imagedCollections };
}
