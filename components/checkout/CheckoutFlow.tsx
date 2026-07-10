"use client";

// ---------------------------------------------------------------------------
// CHECKOUT FLOW — faz anahtarı. Önce AccountGate (Adım 1: Hesap), "Misafir Devam"
// → mevcut CheckoutForm (Alıcı bilgileri). CheckoutForm ve order POST DEĞİŞMEZ.
// ADDITIVE: mevcut formu ve /api/orders akışını olduğu gibi sarar.
// ---------------------------------------------------------------------------

import { useState } from "react";
import AccountGate from "./AccountGate";
import { CheckoutForm } from "./CheckoutForm";

type Props = {
  productName: string;
  productId: number | null;
  priceMinor: number;
  productSlug: string;
  coverUrl?: string | null;
};

export default function CheckoutFlow({ productName, productId, priceMinor, productSlug, coverUrl }: Props) {
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

  // Alıcı Bilgileri — mevcut form (birebir korunur).
  return <CheckoutForm productName={productName} productId={productId} priceMinor={priceMinor} productSlug={productSlug} />;
}
