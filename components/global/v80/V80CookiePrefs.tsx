"use client";
// GLOBAL VERSION 80 — footer "Çerez tercihleri": mevcut ConsentManager panelini açar.
// Panel hazır değilse düğme HİÇ basılmaz (sahte düğme yok; TR legal sayfasına düşülmez).
import { useEffect, useState } from "react";
import { openCookiePreferences, canOpenCookiePreferences } from "@/components/consent/ConsentManager";

export function V80CookiePrefs({ label }: { label: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // ConsentManager ağaçta footer'dan SONRA bağlanır; kısa bir yeniden kontrol yeterli.
    const check = () => setReady(canOpenCookiePreferences());
    check();
    const id = window.setTimeout(check, 600);
    return () => window.clearTimeout(id);
  }, []);
  if (!ready || !label) return null;
  return (
    <button type="button" className="v80-footer-cookie" onClick={() => openCookiePreferences()}>
      {label}
    </button>
  );
}
