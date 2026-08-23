"use client";

/**
 * DeliveryAddressPopup — "Çiçeğinizi nereye gönderelim?"
 * ---------------------------------------------------------------------------
 * Mevcut adres/teslimat zincirinin YENİ GİRİŞ YÜZÜ — yeni motor/adres sistemi DEĞİL.
 *   Popup → AddressAutocomplete (mevcut Google Maps) → /api/delivery-check (mevcut motor)
 *        → savePendingAddress (ortak sessionStorage kaydı: PDP/sepet/checkout aynı kaydı okur)
 * Karar: YALNIZ Google place koordinatı (yazılan metin değil) → İstanbul kapsamı (in_service_area).
 * Ürün yetkisi burada verilmez; Admin Kargo Merkezi kararı PDP'de (DeliveryPlanner) uygulanır.
 * Popup'ta gün/saat/slot YOK: yalnız "Saatli Teslimat" | "Kargo ile Teslimat".
 * Gösterim: adres yoksa + bu oturumda kapatılmadıysa + çerez kararı sonrası + overlay kilidi boşken.
 * Erişilebilirlik: Radix Dialog (focus trap, Escape, aria) — mevcut sheet.tsx ile aynı primitive.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { MapPin, Clock, Package, X, Loader2, Check } from "lucide-react";
import AddressAutocomplete, { type AddressResult } from "@/components/delivery/AddressAutocomplete";
import { readPendingDelivery, hasPendingAddress, savePendingAddress, markDeliveryPopupDismissed } from "@/lib/pendingDelivery";
import { acquireOverlay, releaseOverlay, onOverlayFree, isMarketingBlockedPath } from "@/components/consent/ConsentManager";
import { cookieDecided } from "@/components/consent/NewMemberPopup";
import { useT } from "@/lib/i18n";

const OVERLAY_ID = "address";
const SHOW_DELAY_MS = 1200;
/** Popup'ın hiç açılmayacağı ek yollar (pazarlama-engelli yollara ek). */
const EXTRA_BLOCKED = ["/adres-kontrol", "/hesap", "/giris"];

type Geo = "istanbul" | "cargo";

