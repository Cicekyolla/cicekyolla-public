// ============================================================================
// lib/productBreadcrumb.ts — ADDITIVE (SEO yayın zinciri). Yaprak modül:
// çalışma zamanı ithali YOK → hem Next paketleyicisi hem `node --test` doğrudan
// yükler (lib/productBreadcrumb.test.ts). Bağımlılıklar DIŞARIDAN verilir
// (lib/productSchema.ts ile aynı desen).
//
// TR ürün sayfasının (/urun/<slug>) iki kuralı burada saf karar olarak durur:
//
//  1) KANONİK SLUG. Canonical, og:url ve JSON-LD url KAYITLI slug'tan üretilir; istek
//     slug'ı kayıtlı slug'tan farklıysa kalıcı yönlendirme yapılır.
//     DÜZELTME (5 Eki 2026): buradaki eski gerekçe ("API araması büyük/küçük harf duyarsız;
//     /urun/Kirmizi-Gul 200 dönüyor") YANLIŞTI. API slug'ı aramadan önce küçük harf biçimine
//     göre doğrular; büyük harfli yazım ürün döndürmez → sayfa 404 verir (main'de de). Bu kural
//     büyük harfi YÖNLENDİRMEZ; yalnız API'nin farklı yazımla ürün döndürdüğü durumda devreye
//     giren bir emniyet kuralıdır.
//
//  2) BREADCRUMB. BreadcrumbList yalnız istemcide (BreadcrumbSchemaTracker)
//     ve var olmayan "/urunler" basamağıyla enjekte ediliyordu. Artık sunucuda:
//     Ana Sayfa → birincil kategori (varsa) → ürün. Görünür kırıntı ile aynı
//     adlar, aynı adresler.
// ============================================================================

/**
 * İstek slug'ı kayıtlı slug'tan farklıysa gidilecek kanonik yol; aynıysa null.
 * Karşılaştırma yüzde-kodlaması çözülerek yapılır: hedefe varıldığında istek
 * slug'ı kayıtlı slug'a eşit olur → yönlendirme DÖNGÜSÜ oluşmaz.
 */
export function productSlugRedirectPath(requestSlug: string, storedSlug: string | null | undefined): string | null {
  const stored = typeof storedSlug === "string" ? storedSlug.trim() : "";
  if (!stored) return null;
  let requested = requestSlug;
  try {
    requested = decodeURIComponent(requestSlug);
  } catch {
    // Bozuk yüzde-kodlaması: ham değerle karşılaştırılır.
  }
  if (requested === stored || requestSlug === stored) return null;
  return `/urun/${encodeURIComponent(stored)}`;
}

/**
 * EK — yönlendirme hedefine isteğin SORGU DİZESİNİ taşır (gclid, utm_* …): büyük/küçük harf
 * farkıyla gelen bir reklam / kampanya bağlantısı kanonik adrese giderken tıklama ilişkilendirmesini
 * kaybetmesin. Next `searchParams` biçimi (string | string[] | undefined) aynen kodlanır; yinelenen
 * anahtarlar sırasıyla korunur, değeri olmayan (undefined) anahtar yazılmaz. Sorgu yoksa yol aynen döner.
 */
export function withRequestQuery(
  path: string,
  searchParams: { [key: string]: string | string[] | undefined } | null | undefined,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === "string") query.append(key, item);
    }
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Kategori ağacı düğümünün bu modülün okuduğu yüzü (lib/api.ts → CategoryNode ile uyumlu). */
export interface CategoryTreeNodeLike {
  name?: unknown;
  slug?: unknown;
  children?: unknown;
  [key: string]: unknown;
}

/** Ağaçta (derinlik dahil) id'si eşleşen ilk düğüm; id geçersizse / bulunamazsa null. */
export function findCategoryNodeById<T extends CategoryTreeNodeLike>(
  nodes: readonly T[] | null | undefined,
  id: number | string | null | undefined,
): T | null {
  const wanted = Number(id);
  if (!nodes || !Number.isFinite(wanted) || wanted <= 0) return null;
  let found: T | null = null;
  const walk = (list: readonly T[]): void => {
    for (const n of list) {
      if (found) return;
      if (n && Number(n.id) === wanted) { found = n; return; }
      if (Array.isArray(n?.children)) walk(n.children as T[]);
    }
  };
  walk(nodes);
  return found;
}

export interface ProductBreadcrumbCategory {
  name: string;
  slug: string;
}

/** Düğüm → kırıntı kategorisi (ad + slug dolu değilse null → orta basamak yazılmaz). */
export function breadcrumbCategoryOf(node: CategoryTreeNodeLike | null | undefined): ProductBreadcrumbCategory | null {
  const name = typeof node?.name === "string" ? node.name.trim() : "";
  const slug = typeof node?.slug === "string" ? node.slug.trim() : "";
  return name && slug ? { name, slug } : null;
}

export interface ProductBreadcrumbInput {
  /** Ürün adı (son basamak). */
  name: string;
  /** Ürünün KANONİK yolu: /urun/<kayıtlı-slug>. */
  path: string;
  /** Birincil kategori; yoksa zincir iki basamaklıdır (Ana Sayfa → ürün). */
  category?: ProductBreadcrumbCategory | null;
}

/** TR ürün sayfasının BreadcrumbList JSON-LD nesnesi — tüm adresler MUTLAK. */
export function buildProductBreadcrumbJsonLd(
  input: ProductBreadcrumbInput,
  absolute: (path: string) => string,
): Record<string, unknown> {
  const steps: { name: string; path: string }[] = [{ name: "Ana Sayfa", path: "/" }];
  if (input.category) steps.push({ name: input.category.name, path: `/kategori/${input.category.slug}` });
  steps.push({ name: input.name, path: input.path });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: steps.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: absolute(step.path),
    })),
  };
}
