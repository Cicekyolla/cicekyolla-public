"use client";
import { useEffect, useState } from "react";
import { readRememberedAddress, openDeliveryAddressPopup, PENDING_ADDRESS_EVENT, type PendingDelivery } from "@/lib/pendingDelivery";

/** "Seçili konum" — mevcut hatırlanan adres (pendingDelivery tek kaydı); yoksa popup'ı açan düğme. */
export function V80SelectedLocation({ t }: { t: Record<string, string> }) {
  const [addr, setAddr] = useState<PendingDelivery | null>(null);
  useEffect(() => {
    const refresh = () => setAddr(readRememberedAddress());
    refresh();
    window.addEventListener(PENDING_ADDRESS_EVENT, refresh);
    return () => window.removeEventListener(PENDING_ADDRESS_EVENT, refresh);
  }, []);
  const label = addr ? [addr.district?.trim(), addr.city?.trim()].filter(Boolean).join(", ") || (addr.address ?? "").trim() : "";
  return (
    <div style={{ textAlign: "end", paddingBottom: 3 }}>
      <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--v80-ink-subtle)", marginBottom: 5 }}>{t["delivery.selected"]}</p>
      <button type="button" onClick={() => openDeliveryAddressPopup()} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: "0.9375rem", fontWeight: 500, color: addr ? "var(--v80-ink)" : "var(--v80-ink-subtle)", letterSpacing: "-0.01em", textDecoration: addr ? "none" : "underline", textUnderlineOffset: 3 }}>
        {addr ? label : t["delivery.noSelection"]}
      </button>
    </div>
  );
}
