"use client";

/**
 * DeliveryPlanner — Premium teslimat planlayıcı (ürün detay).
 * ---------------------------------------------------------------------------
 * Akış: Adres seç (Google) -> /api/delivery-check (Delivery Engine V2) ->
 *   İstanbul aynı gün (Maltepe mesafe bandı + slot) | Kargo 1-5 iş günü | kapsam dışı.
 * Karar backend'den (admin verisi); Google sadece konum. Sahte slot YOK.
 * Tasarım: mevcut mor/lilac premium dil (Tailwind v4), soft shadow, mikro animasyon.
 * Additive: sipariş/ödeme mantığına dokunmaz; seçilen slot yukarı taşınır (onSelect).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Zap, Clock, Truck, CalendarDays, Check, Loader2, ChevronDown, PackageCheck, AlertCircle } from "lucide-react";
import AddressAutocomplete, { type AddressResult } from "@/components/delivery/AddressAutocomplete";

// --- Endpoint yanıt tipleri (backend sözleşmesi) ---------------------------
interface Slot {
  id: number;
  label: string;
  start_time: string;
  end_time: string;
  cutoff_time: string | null;
  extra_fee_minor: number;
  min_order_minor: number;
  remaining: number;
}
interface SameDay {
  available: boolean;
  side?: string;
  band?: string;
  est_min_minutes?: number | null;
  est_max_minutes?: number | null;
  cutoff_time?: string | null;
  cutoff_passed_today?: boolean;
  day_closed?: boolean;
  fee_minor?: number;
  min_order_minor?: number;
  distance_km?: number;
  slots?: Slot[];
}
interface CheckResult {
  product: { id: number | null; type: string | null; model: string };
  location: { side: string | null; distance_km: number; in_service_area: boolean; branch: string; city: string | null; district: string | null };
  date: string;
  same_day: SameDay;
  cargo: { available: boolean; est_text?: string; fee_minor?: number };
  message: string;
}

export interface SelectedDelivery {
  date: string;
  mode: "sameday" | "cargo";
  slot?: Slot;
  band?: string;
  address: AddressResult;
}

interface Props {
  product: { id: number; product_type: string; same_day_available: boolean; delivery_scope: string };
  onSelect?: (sel: SelectedDelivery) => void;
}

// --- Tarih yardımcıları -----------------------------------------------------
const fmtDay = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });
const fmtWd = new Intl.DateTimeFormat("tr-TR", { weekday: "long" });
const fmtWdShort = new Intl.DateTimeFormat("tr-TR", { weekday: "short" });

function isoOf(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function labelOf(offset: number): { label: string; sub: string } {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return { label: offset === 0 ? "Bugün" : offset === 1 ? "Yarın" : fmtWd.format(d), sub: fmtDay.format(d) };
}

function feeText(minor?: number): string {
  if (minor == null || minor === 0) return "Ücretsiz";
  return `${(minor / 100).toLocaleString("tr-TR", { minimumFractionDigits: 0 })} ₺`;
}

export default function DeliveryPlanner({ product, onSelect }: Props) {
  const [address, setAddress] = useState<AddressResult | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [slotId, setSlotId] = useState<number | null>(null);
  const reqSeq = useRef(0);

  const days = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ offset: i, ...labelOf(i) })), []);
  const quickDays = days.slice(0, 3);

  const check = useCallback(
    async (addr: AddressResult, offset: number) => {
      if (addr.lat == null || addr.lng == null) return;
      const seq = ++reqSeq.current;
      setLoading(true);
      setSlotId(null);
      try {
        const resp = await fetch("/api/delivery-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: addr.lat,
            lng: addr.lng,
            product_id: product.id,
            product_type: product.product_type,
            city: addr.il ?? undefined,
            district: addr.ilce ?? undefined,
            date: isoOf(offset),
          }),
        });
        const json = await resp.json();
        if (seq === reqSeq.current) setResult(json?.data ?? null);
      } catch {
        if (seq === reqSeq.current) setResult(null);
      } finally {
        if (seq === reqSeq.current) setLoading(false);
      }
    },
    [product.id, product.product_type],
  );

  // Adres seçilince / gün değişince otomatik kontrol
  useEffect(() => {
    if (address) check(address, dayOffset);
  }, [address, dayOffset, check]);

  const onPickSlot = (s: Slot) => {
    setSlotId(s.id);
    if (address) onSelect?.({ date: isoOf(dayOffset), mode: "sameday", slot: s, band: result?.same_day.band, address });
  };

  const sd = result?.same_day;
  const cargo = result?.cargo;

  return (
    <div className="mt-6 rounded-2xl border border-[#EDE9FE] bg-[#FBFAFE] p-4 md:p-5">
      {/* Başlık */}
      <div className="flex items-center gap-2 text-[13px] font-semibold text-[#4B5563]">
        <MapPin className="w-4 h-4 text-[#7C3AED]" />
        Teslimat adresi
        {sd?.available && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-bold text-[#059669]">
            <Zap className="w-3.5 h-3.5" /> Aynı gün uygun
          </span>
        )}
      </div>

      {/* Adres seçici */}
      <div className="mt-3">
        <AddressAutocomplete
          placeholder="Teslimat adresini yazın (mahalle / cadde / AVM)"
          onSelect={(r) => { setAddress(r); setResult(null); }}
        />
      </div>

      {/* Adres seçilmeden önce ipucu */}
      {!address && (
        <p className="mt-3 flex items-start gap-1.5 text-[12px] text-[#9CA3AF] leading-relaxed">
          <Clock className="w-3.5 h-3.5 mt-[1px] shrink-0" />
          Adresinizi seçin; bölgenize uygun teslimat günü ve saatlerini anında gösterelim.
        </p>
      )}

      {address && (
        <>
          {/* Gün seçimi */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {quickDays.map((d) => (
              <button
                key={d.offset}
                onClick={() => setDayOffset(d.offset)}
                className={`rounded-xl px-2 py-2.5 text-center transition-all border ${
                  dayOffset === d.offset
                    ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-[0_2px_10px_rgba(124,58,237,0.25)]"
                    : "bg-white text-[#374151] border-[#EDE9FE] hover:border-[#C4B5FD]"
                }`}
              >
                <div className="text-[13px] font-bold leading-tight">{d.label}</div>
                <div className={`text-[11px] mt-0.5 ${dayOffset === d.offset ? "text-white/80" : "text-[#9CA3AF]"}`}>{d.sub}</div>
              </button>
            ))}
          </div>

          {/* 30 günlük takvim aç/kapa */}
          <button
            onClick={() => setShowCalendar((v) => !v)}
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            {dayOffset > 2 ? `Seçili: ${labelOf(dayOffset).label}, ${labelOf(dayOffset).sub}` : "Takvimden gün seç (30 gün)"}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCalendar ? "rotate-180" : ""}`} />
          </button>

          {showCalendar && (
            <div className="mt-2 rounded-xl border border-[#EDE9FE] bg-white p-2 grid grid-cols-5 gap-1.5">
              {days.map((d) => (
                <button
                  key={d.offset}
                  onClick={() => { setDayOffset(d.offset); setShowCalendar(false); }}
                  className={`rounded-lg py-1.5 text-center transition-all border ${
                    dayOffset === d.offset
                      ? "bg-[#7C3AED] text-white border-[#7C3AED]"
                      : "bg-[#FBFAFE] text-[#374151] border-transparent hover:border-[#C4B5FD]"
                  }`}
                >
                  <div className="text-[10.5px] font-semibold leading-none">{fmtWdShort.format(new Date(Date.now() + d.offset * 86400000))}</div>
                  <div className="text-[12px] font-bold mt-0.5">{new Date(Date.now() + d.offset * 86400000).getDate()}</div>
                </button>
              ))}
            </div>
          )}

          {/* Sonuç alanı */}
          <div className="mt-4">
            {loading ? (
              <div className="flex items-center gap-2 text-[13px] text-[#7C3AED] py-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Uygun teslimat kontrol ediliyor…
              </div>
            ) : !result ? null : sd?.available && sd.slots && sd.slots.length > 0 ? (
              <div>
                {/* Aynı gün — band + süre + ücret */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] mb-2">
                  <span className="inline-flex items-center gap-1 font-bold text-[#059669]"><Zap className="w-3.5 h-3.5" /> Aynı gün teslimat</span>
                  {sd.band && <span className="text-[#6B7280]">{sd.band.replace("İstanbul - ", "")}</span>}
                  {sd.est_min_minutes != null && sd.est_max_minutes != null && (
                    <span className="text-[#6B7280]">· {sd.est_min_minutes}-{sd.est_max_minutes} dk</span>
                  )}
                  <span className="text-[#6B7280]">· Teslimat {feeText(sd.fee_minor)}</span>
                </div>
                {/* Slot ızgarası */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {sd.slots.map((s) => {
                    const disabled = s.remaining <= 0;
                    const activeSlot = slotId === s.id;
                    return (
                      <button
                        key={s.id}
                        disabled={disabled}
                        onClick={() => onPickSlot(s)}
                        className={`relative rounded-xl px-2 py-2.5 text-center transition-all border text-[13px] font-semibold ${
                          disabled
                            ? "bg-[#F3F4F6] text-[#C4C4C4] border-[#EEE] cursor-not-allowed line-through"
                            : activeSlot
                            ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-[0_2px_12px_rgba(124,58,237,0.3)]"
                            : "bg-white text-[#374151] border-[#EDE9FE] hover:border-[#7C3AED] hover:shadow-[0_2px_8px_rgba(124,58,237,0.12)]"
                        }`}
                      >
                        {activeSlot && <Check className="w-3.5 h-3.5 absolute top-1.5 right-1.5" />}
                        {s.label}
                        {!disabled && s.extra_fee_minor > 0 && (
                          <div className={`text-[10px] font-medium mt-0.5 ${activeSlot ? "text-white/80" : "text-[#9CA3AF]"}`}>+{feeText(s.extra_fee_minor)}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {slotId != null && (
                  <p className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium text-[#059669]">
                    <Check className="w-4 h-4" /> Teslimat saatiniz seçildi — sipariş adımında onaylanacak.
                  </p>
                )}
              </div>
            ) : cargo?.available && !sd?.available ? (
              <div className="flex items-start gap-2.5 rounded-xl bg-white border border-[#EDE9FE] p-3">
                <div className="w-9 h-9 rounded-lg bg-[#EDE9FE] flex items-center justify-center shrink-0">
                  <Truck className="w-4.5 h-4.5 text-[#7C3AED]" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[#111827]">Kargo ile teslimat</div>
                  <p className="text-[12px] text-[#6B7280] mt-0.5">{cargo.est_text ?? "1-5 iş günü"} içinde, ücretsiz kargo ile gönderilir.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-3 text-[12.5px] text-[#B91C1C]">
                <AlertCircle className="w-4 h-4 mt-[1px] shrink-0" />
                {result.message}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
