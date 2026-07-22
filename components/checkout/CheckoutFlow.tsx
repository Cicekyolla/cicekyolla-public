"use client";

// ---------------------------------------------------------------------------
// CHECKOUT FLOW — faz anahtarı. Önce AccountGate (Adım 1: Hesap), "Misafir Devam"
// → mevcut CheckoutForm (Alıcı bilgileri). CheckoutForm ve order POST DEĞİŞMEZ.
// ADDITIVE: mevcut formu ve /api/orders akışını olduğu gibi sarar.
// ---------------------------------------------------------------------------

import { useState } from "react";
import AccountGate from "./AccountGate";
import CheckoutWizard from "./CheckoutWizard";
import type { PendingDelivery } from "@/lib/pendingDelivery";

export interface CheckoutAddon { id: number; productId?: number; variantId?: number | null; name: string; priceMinor: number; image: string | null; category: string }

type Props = {
  productName: string;
  productId: number | null;
  variantId?: number | null;
  priceMinor: number;
  productSlug: string;
  coverUrl?: string | null;
  addons?: CheckoutAddon[];
  quantity?: number;
  initialAddonQty?: Record<number, number>;
  totalMinor?: number;
  returnPath?: string;
  delivery?: PendingDelivery;
  onComplete?: () => void;
};

export default function CheckoutFlow({ productName, productId, variantId, priceMinor, productSlug, coverUrl, addons, quantity = 1, initialAddonQty, totalMinor, returnPath, delivery, onComplete }: Props) {
  const [phase, setPhase] = useState<"gate" | "form">("gate");

  if (phase === "gate") {
    return (
      <AccountGate
        productName={productName}
        priceMinor={priceMinor}
        coverUrl={coverUrl}
        productSlug={productSlug}
        quantity={quantity}
        totalMinor={totalMinor}
        returnPath={returnPath}
        delivery={delivery}
        onContinue={() => setPhase("form")}
      />
    );
  }

  // Premium sipariş hazırlama deneyimi (Alıcı → Kart → Gönderen → Özet).
  return <CheckoutWizard productName={productName} productId={productId} variantId={variantId} priceMinor={priceMinor} productSlug={productSlug} coverUrl={coverUrl} addons={addons} quantity={quantity} initialAddonQty={initialAddonQty} delivery={delivery} onComplete={onComplete} />;
}
