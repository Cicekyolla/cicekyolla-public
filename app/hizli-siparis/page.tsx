import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchProductBySlug, fetchProducts, type PublicProductListItem, type CategoryNode } from "@/lib/api";
import { getCategoryTree } from "@/lib/categories";
import CheckoutFlow from "@/components/checkout/CheckoutFlow";

export const dynamic = "force-dynamic";

// SEO: /hizli-siparis?product=<slug> her ürün için ayrı bir URL üretiyor (132 adet)
// ama sayfa bir CHECKOUT adımı — arama sonucunda görünmesi gereken içerik değil ve
// kök layout başlığını miras aldığı için hepsi aynı başlıkla indexleniyordu.
// Çözüm: noindex + follow. Canonical BİLEREK verilmiyor — noindex ile canonical
// çelişkili sinyaldir ve noindex hedef ürün sayfasına taşınabilir. follow açık
// kalıyor ki bu sayfadaki /urun/<slug> linki taranmaya devam etsin.
// robots burada doğrudan yazılıyor; site-config'teki indexRobots() noindex
// durumunda nofollow da uyguluyor, bu sayfa için istenen davranış o değil.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}): Promise<Metadata> {
  const robots = { index: false, follow: true } as const;
  const slug = (await searchParams).product;
  const detail = slug ? await fetchProductBySlug(slug) : null;
  const name = detail?.product?.name;
  return {
    title: name ? `${name} — Hızlı Sipariş | ÇiçekYolla` : "Hızlı Sipariş | ÇiçekYolla",
    description: name
      ? `${name} için hızlı sipariş adımı. Teslimat bilgilerini girin, siparişinizi dakikalar içinde tamamlayın.`
      : "Hızlı sipariş adımı. Teslimat bilgilerini girin, siparişinizi dakikalar içinde tamamlayın.",
    robots,
  };
}

// "Hediye ve Tamamlayıcı Ürünler" düğümü + TÜM alt kategorilerinin ID'lerini toplar.
const GIFT_ROOT_SLUG = "hediye-ve-tamamlayici-urunler";
function collectGiftCategoryIds(tree: CategoryNode[] | null): number[] {
  if (!tree) return [];
  const ids: number[] = [];
  const pushSubtree = (n: CategoryNode) => {
    const id = Number((n as { id?: unknown }).id);
    if (Number.isFinite(id)) ids.push(id);
    (n.children ?? []).forEach(pushSubtree);
  };
  const find = (list: CategoryNode[]): boolean => {
    for (const n of list) {
      if (n.slug === GIFT_ROOT_SLUG) { pushSubtree(n); return true; }
      if (n.children && find(n.children)) return true;
    }
    return false;
  };
  find(tree);
  return ids;
}

export default async function HizliSiparisPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const sp = await searchParams;
  const slug = sp.product;
  if (!slug) notFound();

  const detail = await fetchProductBySlug(slug);
  if (!detail) notFound();

  const p = detail.product;
  const sale = p.sale_price_minor != null && Number(p.sale_price_minor) > 0 && Number(p.sale_price_minor) < Number(p.price_minor);
  const priceMinor = Math.round(sale ? Number(p.sale_price_minor) : Number(p.price_minor));
  const coverUrl = detail.images?.find((i) => i.role === "cover")?.url ?? detail.images?.[0]?.url ?? null;

  // Ek ürünler — ÖNCE "Hediye ve Tamamlayıcı Ürünler" kategorisi (+ alt kategorileri);
  // yoksa product_type gift/artificial fallback. Admin-yönetimli (SSOT), hardcoded ID yok.
  const catOf = (name: string): string => {
    const n = name.toLocaleLowerCase("tr");
    if (/(çikolata|cikolata|truf|praline|chocolate)/.test(n)) return "Çikolata";
    if (/(ayıcık|ayicik|peluş|pelus|teddy|tavşan|tavsan|oyuncak)/.test(n)) return "Ayıcık & Peluş";
    if (/(kart|card|pankart|mesaj)/.test(n)) return "Kart";
    if (/(balon|balloon)/.test(n)) return "Balon";
    if (/(mum|candle|koku|parfüm|parfum)/.test(n)) return "Mum & Koku";
    if (/(vazo|vase)/.test(n)) return "Vazo";
    if (/(yapay|artificial)/.test(n)) return "Yapay";
    return "Diğer";
  };

  const tree = await getCategoryTree().catch(() => null);
  const giftCatIds = collectGiftCategoryIds(tree);
  let addonRaw: PublicProductListItem[] = [];
  if (giftCatIds.length) {
    const lists = await Promise.all(giftCatIds.slice(0, 15).map((cid) => fetchProducts({ category_id: cid, page_size: 8 }).catch(() => [])));
    addonRaw = lists.flat();
  } else {
    const lists = await Promise.all([
      fetchProducts({ product_type: "gift", page_size: 12 }).catch(() => []),
      fetchProducts({ product_type: "artificial", page_size: 12 }).catch(() => []),
    ]);
    addonRaw = lists.flat();
  }

  const seen = new Set<number>();
  const addons = addonRaw
    .filter((a) => a.id !== p.id && a.cover_image_url && !seen.has(a.id) && seen.add(a.id))
    .map((a) => {
      const s = a.sale_price_minor != null && Number(a.sale_price_minor) > 0 && Number(a.sale_price_minor) < Number(a.price_minor);
      return { id: a.id, name: a.name, priceMinor: Math.round(s ? Number(a.sale_price_minor) : Number(a.price_minor)), image: a.cover_image_url ?? null, category: catOf(a.name) };
    })
    .sort((x, y) => x.priceMinor - y.priceMinor)
    .slice(0, 12);

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        <nav className="text-[13px] text-[#9CA3AF] mb-8">
          <Link href="/" className="hover:text-[#7C3AED]">Ana Sayfa</Link> / <Link href={`/urun/${p.slug}`} className="hover:text-[#7C3AED]">{p.name}</Link> / <span className="text-[#374151]">Sipariş</span>
        </nav>
        <CheckoutFlow productName={p.name} productId={p.id} priceMinor={priceMinor} productSlug={p.slug} coverUrl={coverUrl} addons={addons} />
      </div>
    </main>
  );
}
