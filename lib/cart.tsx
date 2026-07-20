"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  key: string;
  productId: number;
  productSlug: string;
  name: string;
  variantId: number | null;
  variantTitle: string | null;
  quantity: number;
  unitPriceMinor: number;
  image: string;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotalMinor: number;
  addItem: (item: Omit<CartItem, "key" | "quantity">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "cicekyolla.cart.v1";

function itemKey(item: Pick<CartItem, "productId" | "variantId">) {
  return `${item.productId}:${item.variantId ?? "base"}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) setItems(parsed.filter((item) => item && item.quantity > 0));
      }
    } catch {
      // Bozuk/okunamayan storage cart'i kilitlemez.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalMinor: items.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0),
    addItem(item, quantity = 1) {
      const key = itemKey(item);
      setItems((current) => {
        const found = current.find((entry) => entry.key === key);
        if (found) return current.map((entry) => entry.key === key ? { ...entry, quantity: entry.quantity + quantity } : entry);
        return [...current, { ...item, key, quantity }];
      });
    },
    setQuantity(key, quantity) {
      setItems((current) => quantity > 0
        ? current.map((entry) => entry.key === key ? { ...entry, quantity } : entry)
        : current.filter((entry) => entry.key !== key));
    },
    removeItem(key) {
      setItems((current) => current.filter((entry) => entry.key !== key));
    },
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
