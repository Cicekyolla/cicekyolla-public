"use client";

// ---------------------------------------------------------------------------
// CHECKOUT PROGRESS — TEK ANLATI, TEK KAYNAK.
// ---------------------------------------------------------------------------
// Önce üç ayrı çubuk vardı ve üçü de "Teslimat"ı FARKLI sıraya koyuyordu:
//   /sepet          → Sepet · Ek Ürünler · Alıcı · Teslimat · Onay   (5)
//   AccountGate     → Teslimat · Hesap · Alıcı · Kart Mesajı · Onay  (5)
//   CheckoutWizard  → Ürün · Teslimat · Alıcı · Kart · Gönderen · Onay (6–7)
// Müşteri aynı siparişte üç farklı vaat görüyordu. Artık tek dört fazlı anlatı:
//
//   TESLİMAT → BİLGİLER → ÖDEME → TAMAMLANDI
//
// Teslimat ürün sayfasında seçilir (tek kapı), bu yüzden checkout'a girildiğinde
// 1. faz zaten tamamlanmıştır. Görsel dil Figma V85 CheckoutProgress ile birebir:
// aynı gradient, gölge, node ölçüsü ve bağlayıcı.
// ---------------------------------------------------------------------------

import { Check } from "lucide-react";

export const CHECKOUT_PHASES = ["Teslimat", "Bilgiler", "Ödeme", "Tamamlandı"] as const;

/** 1 = Teslimat, 2 = Bilgiler, 3 = Ödeme, 4 = Tamamlandı */
export function CheckoutProgress({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <nav aria-label="Sipariş adımları" className="w-full">
      {/* Mobil: kompakt "2 / 4 · Bilgiler" — dört node mobilde okunmuyordu. */}
      <p className="sm:hidden text-center text-[12px] font-semibold text-[#7C3AED]">
        {current} / {CHECKOUT_PHASES.length} · {CHECKOUT_PHASES[current - 1]}
      </p>

      <ol className="hidden sm:flex items-center justify-center">
        {CHECKOUT_PHASES.map((label, idx) => {
          const step = idx + 1;
          const done = step < current;
          const active = step === current;
          const lit = done || active;
          return (
            <li key={label} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  aria-current={active ? "step" : undefined}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={
                    lit
                      ? {
                          background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)",
                          color: "#FFFFFF",
                          boxShadow: active
                            ? "0 4px 16px rgba(139,92,246,0.45)"
                            : "0 4px 12px rgba(139,92,246,0.35)",
                        }
                      : { background: "#F3F4F6", color: "#9CA3AF" }
                  }
                >
                  {done ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : step}
                </span>
                <span
                  className="text-[10px] font-semibold tracking-wide whitespace-nowrap"
                  style={{ color: lit ? "#8B5CF6" : "#9CA3AF" }}
                >
                  {label}
                </span>
              </div>
              {step < CHECKOUT_PHASES.length && (
                <span
                  aria-hidden="true"
                  className="w-14 lg:w-20 h-0.5 mx-2 mb-5 rounded-full transition-all duration-500"
                  style={{ background: done ? "linear-gradient(90deg, #8B5CF6, #A855F7)" : "#E5E7EB" }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default CheckoutProgress;
