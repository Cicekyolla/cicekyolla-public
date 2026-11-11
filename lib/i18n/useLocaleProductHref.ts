"use client";
// 11 Kas 2026 (ADDITIVE): sepet satırının ürün bağı müşterinin dilinde (bkz. lib/i18n/productPath.ts).
// TR'de ve çözülene kadar bugünkü `/urun/<tr-slug>` aynen; oturum içi bellek tekrar isteği önler.
import { useEffect, useState } from "react";
import { useI18n } from "./index";

const cache = new Map<string, string | null>();

export function useLocaleProductHref(trSlug: string): string {
  const { locale } = useI18n();
  const fallback = `/urun/${trSlug}`;
  const key = locale !== "tr" && trSlug ? `${locale}:${trSlug}` : "";
  const [href, setHref] = useState<string>(() => (key && cache.get(key)) || fallback);
  useEffect(() => {
    if (!key) { setHref(fallback); return; }
    if (cache.has(key)) { setHref(cache.get(key) || fallback); return; }
    let alive = true;
    fetch(`/api/i18n/product-path?slug=${encodeURIComponent(trSlug)}&locale=${locale}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const p = typeof j?.data?.path === "string" && j.data.path.startsWith(`/${locale}/`) ? (j.data.path as string) : null;
        cache.set(key, p);
        if (alive) setHref(p || fallback);
      })
      .catch(() => { if (alive) setHref(fallback); });
    return () => { alive = false; };
  }, [key, trSlug, locale, fallback]);
  return href;
}
