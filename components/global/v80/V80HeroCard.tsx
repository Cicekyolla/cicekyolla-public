"use client";
// ============================================================================
// GLOBAL VERSION 80 — hero "Vesile · Ne göndermek istersin · Nereye" kartı.
// Her kontrol GERÇEK bir motora bağlıdır:
//   • Vesile / kategori seçimi → vitrin filtresi (gerçek kategori üyeliği)
//   • Nereye → mevcut Teslimat Adresi popup'ı (pendingDelivery tek kaydı);
//     seçilen adres PDP planlayıcısı ve checkout tarafından AYNEN okunur.
//   • Durum satırı → gerçek Delivery Engine (/api/delivery-check) — yalnız
//     adres (lat/lng) varsa sorulur; saat/dakika vaadi kodda YAZILI DEĞİLDİR.
// Tarih alanı bilinçli olarak yoktur: tarih ve saat dilimi ürün sayfasındaki
// planlayıcıda (slot kapasitesi + kesim saatiyle) seçilir.
// ============================================================================
import { useEffect, useState } from "react";
import { openDeliveryAddressPopup, readRememberedAddress, PENDING_ADDRESS_EVENT, type PendingDelivery } from "@/lib/pendingDelivery";
import { useV80Filter } from "./V80FilterContext";
import type { V80DiscoveryView, V80Category } from "@/lib/global/v80/view";

const label = { fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--v80-ink-subtle)", marginBottom: 8, display: "block" };

function shortAddress(p: PendingDelivery): string {
  const parts = [p.district?.trim(), p.city?.trim()].filter(Boolean) as string[];
  if (parts.length) return parts.join(", ");
  return (p.placeName ?? p.neighborhood ?? p.address ?? "").trim();
}

export function V80HeroCard({ t, occasionGroup, categories }: { t: Record<string, string>; occasionGroup: V80DiscoveryView | null; categories: V80Category[] }) {
  const f = useV80Filter();
  const [addr, setAddr] = useState<PendingDelivery | null>(null);
  const [status, setStatus] = useState<"open" | "closed" | null>(null);

  useEffect(() => {
    const refresh = () => setAddr(readRememberedAddress());
    refresh();
    window.addEventListener(PENDING_ADDRESS_EVENT, refresh);
    return () => window.removeEventListener(PENDING_ADDRESS_EVENT, refresh);
  }, []);

  // Gerçek uygunluk: adresin koordinatı varsa Delivery Engine'e sor.
  useEffect(() => {
    if (!addr || typeof addr.lat !== "number" || typeof addr.lng !== "number") { setStatus(null); return; }
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/delivery-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat: addr.lat, lng: addr.lng, city: addr.city, district: addr.district }) });
        const j = (await r.json()) as { data?: { location?: { in_service_area?: boolean }; same_day?: { available?: boolean } } };
        if (!alive) return;
        if (!r.ok || !j.data?.location?.in_service_area) { setStatus(null); return; }
        setStatus(j.data.same_day?.available ? "open" : "closed");
      } catch {
        if (alive) setStatus(null);
      }
    })();
    return () => { alive = false; };
  }, [addr]);

  const occasions = (occasionGroup?.chips ?? []).filter((c) => c.filter?.kind === "category");
  const occasionValue = occasions.find((c) => c.filter?.kind === "category" && c.filter.slug === f.category && f.intent === c.label)?.key ?? "";
  const categoryValue = !occasionValue && f.category ? f.category : "";
  const cargoContext = f.destination && f.destination !== "istanbul";
  const note = cargoContext ? t["hero.cargo"] : t["hero.sameDay"];

  return (
    <>
      <div className="v80-hero-status-line" aria-live="polite">
        {status === "open" ? (
          <>
            <span className="v80-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--v80-delivery)", flexShrink: 0, display: "inline-block" }} />
            <p style={{ fontSize: "0.8125rem", color: "var(--v80-ink)", letterSpacing: "0.02em", fontWeight: 500 }}>{t["hero.statusOpen"]}</p>
          </>
        ) : status === "closed" ? (
          <>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }} aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="#B45309" strokeWidth="1.5" /><path d="M12 7v5l3 3" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" /></svg>
            <p style={{ fontSize: "0.8125rem", color: "#B45309", letterSpacing: "0.02em", fontWeight: 500 }}>{t["hero.statusClosed"]}</p>
          </>
        ) : null}
      </div>
      <div style={{ background: "var(--v80-bg)", borderRadius: "var(--v80-radius-md)", border: "1px solid #EFE9F3", boxShadow: "0 4px 20px rgba(42,33,48,0.07)", marginBottom: 8 }}>
        <div className="v80-intent-grid">
          <div>
            <label htmlFor="v80-hero-occasion" style={label}>{t["hero.occasion"]}</label>
            <select id="v80-hero-occasion" className="v80-select" value={occasionValue} disabled={occasions.length === 0}
              onChange={(e) => {
                const chip = occasions.find((c) => c.key === e.target.value);
                if (chip && chip.filter?.kind === "category") f.setCategory(chip.filter.slug, chip.filter.label, chip.label);
                else if (!e.target.value && occasionValue) f.setCategory(null);
              }}>
              <option value="">{t["hero.occasionAny"]}</option>
              {occasions.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="v80-hero-category" style={label}>{t["discovery.groups.what"]}</label>
            <select id="v80-hero-category" className="v80-select" value={categoryValue}
              onChange={(e) => {
                const c = categories.find((x) => x.slug === e.target.value);
                if (c) f.setCategory(c.slug, c.name, null);
                else f.setCategory(null);
              }}>
              <option value="">{t["shop.tabAll"]}</option>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <span style={label}>{t["hero.where"]}</span>
            <button type="button" onClick={() => openDeliveryAddressPopup()}
              style={{ background: "none", border: "none", width: "100%", minWidth: 0, textAlign: "start", padding: "8px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: "0.8125rem", color: addr ? "var(--v80-ink)" : "var(--v80-ink-subtle)", cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{addr ? shortAddress(addr) : t["hero.whereEmpty"]}</span>
              <span style={{ fontSize: "0.6875rem", color: "var(--v80-primary-strong)", fontWeight: 600, flexShrink: 0 }}>{addr ? t["hero.whereChange"] : "›"}</span>
            </button>
          </div>
        </div>
        <div style={{ padding: "10px 20px 14px", borderTop: "1px solid #EFE9F3", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <p style={{ fontSize: "0.6875rem", color: cargoContext ? "var(--v80-ink-subtle)" : "var(--v80-delivery)", letterSpacing: "0.04em" }}>{note}</p>
          {f.active ? (
            <button type="button" onClick={f.clear} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "0.6875rem", color: "var(--v80-ink-subtle)", textDecoration: "underline", padding: 0 }}>{t["discovery.clear"]}</button>
          ) : null}
        </div>
      </div>
    </>
  );
}
