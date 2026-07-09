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
import { MapPin, Zap, Clock, Truck, CalendarDays, Check, Loader2, ChevronDown, PackageCheck, AlertCircle, Package } from "lucide-react";
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
  const [errDetail, setErrDetail] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  const [todayClosed, setTodayClosed] = useState(false);
  const [mode, setMode] = useState<"sameday" | "cargo">("sameday");
  const reqSeq = useRef(0);
  const passedRef = useRef(false);

  const days = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ offset: i, ...labelOf(i) })), []);
  const quickDays = days.slice(0, 3);

  const check = useCallback(
    async (addr: AddressResult, offset: number) => {
      const latNum = Number(addr.lat);
      const lngNum = Number(addr.lng);
      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return;
      const seq = ++reqSeq.current;
      setLoading(true);
      setSlotId(null);
      setErrDetail(null);
      try {
        // Boş string'ler backend Zod min(1)'i patlatır (422) -> undefined'a çevir.
        const VALID_TYPES = ["flower", "plant", "wreath", "artificial", "gift", "service"];
        const city = addr.il && addr.il.trim() ? addr.il.trim() : undefined;
        const district = addr.ilce && addr.ilce.trim() ? addr.ilce.trim() : undefined;
        const productType = VALID_TYPES.includes(product.product_type) ? product.product_type : undefined;
        // KRİTİK: pg BIGINT id'yi STRING döndürebilir -> Number()'a zorla (z.number() aksi halde 422).
        const pid = Number(product.id);
        const selectedDate = isoOf(offset);

        const payload: Record<string, unknown> = { lat: latNum, lng: lngNum, date: selectedDate };
        if (Number.isInteger(pid) && pid > 0) payload.product_id = pid;
        if (city) payload.city = city;
        if (district) payload.district = district;
        if (productType) payload.product_type = productType;

        // --- Geçici debug log'ları (görev gereği) ---
        // eslint-disable-next-line no-console
        console.log("[DeliveryPlanner] selectedAddress:", addr);
        // eslint-disable-next-line no-console
        console.log("[DeliveryPlanner] selectedDate:", selectedDate);
        // eslint-disable-next-line no-console
        console.log("[DeliveryPlanner] requestPayload:", payload);

        const resp = await fetch("/api/delivery-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await resp.json().catch(() => null);
        if (seq !== reqSeq.current) return;

        // eslint-disable-next-line no-console
        console.log("[DeliveryPlanner] apiResponse:", resp.status, json);

        if (!resp.ok || !json?.data) {
          const detail =
            json?.details?.fieldErrors
              ? Object.entries(json.details.fieldErrors)
                  .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
                  .join(" · ")
              : json?.error ?? `HTTP ${resp.status}`;
          setErrDetail(`Teslimat kontrolü başarısız (${resp.status}) — ${detail}`);
          setResult(null);
        } else {
          setErrDetail(null);
          setResult(json.data);
          if (offset === 0) {
            const passed = !!json.data?.same_day?.cutoff_passed_today;
            setTodayClosed(passed);
            passedRef.current = passed;
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[DeliveryPlanner] check exception:", e);
        if (seq === reqSeq.current) {
          setErrDetail("Teslimat servisine ulaşılamadı. Lütfen tekrar deneyin.");
          setResult(null);
        }
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

  // Bugün + aynı gün uygun iken kesme saatine kalan süre (ms). Sadece bugün anlamlı.
  const cutoffStr = result?.same_day?.cutoff_time ?? null;
  const sameDayAvail = !!result?.same_day?.available;
  function cutoffRemainingMs(cutoff: string, ts: number): number {
    const m = /^(\d{1,2}):(\d{2})/.exec(cutoff);
    if (!m) return 0;
    const d = new Date(ts);
    d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    return d.getTime() - ts;
  }
  const remainingMs =
    dayOffset === 0 && cutoffStr ? cutoffRemainingMs(cutoffStr, nowTs) : null;

  // Canlı sayaç: sadece bugün + aynı gün uygun + kesme geçmemişken saniyede bir tik.
  useEffect(() => {
    if (dayOffset !== 0 || !sameDayAvail || !cutoffStr || todayClosed) return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [dayOffset, sameDayAvail, cutoffStr, todayClosed]);

  // Kesme saati geçince: aynı gün slotlarını kapat + /api/delivery-check tekrar çağır.
  useEffect(() => {
    if (dayOffset !== 0 || !address || !sameDayAvail || !cutoffStr) return;
    if (cutoffRemainingMs(cutoffStr, nowTs) <= 0 && !passedRef.current) {
      passedRef.current = true;
      setTodayClosed(true);
      check(address, 0); // backend cutoff_passed_today=true döner -> slotlar kapanır
    }
  }, [nowTs, dayOffset, address, sameDayAvail, cutoffStr, check]);

  // Sonuç gelince varsayılan mod: aynı gün uygunsa 'sameday', değilse 'cargo'.
  useEffect(() => {
    if (!result) return;
    if (result.same_day?.available && (result.same_day.slots?.length ?? 0) > 0) setMode("sameday");
    else if (result.cargo?.available) setMode("cargo");
  }, [result]);

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
          onSelect={(r) => { setAddress(r); setResult(null); setTodayClosed(false); passedRef.current = false; setDayOffset(0); }}
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
            {quickDays.map((d) => {
              const isTodayClosed = d.offset === 0 && todayClosed;
              return (
                <button
                  key={d.offset}
                  disabled={isTodayClosed}
                  onClick={() => !isTodayClosed && setDayOffset(d.offset)}
                  className={`rounded-xl px-2 py-2.5 text-center transition-all border ${
                    isTodayClosed
                      ? "bg-[#F3F4F6] text-[#9CA3AF] border-[#EEE] cursor-not-allowed"
                      : dayOffset === d.offset
                      ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-[0_2px_10px_rgba(124,58,237,0.25)]"
                      : "bg-white text-[#374151] border-[#EDE9FE] hover:border-[#C4B5FD]"
                  }`}
                >
                  <div className="text-[13px] font-bold leading-tight">{d.label}</div>
                  <div className={`text-[11px] mt-0.5 ${isTodayClosed ? "text-[#B91C1C] font-semibold" : dayOffset === d.offset ? "text-white/80" : "text-[#9CA3AF]"}`}>
                    {isTodayClosed ? "Kapandı" : d.sub}
                  </div>
                </button>
              );
            })}
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
            ) : errDetail ? (
              <div className="flex items-start gap-2 rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-3 text-[12.5px] text-[#B91C1C]">
                <AlertCircle className="w-4 h-4 mt-[1px] shrink-0" />
                {errDetail}
              </div>
            ) : !result ? null : (() => {
              const showSameday = !!(sd?.available && sd.slots && sd.slots.length > 0);
              const showCargo = !!cargo?.available;
              if (!showSameday && !showCargo) {
                return (
                  <div className="flex items-start gap-2 rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-3 text-[12.5px] text-[#B91C1C]">
                    <AlertCircle className="w-4 h-4 mt-[1px] shrink-0" />
                    {result.message}
                  </div>
                );
              }
              const cargoFree = (cargo?.fee_minor ?? 0) === 0;
              return (
                <div>
                  <style>{`@keyframes cyExpand{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>

                  {/* TESLİMAT SEÇENEĞİ KARTLARI */}
                  <div className="text-[11px] font-bold text-[#9CA3AF] tracking-wider mb-2">TESLİMAT SEÇENEĞİ</div>
                  <div className={`grid gap-2.5 ${showSameday && showCargo ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                    {showSameday && (
                      <button
                        onClick={() => setMode("sameday")}
                        className={`relative text-left rounded-[20px] border p-3.5 min-h-[92px] transition-all ${
                          mode === "sameday"
                            ? "border-[#7C3AED] bg-[#F5F3FF] shadow-[0_6px_20px_rgba(124,58,237,0.18)]"
                            : "border-[#EDE9FE] bg-white hover:border-[#C4B5FD] hover:shadow-[0_4px_16px_rgba(124,58,237,0.1)]"
                        }`}
                      >
                        <span className="absolute top-2.5 right-2.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-[#D1FAE5] text-[#047857]">AYNI GÜN</span>
                        {mode === "sameday" && <Check className="w-4 h-4 text-[#7C3AED] absolute bottom-2.5 right-2.5" />}
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center mb-2">
                          <Truck className="w-[18px] h-[18px] text-white" />
                        </div>
                        <div className="text-[13.5px] font-bold text-[#111827]">Aynı Gün Teslimat</div>
                        <div className="text-[11.5px] text-[#6B7280] mt-0.5">
                          {dayOffset === 0 ? "Bugün teslim" : "Seçili gün teslim"}
                          {sd?.est_min_minutes != null && sd?.est_max_minutes != null ? ` · ${sd.est_min_minutes}-${sd.est_max_minutes} dk` : ""}
                        </div>
                      </button>
                    )}
                    {showCargo && (
                      <button
                        onClick={() => { setMode("cargo"); if (address) onSelect?.({ date: isoOf(dayOffset), mode: "cargo", address }); }}
                        className={`relative text-left rounded-[20px] border p-3.5 min-h-[92px] transition-all ${
                          mode === "cargo"
                            ? "border-[#7C3AED] bg-[#F5F3FF] shadow-[0_6px_20px_rgba(124,58,237,0.18)]"
                            : "border-[#EDE9FE] bg-white hover:border-[#C4B5FD] hover:shadow-[0_4px_16px_rgba(124,58,237,0.1)]"
                        }`}
                      >
                        <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#D1FAE5] text-[#047857] leading-[1.1] text-center">YARIN<br />KARGODA</span>
                        {mode === "cargo" && <Check className="w-4 h-4 text-[#7C3AED] absolute bottom-2.5 right-2.5" />}
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center mb-2">
                          <Package className="w-[18px] h-[18px] text-white" />
                        </div>
                        <div className="text-[13.5px] font-bold text-[#111827]">{cargoFree ? "Ücretsiz Kargo" : "Kargo"}</div>
                        <div className="text-[11.5px] text-[#6B7280] mt-0.5">Türkiye Geneli · {cargo?.est_text ?? "1-5 iş günü"}</div>
                      </button>
                    )}
                  </div>

                  {/* SEÇİLİ KARTA AİT ANİMASYONLU AÇILIR KUTU (~280ms) */}
                  <div key={mode} className="mt-3" style={{ animation: "cyExpand .28s ease-out" }}>
                    {mode === "sameday" && showSameday ? (
                      <div>
                        {/* band + süre + ücret + son alım */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] mb-2">
                          <span className="inline-flex items-center gap-1 font-bold text-[#059669]"><Zap className="w-3.5 h-3.5" /> Aynı gün teslimat</span>
                          {sd!.band && <span className="text-[#6B7280]">{sd!.band.replace("İstanbul - ", "")}</span>}
                          {sd!.est_min_minutes != null && sd!.est_max_minutes != null && (
                            <span className="text-[#6B7280]">· {sd!.est_min_minutes}-{sd!.est_max_minutes} dk</span>
                          )}
                          <span className="text-[#6B7280]">· Teslimat {feeText(sd!.fee_minor)}</span>
                          {sd!.cutoff_time && <span className="text-[#6B7280]">· Son alım {String(sd!.cutoff_time).slice(0, 5)}</span>}
                        </div>

                        {/* Cut-off canlı geri sayım (sadece BUGÜN; kesme saati API'den) */}
                        {dayOffset === 0 && remainingMs != null && remainingMs > 0 && (() => {
                          const urgent = remainingMs < 3_600_000;
                          const hh = String(Math.floor(remainingMs / 3_600_000)).padStart(2, "0");
                          const mm = String(Math.floor((remainingMs % 3_600_000) / 60_000)).padStart(2, "0");
                          const ss = String(Math.floor((remainingMs % 60_000) / 1_000)).padStart(2, "0");
                          return (
                            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-2.5 text-[12.5px] font-semibold border ${urgent ? "bg-[#FEF2F2] border-[#FCA5A5] text-[#B91C1C] animate-pulse" : "bg-[#F5F3FF] border-[#DDD6FE] text-[#6D28D9]"}`}>
                              <Clock className="w-4 h-4 shrink-0" />
                              <span>Bugün teslimat için kalan süre:</span>
                              <span className="ml-auto tabular-nums font-bold tracking-tight text-[14px]">{hh}:{mm}:{ss}</span>
                            </div>
                          );
                        })()}

                        {/* Slot ızgarası */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {sd!.slots!.map((s) => {
                            const disabled = s.remaining <= 0;
                            const activeSlot = slotId === s.id;
                            return (
                              <button
                                key={s.id}
                                disabled={disabled}
                                onClick={() => onPickSlot(s)}
                                className={`relative rounded-xl px-2 py-2.5 text-center transition-all border text-[13px] font-semibold ${disabled ? "bg-[#F3F4F6] text-[#C4C4C4] border-[#EEE] cursor-not-allowed line-through" : activeSlot ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-[0_2px_12px_rgba(124,58,237,0.3)]" : "bg-white text-[#374151] border-[#EDE9FE] hover:border-[#7C3AED] hover:shadow-[0_2px_8px_rgba(124,58,237,0.12)]"}`}
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
                    ) : mode === "cargo" && showCargo ? (
                      <div className="rounded-[18px] border border-[#DDD6FE] bg-gradient-to-b from-[#F5F3FF] to-white p-4 shadow-[0_4px_18px_rgba(124,58,237,0.1)]">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-[#EDE9FE] flex items-center justify-center"><Package className="w-4 h-4 text-[#7C3AED]" /></div>
                          <div className="text-[13px] font-extrabold tracking-wide text-[#6D28D9]">{cargoFree ? "ÜCRETSİZ KARGO" : "KARGO"}</div>
                        </div>
                        <ul className="space-y-1.5 text-[12.5px] text-[#374151]">
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#059669] shrink-0" /> Siparişiniz siparişe özel hazırlanır.</li>
                          <li className="flex items-center gap-2"><Truck className="w-4 h-4 text-[#7C3AED] shrink-0" /> Yarın kargoya teslim edilir.</li>
                        </ul>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="rounded-xl bg-white border border-[#EDE9FE] p-2.5">
                            <div className="text-[10.5px] text-[#9CA3AF] font-semibold">Tahmini teslimat</div>
                            <div className="text-[13px] font-bold text-[#111827] mt-0.5">{cargo!.est_text ?? "1-5 iş günü"}</div>
                          </div>
                          <div className="rounded-xl bg-white border border-[#EDE9FE] p-2.5">
                            <div className="text-[10.5px] text-[#9CA3AF] font-semibold">Kargo ücreti</div>
                            <div className="text-[13px] font-bold text-[#7C3AED] mt-0.5">{cargoFree ? "Ücretsiz" : feeText(cargo!.fee_minor)}</div>
                          </div>
                        </div>
                        <p className="text-[11px] text-[#9CA3AF] mt-2.5">Tahmini teslimat süreleri bulunduğunuz ile göre değişebilir.</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
