"use client";

/**
 * Yüzen iletişim butonları (WhatsApp + Telegram) için: çerez bildirimi/tercihleri, bildirim izni,
 * teslimat adresi ve üye penceresi açıkken true. Yeni sistem DEĞİL — mevcut tek overlay kilidini
 * (ConsentManager acquireOverlay/onOverlayChange) okur; NewMemberPopup ile aynı kalıp.
 * Pencere açıkken butonlar çizilmez → bandın/pencerenin arkasından yarım görünmez, çakışmaz.
 */
import { useEffect, useState } from "react";
import { onOverlayChange, overlayBusy } from "@/components/consent/ConsentManager";

export function useOverlayBusy(): boolean {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const refresh = () => setBusy(overlayBusy());
    refresh();
    return onOverlayChange(refresh);
  }, []);
  return busy;
}