function slugifyTr(s: string): string {
  const map: Record<string, string> = { "ç": "c", "ğ": "g", "ı": "i", "İ": "i", "ö": "o", "ş": "s", "ü": "u", "Ç": "c", "Ğ": "g", "Ö": "o", "Ş": "s", "Ü": "u" };
  return s.split("").map((c) => map[c] ?? c).join("").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function shouldSkipPath(): boolean {
  if (isMarketingBlockedPath()) return true;
  const p = window.location.pathname;
  return EXTRA_BLOCKED.some((b) => p.startsWith(b));
}

export function DeliveryAddressPopup() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [addr, setAddr] = useState<AddressResult | null>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const triggered = useRef(false);
  const seq = useRef(0);

  // --- Ne zaman gösterilir ---------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let unsub: (() => void) | null = null;

    const eligible = () => {
      if (shouldSkipPath()) return false;
      const p = readPendingDelivery();
      if (p?.popupDismissed) return false;
      if (hasPendingAddress(p)) return false; // geçerli adres zaten var → tekrar sorma
      return true;
    };

    const tryShow = () => {
      if (triggered.current) return;
      if (!eligible()) return;
      if (!cookieDecided()) { retry = setTimeout(tryShow, 3000); return; } // sıra: önce çerez kararı
      if (!acquireOverlay(OVERLAY_ID)) {
        if (!unsub) unsub = onOverlayFree(() => tryShow());
        return;
      }
      triggered.current = true;
      setOpen(true);
    };

    if (!eligible()) return;
    timer = setTimeout(tryShow, SHOW_DELAY_MS);
    return () => {
      if (timer) clearTimeout(timer);
      if (retry) clearTimeout(retry);
      if (unsub) unsub();
    };
  }, []);

  const close = useCallback((dismissed: boolean) => {
    setOpen(false);
    if (dismissed) markDeliveryPopupDismissed();
    releaseOverlay(OVERLAY_ID);
  }, []);

  // --- Adres seçimi → ortak kayda yaz + coğrafya kontrolü (mevcut motor) -----
  const onSelect = useCallback(async (r: AddressResult) => {
    setAddr(r);
    setGeo(null);
    setErr(null);
    const lat = Number(r.lat);
    const lng = Number(r.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setErr(t("popup.errNoCoords"));
      return;
    }
    savePendingAddress(r); // ADRES BİR KERE SEÇİLİR: PDP/sepet/checkout bu kaydı okur
    const my = ++seq.current;
    setChecking(true);
    try {
      const payload: Record<string, unknown> = { lat, lng };
      if (r.il?.trim()) payload.city = r.il.trim();
      if (r.ilce?.trim()) payload.district = r.ilce.trim();
      const resp = await fetch("/api/delivery-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await resp.json().catch(() => null);
      if (my !== seq.current) return;
      if (!resp.ok || !json?.data?.location) {
        setErr(t("popup.errVerify"));
        return;
      }
      setGeo(json.data.location.in_service_area ? "istanbul" : "cargo");
    } catch {
      if (my === seq.current) setErr(t("popup.errNetwork"));
    } finally {
      if (my === seq.current) setChecking(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const cityName = addr?.il?.trim() || "";
  const cargoHref = cityName
    ? `/teslimat/${slugifyTr(cityName)}?il=${encodeURIComponent(cityName)}`
    : "/kategori/turkiye-geneli-kargo";
  const addrLine = [addr?.mahalle, addr?.ilce, addr?.il].filter(Boolean).join(" · ");

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) close(true); }}>
      <Dialog.Portal>
        {/* Hafif overlay: site arkada hissedilir, simsiyah değil; çok hafif blur */}
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-[#1A1226]/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          aria-describedby="cy-addr-desc"
          className="fixed z-[91] left-1/2 -translate-x-1/2 bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 w-full sm:w-[min(92vw,560px)] min-h-[78dvh] sm:min-h-0 max-h-[92dvh] overflow-y-auto overflow-x-hidden rounded-t-[24px] sm:rounded-[24px] bg-white/95 backdrop-blur-md border border-[#EDE9FE] shadow-[0_24px_80px_rgba(26,18,38,0.16)] p-5 sm:p-8 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          <Dialog.Close
            aria-label={t("common.close")}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-[#8A7FA0] hover:bg-[#F6F2FC] hover:text-[#7C3AED] transition-colors"
          >
            <X className="w-5 h-5" />
          </Dialog.Close>

          <div className="flex items-center gap-2.5 pr-10">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F6F2FC]">
              <MapPin className="w-5 h-5 text-[#7C3AED]" />
            </span>
            <Dialog.Title className="text-[21px] sm:text-[24px] font-extrabold tracking-tight text-[#1A1226] leading-tight">
              {t("popup.title")}
            </Dialog.Title>
          </div>
          <Dialog.Description id="cy-addr-desc" className="mt-2.5 text-[14px] sm:text-[15px] leading-relaxed text-[#6B6480]">
            {t("popup.subtitle")}
          </Dialog.Description>

          <div className="mt-5">
            <label className="block text-[12.5px] font-bold tracking-wide text-[#4B5563] mb-2">{t("popup.searchLabel")}</label>
            <AddressAutocomplete placeholder={t("popup.searchPlaceholder")} onSelect={onSelect} hideSelected />
          </div>

          {/* Seçim sonrası: doğrulanmış il/ilçe + teslimat türü (gün/saat YOK) */}
          {addr && (
            <div className="mt-4 rounded-2xl border border-[#EDE9FE] bg-[#FBFAFE] p-4">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 mt-[2px] text-[#059669] shrink-0" />
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-[#1A1226] truncate">{addrLine || addr.formattedAddress}</div>
                  {addrLine && <div className="text-[12px] text-[#8A7FA0] truncate">{addr.formattedAddress}</div>}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[13.5px] font-bold">
                {checking ? (
                  <span className="inline-flex items-center gap-2 text-[#7C3AED]"><Loader2 className="w-4 h-4 animate-spin" /> {t("popup.checking")}</span>
                ) : geo === "istanbul" ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#ECFDF5] text-[#047857] px-3 py-1.5"><Clock className="w-4 h-4" /> {t("popup.timed")}</span>
                ) : geo === "cargo" ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#F6F2FC] text-[#6D28D9] px-3 py-1.5"><Package className="w-4 h-4" /> {t("popup.cargo")}</span>
                ) : err ? (
                  <span className="text-[12.5px] font-medium text-[#B45309]">{err}</span>
                ) : null}
              </div>
            </div>
          )}
          {!addr && err && <p className="mt-3 text-[12.5px] text-[#B45309]">{err}</p>}

          <div className="mt-5 flex flex-col gap-2.5">
            {addr && geo === "cargo" && (
              <Link
                href={cargoHref}
                onClick={() => close(false)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#7C3AED] px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(124,58,237,0.28)] hover:bg-[#6D28D9] transition-colors"
              >
                <Package className="w-4 h-4" /> {cityName ? t("popup.seeCity", { city: cityName }) : t("popup.seeCargo")}
              </Link>
            )}
            <button
              type="button"
              onClick={() => close(!addr)}
              className={`inline-flex items-center justify-center rounded-2xl px-5 py-3.5 text-[15px] font-bold transition-colors ${
                addr && geo !== "cargo"
                  ? "bg-[#7C3AED] text-white shadow-[0_8px_24px_rgba(124,58,237,0.28)] hover:bg-[#6D28D9]"
                  : "border border-[#E9E4F0] bg-white text-[#4B5563] hover:border-[#C4B5FD] hover:text-[#7C3AED]"
              }`}
            >
              {addr ? t("popup.continue") : t("popup.notNow")}
            </button>
          </div>
          <p className="mt-3 text-center text-[11.5px] text-[#9CA3AF]">{t("popup.hint")}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
