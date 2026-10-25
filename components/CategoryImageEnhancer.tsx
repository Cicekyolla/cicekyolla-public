"use client";

import { useEffect } from "react";
import { mediaUrl } from "@/lib/media";

function categoryFallbackFromImage(img: HTMLImageElement): string | null {
  const link = img.closest<HTMLAnchorElement>('a[href^="/kategori/"]');
  if (!link) return null;
  const slug = link.getAttribute("href")?.replace(/^\/kategori\//, "").split(/[?#]/)[0];
  return slug ? `/api/category-image/${encodeURIComponent(slug)}` : null;
}

// 25 Eki 2026 (Editör Seçimleri görsel hatası): Admin'den yüklenen kart görseli r2.dev adresiyle
// kaydediliyor; r2.dev TR ağlarında bloklu → görsel hata veriyor ve eskiden HEMEN
// /api/category-image/ yedeğine düşülüyordu (kategoride görsel yoksa yer tutucu = boş kart).
// Sıra artık: (1) kartın kendi görseli → (2) aynı görselin same-origin /r2/ yolu →
// (3) kategori yedeği → (4) yedek de hata verirse kartın kendi /r2/ görseline geri dön.
function ownProxied(img: HTMLImageElement): string | null {
  const own = img.dataset.categoryOwnSrc ?? img.getAttribute("src")?.trim() ?? "";
  const proxied = mediaUrl(own);
  return proxied && proxied !== own ? proxied : null;
}

function nextCandidate(img: HTMLImageElement, fallback: string): void {
  if (img.dataset.categoryOwnTried !== "1") {
    img.dataset.categoryOwnTried = "1";
    const proxied = ownProxied(img);
    if (proxied) {
      img.src = proxied;
      return;
    }
  }
  if (img.dataset.categoryFallbackApplied !== "1") {
    img.dataset.categoryFallbackApplied = "1";
    img.src = fallback;
    return;
  }
  // Kategori yedeği de açılmadı: kırık simge yerine kartın kendi görseli (son deneme).
  if (img.dataset.categoryRestored !== "1") {
    img.dataset.categoryRestored = "1";
    const own = ownProxied(img) ?? img.dataset.categoryOwnSrc;
    if (own) img.src = own;
  }
}

function applyFallback(img: HTMLImageElement): void {
  const fallback = categoryFallbackFromImage(img);
  if (!fallback || img.dataset.categoryEnhanced === "1") return;
  img.dataset.categoryEnhanced = "1";

  const current = img.getAttribute("src")?.trim() ?? "";
  if (current) img.dataset.categoryOwnSrc = current;
  if (!current) {
    img.dataset.categoryOwnTried = "1";
    img.dataset.categoryFallbackApplied = "1";
    img.src = fallback;
  } else if (img.complete && img.naturalWidth === 0) {
    nextCandidate(img, fallback);
  }

  img.addEventListener("error", () => nextCandidate(img, fallback));
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
