"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackVisit } from "@/lib/visitTracker";

/**
 * Görünmez: her sayfa geçişini panelin ziyaretçi ölçümüne yazar (migration 118).
 * Sorgu parametreleri gönderilmez (yalnız yol). Kurallar lib/visitTracker.ts'de.
 */
export function VisitPageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) trackVisit("page_view");
  }, [pathname]);
  return null;
}
