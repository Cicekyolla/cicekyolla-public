"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PendingDelivery } from "@/lib/pendingDelivery";
import { pushEcommerceEvent } from "@/lib/analytics";
import { metaTrack } from "@/lib/metaPixel";
import { istanbulNow, partitionExpired, expiryStamp } from "@/lib/deliveryExpiry";
import { anchorServerClock, graceMinutes, nowMs } from "@/lib/serverClock";

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
  delivery?: PendingDelivery;
};

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  itemCount: number;
  subtotalMinor: number;
  addItem: (item: Omit<CartItem, "key" | "quantity">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  /** Checkout içinde teslimat düzenlenince TÜM satırlara yazar. Sepet teslimatın
   *  tek kaynağıdır; checkout ayrı bir kopya tutmaz. Satır anahtarı teslimatı
   *  içerdiği için yeniden hesaplanır, aksi halde aynı ürün+teslimat tekrar
   *  eklendiğinde mükerrer satır oluşurdu. */
  updateAllDelivery: (delivery: PendingDelivery) => void;
  /** Teslimat tarihi geçmiş satırları güvenle temizler (sepet açılışı, sekmeye
   *  dönüş ve checkout girişinde çağrılır). Tarihsiz satıra DOKUNMAZ. */
  pruneExpiredDelivery: () => void;
  /** Son temizlikte düşen satırlar — ekranda tek seferlik bilgi şeridi için. */
  expiredNotice: { count: number; names: string[] } | null;
  dismissExpiredNotice: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "cicekyolla.cart.v1";

function itemKey(item: Pick<CartItem, "productId" | "variantId" | "delivery">) {
  const deliveryKey = item.delivery
    ? `${item.delivery.date ?? "date"}:${item.delivery.slotId ?? item.delivery.slotLabel ?? item.delivery.mode ?? "delivery"}:${item.delivery.placeId ?? item.delivery.address ?? "address"}`
    : "legacy";
  return `${item.productId}:${item.variantId ?? "base"}:${deliveryKey}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [expiredNotice, setExpiredNotice] = useState<{ count: number; names: string[] } | null>(null);
  // Aynı satır için tekrar tekrar bildirim göstermemek adına biriktirici.
  const noticeSeen = useRef<Set<string>>(new Set());
  // Temizlik state güncellemesi DIŞINDA karar verir; güncel liste burada tutulur.
  const itemsRef = useRef<CartItem[]>([]);

  /** Teslimat tarihi GERÇEKTEN geçmiş satırları düşürür.
   *  Kural: tarihsiz satır asla silinmez; saat sunucuya demirlenmemişse
   *  emniyet payı uygulanır (bkz. serverClock.ts / deliveryExpiry.ts). */
  const pruneExpiredDelivery = useCallback(() => {
    const current = itemsRef.current;
    if (current.length === 0) return;
    const { kept, expired } = partitionExpired(
      current,
      (row) => row.delivery,
      istanbulNow(nowMs()),
      graceMinutes(),
    );
    if (expired.length === 0) return;
    const fresh = expired.filter((row) => !noticeSeen.current.has(row.key));
    for (const row of fresh) noticeSeen.current.add(row.key);
    itemsRef.current = kept;
    setItems(kept);
    if (fresh.length > 0) {
      // BİRİKİMLİ: temizlik iki turda çalışır (önce tarayıcı saati + emniyet payı,
      // sonra sunucu saatine demirlenmiş kesin tur). Bildirimi EZERSEK müşteri
      // 3 satır kaybedip "1 ürün kaldırıldı" okur. Canlı read-back'te görüldü.
      setExpiredNotice((prev) => (prev
        ? { count: prev.count + fresh.length, names: [...prev.names, ...fresh.map((row) => row.name)] }
        : { count: fresh.length, names: fresh.map((row) => row.name) }));
    }
  }, []);

  // Ref her commit'te tazelenir; AŞAĞIDAKİ etkilerden ÖNCE tanımlı olduğu için
  // temizlik etkisi çalıştığında güncel listeyi görür (etkiler tanım sırasıyla koşar).
  useEffect(() => { itemsRef.current = items; }, [items]);

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

  // ── Süresi geçmiş teslimat temizliği ──────────────────────────────────────
  // 1) Sepet okunur okunmaz (tarayıcı saati + emniyet payı ile ihtiyatlı tur).
  // 2) Ardından sunucu saatine demirlenip kesin tur (yalnız tarihli satır varsa
  //    ağa çıkılır — boş/tarihsiz sepette istek YOK).
  // 3) Sekmeye geri dönüldüğünde tekrar (uzun süre açık kalan sekme).
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    pruneExpiredDelivery();
    if (items.some((item) => expiryStamp(item.delivery) !== null)) {
      void anchorServerClock().then((ok) => { if (ok && !cancelled) pruneExpiredDelivery(); });
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const recheck = () => { if (document.visibilityState === "visible") pruneExpiredDelivery(); };
    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("focus", recheck);
    return () => {
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("focus", recheck);
    };
  }, [hydrated, pruneExpiredDelivery]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    hydrated,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalMinor: items.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0),
    addItem(item, quantity = 1) {
      const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

      pushEcommerceEvent("add_to_cart", {
        currency: "TRY",
        value: (item.unitPriceMinor * safeQuantity) / 100,
        items: [
          {
            item_id: String(item.productId),
            item_name: item.name,
            item_brand: "ÇiçekYolla",
            item_variant: item.variantTitle || undefined,
            price: item.unitPriceMinor / 100,
            quantity: safeQuantity,
          },
        ],
      });
      /* Meta Pixel — gerçek products.id (slug DEĞİL), Catalog retailer_id ile aynı kimlik. */
      metaTrack("AddToCart", {
        content_ids: [String(item.productId)],
        content_type: "product",
        value: (item.unitPriceMinor * safeQuantity) / 100,
        currency: "TRY",
        num_items: safeQuantity,
      });

      const key = itemKey(item);
      setItems((current) => {
        const found = current.find((entry) => entry.key === key);
        if (found) return current.map((entry) => entry.key === key ? { ...entry, quantity: entry.quantity + safeQuantity } : entry);
        return [...current, { ...item, key, quantity: safeQuantity }];
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
    clearCart() {
      setItems([]);
    },
    updateAllDelivery(delivery) {
      setItems((current) =>
        current.map((entry) => {
          const next = { ...entry, delivery };
          return { ...next, key: itemKey(next) };
        })
      );
    },
    pruneExpiredDelivery,
    expiredNotice,
    dismissExpiredNotice() { setExpiredNotice(null); },
  }), [hydrated, items, pruneExpiredDelivery, expiredNotice]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
