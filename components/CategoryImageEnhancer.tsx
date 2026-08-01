"use client";

import { useEffect } from "react";

function categoryFallbackFromImage(img: HTMLImageElement): string | null {
  const link = img.closest<HTMLAnchorElement>('a[href^="/kategori/"]');
  if (!link) return null;
  const slug = link.getAttribute("href")?.replace(/^\/kategori\//, "").split(/[?#]/)[0];
  return slug ? `/api/category-image/${encodeURIComponent(slug)}` : null;
}

function applyFallback(img: HTMLImageElement): void {
  const fallback = categoryFallbackFromImage(img);
  if (!fallback || img.dataset.categoryFallbackApplied === "1") return;

  const current = img.getAttribute("src")?.trim() ?? "";
  if (!current || img.complete && img.naturalWidth === 0) {
    img.dataset.categoryFallbackApplied = "1";
    img.src = fallback;
  }

  img.addEventListener(
    "error",
    () => {
      if (img.dataset.categoryFallbackApplied === "1") return;
      img.dataset.categoryFallbackApplied = "1";
      img.src = fallback;
    },
    { once: true }
  );
}

export function CategoryImageEnhancer() {
  useEffect(() => {
    const scan = (root: ParentNode = document) => {
      root.querySelectorAll<HTMLImageElement>('a[href^="/kategori/"] img').forEach(applyFallback);
    };

    scan();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches('a[href^="/kategori/"] img')) applyFallback(node as HTMLImageElement);
          scan(node);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
