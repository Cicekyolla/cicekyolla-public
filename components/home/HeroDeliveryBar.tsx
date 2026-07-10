"use client";

/**
 * HeroDeliveryBar — Ana sayfa hero üstü canlı son alım sayaç barı.
 * ---------------------------------------------------------------------------
 * Anadolu + Avrupa yakaları için AYNI GÜN son alım geri sayımı gösterir.
 * TÜM veriler Delivery Engine API'sinden (/api/delivery-check) gelir:
 *   - Yaka temsil koordinatı + side param -> backend bandı/zone'u ve cutoff'u döner.
 *   - Saatler HARDCODED DEĞİL; Admin/API neyi dönerse o gösterilir.
 * Cut-off geçince: "Bugün kapandı — en erken <gün> <slot>" (ileri tarih taranır).
 * Additive: mevcut hero/banner yapısına dokunmaz; page.tsx'te Hero'dan önce render.
 */

import { useEffect, useRef, useState } from "react";
import { Zap, Truck, Clock } from "lucide-react";

type Side = "anadolu" | "avrupa";

// Yaka temsil koordinatları (band/zone çözümü için; side param zaten zorlar).
const REF: Record<Side, { lat: number; lng: number; label: string }> = {
  anadolu: { lat: 40.9224, lng: 29.1309, label: "Anadolu Yakası" }, // Maltepe merkez
  avrupa: { lat: 41.043, lng: 28.987, label: "Avrupa Yakası" }, // Avrupa yakası merkez
};

interface NextSlot { offset: number; label: string; }
interface SideState {
  cutoff: string | null;       // "HH:MM" (API'den)
  availableToday: boolean;
  loading: boolean;
  next: NextSlot | null;       // kapandıysa en erken uygun slot
}

function isoOf(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const wdFmt = new Intl.DateTimeFormat("tr-TR", { weekday: "long" });
function dayLabel(offset: number): string {
  if (offset === 1) return "Yarın";
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return wdFmt.format(d);
}

async function checkSide(side: Side, date: string): Promise<any | null> {
  try {
    const r = REF[side];
    const resp = await fetch("/api/delivery-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: r.lat, lng: r.lng, side, date }),
    });
    const json = await resp.json().catch(() => null);
    return resp.ok ? json?.data ?? null : null;
  } catch {
    return null;
  }
}

/** Yarından itibaren ilk uygun (kalan kapasiteli) slotu bul (≤30 gün). */
async function findNextSlot(side: Side): Promise<NextSlot | null> {
  for (let off = 1; off <= 30; off++) {
    const data = await checkSide(side, isoOf(off));
    const slots: any[] = data?.same_day?.slots ?? [];
    const open = slots.find((s) => s.remaining > 0);
    if (open) return { offset: off, label: open.label };
  }
  return null;
}

function cutoffRemainingMs(cutoff: string, ts: number): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(cutoff);
  if (!m) return 0;
  const d = new Date(ts);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d.getTime() - ts;
}

export default function HeroDeliveryBar() {
  const [state, setState] = useState<Record<Side, SideState>>({
    anadolu: { cutoff: null, availableToday: false, loading: true, next: null },
    avrupa: { cutoff: null, availableToday: false, loading: true, next: null },
  });
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  const passed = useRef<Record<Side, boolean>>({ anadolu: false, avrupa: false });

  // Bir yakayı yükle: bugün uygun mu? değilse en erken slotu bul.
  async function loadSide(side: Side) {
    const data = await checkSide(side, isoOf(0));
    const sd = data?.same_day;
    const cutoff = sd?.cutoff_time ? String(sd.cutoff_time).slice(0, 5) : null;
    const availableToday = !!sd?.available;
    if (availableToday) {
      setState((s) => ({ ...s, [side]: { cutoff, availableToday: true, loading: false, next: null } }));
    } else {
      const next = await findNextSlot(side);
      setState((s) => ({ ...s, [side]: { cutoff, availableToday: false, loading: false, next } }));
    }
  }

  useEffect(() => {
    loadSide("anadolu");
    loadSide("avrupa");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Saniyelik tik (en az bir yaka bugün açıkken).
  useEffect(() => {
    const anyOpen = state.anadolu.availableToday || state.avrupa.availableToday;
    if (!anyOpen) return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.anadolu.availableToday, state.avrupa.availableToday]);

  // Cut-off geçince o yakayı yeniden yükle (bugün kapanır -> en erken slot).
  useEffect(() => {
    (["anadolu", "avrupa"] as Side[]).forEach((side) => {
      const st = state[side];
      if (st.availableToday && st.cutoff && cutoffRemainingMs(st.cutoff, nowTs) <= 0 && !passed.current[side]) {
        passed.current[side] = true;
        loadSide(side);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowTs]);

  function renderSide(side: Side) {
    const st = state[side];
    const ref = REF[side];
    const Icon = side === "anadolu" ? Zap : Truck;

    let content;
    if (st.loading) {
      content = <span className="text-white/70">Teslimat durumu yükleniyor…</span>;
    } else if (st.availableToday && st.cutoff) {
      const rem = cutoffRemainingMs(st.cutoff, nowTs);
      if (rem > 0) {
        const hh = String(Math.floor(rem / 3_600_000)).padStart(2, "0");
        const mm = String(Math.floor((rem % 3_600_000) / 60_000)).padStart(2, "0");
        const ss = String(Math.floor((rem % 60_000) / 1_000)).padStart(2, "0");
        const urgent = rem < 3_600_000;
        content = (
          <>
            <span className="font-semibold">{ref.label}:</span>{" "}
            <span className="text-white/85">Aynı gün için</span>{" "}
            <span className={`tabular-nums font-bold tracking-tight ${urgent ? "text-[#FEE2E2]" : "text-white"}`}>{hh}:{mm}:{ss}</span>{" "}
            <span className="text-white/70">kaldı · Son alım {st.cutoff}</span>
          </>
        );
      } else {
        content = <span className="font-semibold">{ref.label}: Bugün kapandı</span>;
      }
    } else {
      content = (
        <>
          <span className="font-semibold">{ref.label}:</span>{" "}
          <span className="text-white/85">Bugün kapandı</span>
          {st.next ? (
            <span className="text-white/70"> — en erken {dayLabel(st.next.offset)} {st.next.label}</span>
          ) : (
            <span className="text-white/70"> — en erken teslimat için takvimi kullanın</span>
          )}
        </>
      );
    }

    return (
      <div className="flex items-center gap-2 whitespace-normal md:whitespace-nowrap px-4 py-2 text-[12.5px] md:text-[13px] w-full md:w-auto">
        <Icon className="w-4 h-4 shrink-0 text-white/90" />
        <span className="leading-tight">{content}</span>
      </div>
    );
  }

  return (
    <div
      className="w-full text-white"
      style={{ background: "linear-gradient(90deg, #5B21B6 0%, #7C3AED 45%, #6D28D9 100%)" }}
      aria-label="Aynı gün teslimat son alım durumu"
    >
      <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row md:items-stretch divide-y md:divide-y-0 md:divide-x divide-white/15">
        {renderSide("anadolu")}
        {renderSide("avrupa")}
        <div className="hidden lg:flex items-center gap-1.5 px-4 py-2 text-[12px] text-white/70 ml-auto">
          <Clock className="w-3.5 h-3.5" /> Saatler bölgenize göre sipariş adımında güncellenir
        </div>
      </div>
    </div>
  );
}
