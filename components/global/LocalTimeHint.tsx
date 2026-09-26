"use client";
// RELEASE 3 — kesme saati şeridi: İstanbul saatini (GMT+3) ziyaretçinin kendi saat dilimine çevirir.
// Sunucuda hiçbir şey basmaz (hidrasyon güvenli); istemcide Intl ile hesaplar. Sayı formatı Latin.
import { useEffect, useState } from "react";

function istanbulTodayAt(hhmm: string): Date | null {
  const m = /^(\d{2}):(\d{2})/.exec(hhmm);
  if (!m) return null;
  // İstanbul'un bugünkü tarihi (yıl-ay-gün) → o saatte UTC+3 (Türkiye DST uygulamıyor).
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value, mo = parts.find((p) => p.type === "month")?.value, d = parts.find((p) => p.type === "day")?.value;
  if (!y || !mo || !d) return null;
  return new Date(`${y}-${mo}-${d}T${m[1]}:${m[2]}:00+03:00`);
}

export function LocalTimeHint({ istanbulTime, className }: { istanbulTime: string; className?: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz || tz === "Europe/Istanbul") return;
      const at = istanbulTodayAt(istanbulTime);
      if (!at) return;
      const local = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZone: tz, hour12: false }).format(at);
      const short = new Intl.DateTimeFormat(undefined, { timeZoneName: "short", timeZone: tz }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? tz;
      setText(`= ${local} ${short}`);
    } catch { /* Intl yoksa sessiz */ }
  }, [istanbulTime]);
  if (!text) return null;
  return <span className={className} dir="ltr">{text}</span>;
}
