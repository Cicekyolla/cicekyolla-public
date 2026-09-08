"use client";
// ============================================================================
// GLOBAL VERSION 80 — keşif çipleri ↔ vitrin ızgarası ortak filtre durumu.
// Filtre GERÇEK veriyle çalışır: kategori = o dilde canlı kategori üyeliği,
// destinasyon = ürünün teslimat profili (kargo şehirlerinde yalnız kargolanabilir).
// URL/cookie'ye yazılmaz; sayfa içi seçim durumudur.
// ============================================================================
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { V80Destination } from "@/lib/global/v80/schema";

export interface V80FilterState {
  category: string | null;
  categoryLabel: string | null;
  destination: V80Destination | null;
  destinationLabel: string | null;
  /** Vesile/kime gibi kategori-hedefli çipler için "seçilen kelime" (başlık). */
  intent: string | null;
}
interface Ctx extends V80FilterState {
  setCategory: (slug: string | null, label?: string | null, intent?: string | null) => void;
  setDestination: (city: V80Destination | null, label?: string | null) => void;
  clear: () => void;
  goShop: () => void;
  active: boolean;
}
const C = createContext<Ctx | null>(null);

export function scrollToShop() {
  const el = document.getElementById("shop");
  if (el) window.setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
}

export function V80FilterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<V80FilterState>({ category: null, categoryLabel: null, destination: null, destinationLabel: null, intent: null });
  const setCategory = useCallback((slug: string | null, label: string | null = null, intent: string | null = null) => {
    setState((s) => ({ ...s, category: slug, categoryLabel: slug ? label : null, intent: slug ? intent : null }));
  }, []);
  const setDestination = useCallback((city: V80Destination | null, label: string | null = null) => {
    setState((s) => ({ ...s, destination: city, destinationLabel: city ? label : null }));
  }, []);
  const clear = useCallback(() => setState({ category: null, categoryLabel: null, destination: null, destinationLabel: null, intent: null }), []);
  const value = useMemo<Ctx>(() => ({ ...state, setCategory, setDestination, clear, goShop: scrollToShop, active: !!(state.category || state.destination) }), [state, setCategory, setDestination, clear]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useV80Filter(): Ctx {
  const v = useContext(C);
  if (!v) throw new Error("useV80Filter must be used inside V80FilterProvider");
  return v;
}
