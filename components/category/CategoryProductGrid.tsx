"use client";

/**
 * CICEKYOLLA — Kategori ürün grid'i (infinite scroll).
 * İlk 50 ürün SSR'den (initialItems) gelir; kullanıcı aşağı indikçe IntersectionObserver
 * ile sonraki 50 server action'dan yüklenir. id bazlı dedupe → duplicate/atlama YOK.
 * Sıralama server'da korunur (aynı sort). Skeleton + "Tekrar dene" + liste-sonu durumu.
 * Tasarım dili korunur; ProductCard birebir kullanılır.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProductCard, type CardContextTag } from "@/components/home/ProductCard";
import type { CardProduct } from "@/lib/api";
import { loadCategoryProducts } from "@/lib/categoryProducts.actions";

export type CategorySort =
  | "created_at_desc"
  | "price_asc"
  | "price_desc"
  | "name_asc";

export interface CategoryProductGridProps {
  initialItems: CardProduct[];
  categoryId: number;
  total: number;
  totalPages: number;
  sort: CategorySort;
  pageSize?: number;
  filters?: {
    type?: string;
    sameDay?: boolean;
    bestseller?: boolean;
    isNew?: boolean;
  };
  contextTag?: CardContextTag;
}

function CardSkeleton() {
  return (
    <div className="flex flex-col h-full rounded-[20px] border border-[#F1F0F5] bg-white overflow-hidden">
      <div className="bg-[#F5F3FF] animate-pulse" style={{ aspectRatio: "4/5" }} />
      <div className="flex flex-col flex-1 px-4 pt-3.5 pb-4">
        <div className="h-3.5 rounded bg-[#F1F0F5] animate-pulse mb-2" />
        <div className="h-3.5 w-2/3 rounded bg-[#F1F0F5] animate-pulse" />
        <div className="mt-auto pt-3 h-4 w-1/3 rounded bg-[#EDE9FE] animate-pulse" />
      </div>
    </div>
  );
}

export function CategoryProductGrid({
  initialItems,
  categoryId,
  total,
  totalPages,
  sort,
  pageSize = 50,
  filters,
  contextTag,
}: CategoryProductGridProps) {
  const [items, setItems] = useState<CardProduct[]>(initialItems);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [maxPages, setMaxPages] = useState(totalPages);

  // Görülen id kümesi — duplicate önleme (ref: render tetiklemez).
  const seen = useRef<Set<number>>(new Set(initialItems.map((p) => p.id)));
  const sentinel = useRef<HTMLDivElement | null>(null);

  const done = page >= maxPages;

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    setError(false);
    try {
      const next = page + 1;
      const res = await loadCategoryProducts({
        categoryId,
        page: next,
        pageSize,
        sort,
        type: filters?.type,
        sameDay: filters?.sameDay,
        bestseller: filters?.bestseller,
        isNew: filters?.isNew,
      });
      const fresh = res.items.filter((p) => !seen.current.has(p.id));
      fresh.forEach((p) => seen.current.add(p.id));
      setItems((prev) => [...prev, ...fresh]);
      setMaxPages(res.totalPages || maxPages);
      setPage(next);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [loading, done, page, categoryId, pageSize, sort, filters, maxPages]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || done) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "700px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, done]);

  const shownTotal = useMemo(() => Math.max(total, items.length), [total, items.length]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-7">
        {items.map((product, idx) => (
          <ProductCard key={product.id} product={product} idx={Math.min(idx, 7)} contextTag={contextTag} />
        ))}
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={`sk-${i}`} />)
          : null}
      </div>

      {/* IntersectionObserver hedefi */}
      <div ref={sentinel} aria-hidden="true" className="h-px w-full" />

      {/* Hata → Tekrar dene */}
      {error && !loading ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-[13px] text-[#9CA3AF]">Ürünler yüklenirken bir sorun oluştu.</p>
          <button
            onClick={() => loadMore()}
            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors"
          >
            Tekrar dene
          </button>
        </div>
      ) : null}

      {/* Liste sonu */}
      {done && items.length > 0 && !loading ? (
        <div className="flex items-center justify-center gap-3 py-10 text-[12px] text-[#C4B5FD]">
          <span className="h-px w-10 bg-[#EDE9FE]" />
          Tüm ürünler yüklendi ({shownTotal})
          <span className="h-px w-10 bg-[#EDE9FE]" />
        </div>
      ) : null}
    </>
  );
}
