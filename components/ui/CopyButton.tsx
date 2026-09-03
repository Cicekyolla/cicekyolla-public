"use client";

/**
 * CopyButton — bir değeri panoya kopyalar ve kısa geri bildirim gösterir.
 *
 * NEDEN VAR: Havale/EFT ekranında müşteri IBAN'ı ve hesap sahibini elle seçip
 * kopyalamak zorundaydı (telefonda özellikle zahmetli). Bu düğme SADECE kullanım
 * kolaylığıdır — IBAN değeri, banka hesapları, ödeme akışı ve API DEĞİŞMEZ.
 *
 * Dayanıklılık: `navigator.clipboard` güvenli olmayan bağlamda veya izin
 * reddinde çalışmaz → gizli <textarea> + execCommand('copy') yedeği denenir.
 * İkisi de olmazsa kullanıcıya dürüstçe "Kopyalanamadı" denir (sessiz başarısızlık YOK).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";

type State = "idle" | "copied" | "failed";

/** Async pano API'si bazı ortamlarda izin isteminde ASILI kalabilir; o zaman
 *  kullanıcı hiçbir geri bildirim görmez. Bu yüzden süre sınırı konur. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | "timeout"> {
  return Promise.race([promise, new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), ms))]);
}

export async function copyToClipboard(value: string): Promise<boolean> {
  const text = String(value ?? "");
  if (!text) return false;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      const result = await withTimeout(navigator.clipboard.writeText(text), 1200);
      if (result !== "timeout") return true;
    }
  } catch {
    /* izin reddi / güvensiz bağlam → yedeğe düş */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({
  value,
  label,
  copyText,
  copiedText,
  failedText,
}: {
  /** Panoya gidecek GERÇEK değer (ekranda biçimli gösterilse bile). */
  value: string;
  /** Erişilebilirlik etiketi — "IBAN'ı kopyala" gibi. */
  label: string;
  copyText: string;
  copiedText: string;
  failedText: string;
}) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onClick = useCallback(async () => {
    const ok = await copyToClipboard(value);
    setState(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), ok ? 2000 : 3500);
  }, [value]);

  const copied = state === "copied";
  const failed = state === "failed";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[11.5px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6] ${
        copied
          ? "bg-[#ECFDF5] text-[#047857]"
          : failed
            ? "bg-[#FEF3C7] text-[#B45309]"
            : "text-[#7C3AED] hover:bg-[#F5F3FF] active:scale-[0.97]"
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : failed ? <X className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {/* Tek metin düğümü: hem görünür etiket hem canlı bölge → ekran okuyucu
          "Kopyalandı"yı bir kez duyurur (çift duyuru yok). */}
      <span aria-live="polite">{copied ? copiedText : failed ? failedText : copyText}</span>
    </button>
  );
}
