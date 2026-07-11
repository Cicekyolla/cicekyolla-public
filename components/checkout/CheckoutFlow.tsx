"use client";

// ---------------------------------------------------------------------------
// CHECKOUT FLOW — faz anahtarı. Önce AccountGate (Adım 1: Hesap), "Misafir Devam"
// → mevcut CheckoutForm (Alıcı bilgileri). CheckoutForm ve order POST DEĞİŞMEZ.
// ADDITIVE: mevcut formu ve /api/orders akışını olduğu gibi sarar.
// ---------------------------------------------------------------------------

import { useState } from "react";
import AccountGate from "./AccountGate";
import CheckoutWizard from "./CheckoutWizard";

export interface CheckoutAddon { id: number; name: string; priceMinor: number; image: string | null; category: string }

type Props = {
  productName: string;
  productId: number | null;
  priceMinor: number;
  productSlug: string;
  coverUrl?: string | null;
  addons?: CheckoutAddon[];
};

export default function CheckoutFlow({ productName, productId, priceMinor, productSlug, coverUrl, addons }: Props) {
  const [phase, setPhase] = useState<"gate" | "form">("gate");

  if (phase === "gate") {
    return (
      <AccountGate
        productName={productName}
        priceMinor={priceMinor}
        coverUrl={coverUrl}
        productSlug={productSlug}
        onContinue={() => setPhase("form")}
      />
    );
  }

  // Premium sipariş hazırlama deneyimi (Alıcı → Kart → Gönderen → Özet).
  return <CheckoutWizard productName={productName} productId={productId} priceMinor={priceMinor} productSlug={productSlug} coverUrl={coverUrl} addons={addons} />;
}
