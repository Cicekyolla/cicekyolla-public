"use client";

/**
 * FormAlert — üye formlarının TEK hata/başarı şeridi.
 *
 * NEDEN VAR: giriş ekranında hata da başarı da aynı gri `role="status"` metniyle
 * basılıyordu; müşteri neyin yanlış olduğunu görmüyordu. Artık hata KIRMIZI,
 * ikonlu, `role="alert"` (ekran okuyucu anında duyurur) ve forma yakın çizilir.
 *
 * Tasarım ailesi: sepet sayfasındaki uyarı rozetiyle aynı renkler
 * (#FEF2F2 / #FECACA / #B91C1C) — yeni bir renk dili üretilmedi.
 */

import { AlertCircle, CheckCircle2 } from "lucide-react";

export function FormAlert({
  tone,
  message,
  id,
}: {
  tone: "error" | "success";
  message: string;
  /** Girdilerin aria-describedby ile bağlanabilmesi için. */
  id?: string;
}) {
  if (!message) return null;
  const error = tone === "error";
  return (
    <div
      id={id}
      role={error ? "alert" : "status"}
      aria-live={error ? "assertive" : "polite"}
      className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold leading-snug ${
        error
          ? "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
          : "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
      }`}
    >
      {error ? (
        <AlertCircle className="mt-[1px] h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="mt-[1px] h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span>{message}</span>
    </div>
  );
}
