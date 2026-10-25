// ============================================================================
// lib/revalidateAuth.ts — Yayın sonrası anında güncelleme (Tema & Sezon Adım 5, 25 Eki 2026).
// ----------------------------------------------------------------------------
// API, ana sayfa "Yayına Al" ve banner değişikliğinden sonra public
// POST /api/revalidate'i ortak gizli anahtarla (REVALIDATE_SECRET, iki tarafta aynı env)
// çağırır. Anahtar yoksa uç kapalıdır → site eskisi gibi ISR (60 sn) ile güncellenir.
// Saf fonksiyon: sabit zamanlı karşılaştırma, kısa anahtar kabul edilmez.
// ============================================================================
import { timingSafeEqual } from "node:crypto";

export const REVALIDATE_HEADER = "x-revalidate-secret";
export const MIN_SECRET_LENGTH = 32;

export type RevalidateAuth = "ok" | "not_configured" | "unauthorized";

export function checkRevalidateSecret(provided: string | null | undefined, configured: string | null | undefined): RevalidateAuth {
  const secret = (configured ?? "").trim();
  if (secret.length < MIN_SECRET_LENGTH) return "not_configured";
  const got = (provided ?? "").trim();
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return "unauthorized";
  return timingSafeEqual(a, b) ? "ok" : "unauthorized";
}
