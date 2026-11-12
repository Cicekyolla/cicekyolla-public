"use client";

/**
 * ConciergeLauncher — Web AI Satış Danışmanı başlatıcısı (TR + 13 Global dil, kök layout'ta tek kez).
 *
 * BAYRAK: /api/concierge/status 200 dönmedikçe HİÇBİR ŞEY çizilmez (Public CONCIERGE_ENABLED ve API
 * WEB_AI_ENABLED birlikte açık olmalı). Sunucuda ve ilk istemci render'ında null döner → SSR HTML'ine
 * metin / bağlantı girmez (SEO ve hydration etkilenmez).
 *
 * YERLEŞİM: SOL alt. Sağ sütun (WhatsApp, Telegram, yukarı çık) doludur ve o bileşenlere dokunulmaz.
 * Yuva lib/concierge.ts → launcherSlot ile seçilir (TR'de hoş geldin teklifinin, ürün sayfasında mobil
 * "Sipariş Ver" çubuğunun üstü). Fiziksel `left` kullanılır: Arapçada (RTL) sağdaki WhatsApp düğmesiyle
 * çakışmaması için konum dile göre çevrilmez.
 *
 * Pencere koordinasyonu mevcut tek overlay kilidiyle (ConsentManager) yapılır; yeni sistem YOK:
 *   • başka pencere açıkken (adres, üye paneli, çerez tercihleri) başlatıcı gizlenir,
 *   • çerez BANDI açıkken bandın yüksekliği kadar yukarı kayar,
 *   • panel açılınca kilidi alır → diğer yüzen düğmeler gizlenir.
 * Panel kodu ilk tıklamada yüklenir (sayfa başına yalnız bu küçük başlatıcı gelir).
 */

import { lazy, Suspense, useCallback, useEffect, useReducer, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { acquireOverlay, releaseOverlay } from "@/components/consent/ConsentManager";
import { useOverlayBusy } from "@/components/useOverlayBusy";
import { useI18n } from "@/lib/i18n";
import {
  chatReducer, conciergeVisibleOnPath, INITIAL_CHAT, launcherSlot, readStatusCache, STATUS_STORAGE_KEY, writeStatusCache, type LauncherSlot,
} from "@/lib/concierge";

const ConciergePanel = lazy(() => import("./ConciergePanel"));

const OVERLAY_ID = "concierge";
/** Sayfa yüklemesini geciktirmemek için açık/kapalı sorusu bu kadar sonra sorulur. */
const STATUS_DELAY_MS = 1500;

/** Yuva → alt ofset sınıfları (px değerleri lib/concierge.ts → LAUNCHER_SLOT_PX ile aynı; testle kilitli). */
const SLOT_CLASS: Record<LauncherSlot, string> = {
  tr: "bottom-[calc(80px+env(safe-area-inset-bottom))] sm:bottom-[88px]",
  "tr-product": "bottom-[calc(156px+env(safe-area-inset-bottom))] lg:bottom-[88px]",
  global: "bottom-[calc(16px+env(safe-area-inset-bottom))] sm:bottom-6",
  "global-product": "bottom-[calc(92px+env(safe-area-inset-bottom))] lg:bottom-6",
};

function readSession(key: string): string | null {
  try { return window.sessionStorage.getItem(key); } catch { return null; }
}
function writeSession(key: string, value: string) {
  try { window.sessionStorage.setItem(key, value); } catch { /* depolama kapalıysa her sayfada yeniden sorulur */ }
}

export function ConciergeLauncher() {
  const pathname = usePathname();
  const overlay = useOverlayBusy();
  const { locale, dir, t, ready } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  // Sohbet geçmişi BURADA (kök layout'ta, sayfa geçişlerinde yaşayan bileşende) tutulur: panel kapatılıp
  // açıldığında ya da karttan ürün sayfasına gidilip dönüldüğünde yazışma ekranda kalır. Yalnız bellekte
  // durur (depolamaya yazılmaz); sayfa tam yenilenirse ekran sıfırlanır, sunucudaki oturum sürer.
  const [chat, dispatch] = useReducer(chatReducer, INITIAL_CHAT);

  // Açık mı? — sekme oturumunda 10 dk hatırlanır; kapalıysa hiçbir şey çizilmez.
  useEffect(() => {
    const cached = readStatusCache(readSession(STATUS_STORAGE_KEY), Date.now());
    if (cached !== null) { setEnabled(cached); return; }
    let alive = true;
    const timer = setTimeout(async () => {
      let on = false;
      try {
        const res = await fetch("/api/concierge/status", { cache: "no-store" });
        on = res.ok;
      } catch { on = false; }
      writeSession(STATUS_STORAGE_KEY, writeStatusCache(on, Date.now()));
      if (alive) setEnabled(on);
    }, STATUS_DELAY_MS);
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setLocked((had) => { if (had) releaseOverlay(OVERLAY_ID); return false; });
  }, []);

  const visibleHere = conciergeVisibleOnPath(pathname);
  // Sepet / ödeme gibi gizli bir yola geçilirse açık panel kapanır.
  useEffect(() => { if (open && !visibleHere) close(); }, [open, visibleHere, close]);
  // Bileşen kaldırılırsa kilit bırakılır.
  useEffect(() => () => releaseOverlay(OVERLAY_ID), []);

  const turnOff = useCallback(() => {
    writeSession(STATUS_STORAGE_KEY, writeStatusCache(false, Date.now()));
    setEnabled(false);
    close();
  }, [close]);

  if (!enabled || !ready || !visibleHere) return null;

  if (open) {
    return (
      <Suspense fallback={null}>
        <ConciergePanel locale={locale} dir={dir} t={t} pathname={pathname} state={chat} dispatch={dispatch} onClose={close} onOff={turnOff} />
      </Suspense>
    );
  }

  // Başka bir pencere açıkken çizilmez; çerez bandı açıkken bandın üstüne çıkar.
  if (overlay.hidden) return null;

  const openPanel = () => {
    // Kilit alınamazsa (yalnız çerez bandı açıkken olur) panel yine açılır; bandın üstünde durmayı panel kendi ölçer.
    setLocked(acquireOverlay(OVERLAY_ID));
    setOpen(true);
  };

  return (
    <button
      type="button"
      onClick={openPanel}
      aria-label={t("concierge.launcher")}
      aria-haspopup="dialog"
      data-concierge-launcher=""
      style={{ marginBottom: overlay.lift || undefined }}
      className={`fixed left-4 z-50 flex h-12 items-center gap-2 rounded-full bg-primary px-3.5 text-primary-foreground shadow-lg shadow-primary/30 transition-[box-shadow,transform] duration-200 ease-out hover:shadow-xl hover:shadow-primary/40 hover:ring-4 hover:ring-primary/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 active:scale-95 motion-reduce:transition-none sm:left-6 lg:px-4 ${SLOT_CLASS[launcherSlot(pathname)]}`}
    >
      <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
      <span className="hidden text-sm font-semibold whitespace-nowrap lg:inline">{t("concierge.launcher")}</span>
    </button>
  );
}
