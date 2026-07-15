"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "cicekyolla-cookie-consent-v1";

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  useEffect(() => { setOpen(!window.localStorage.getItem(KEY)); }, []);
  const save = (value: { analytics: boolean; marketing: boolean }) => {
    window.localStorage.setItem(KEY, JSON.stringify({ ...value, savedAt: new Date().toISOString() }));
    window.dispatchEvent(new CustomEvent("cicekyolla:consent", { detail: value }));
    setOpen(false);
  };
  if (!open) return null;
  return <aside aria-label="Çerez tercihleri" className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-4xl rounded-2xl border border-violet-400/30 bg-[#0D0520] p-5 text-white shadow-2xl md:flex md:items-center md:justify-between md:gap-6">
    <div className="max-w-2xl"><strong className="text-base">Çerez tercihleri</strong><p className="mt-1 text-sm leading-6 text-gray-300">Zorunlu çerezler sepet ve güvenlik için kullanılır. Analitik ve pazarlama çerezleri yalnız açık izninizle çalışır. <Link className="text-violet-300 underline" href="/cerez-politikasi">Detaylar</Link></p>{details ? <div className="mt-3 flex flex-wrap gap-4 text-sm"><label><input type="checkbox" checked disabled className="mr-2" />Zorunlu</label><label><input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mr-2" />Analitik</label><label><input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mr-2" />Pazarlama</label></div> : null}</div>
    <div className="mt-4 flex flex-wrap gap-2 md:mt-0 md:justify-end"><button type="button" onClick={() => save({ analytics: false, marketing: false })} className="rounded-full border border-white/20 px-4 py-2 text-sm">Reddet</button><button type="button" onClick={() => setDetails((value) => !value)} className="rounded-full border border-white/20 px-4 py-2 text-sm">Tercihler</button><button type="button" onClick={() => save(details ? { analytics, marketing } : { analytics: true, marketing: true })} className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold">Kabul Et</button></div>
  </aside>;
}
