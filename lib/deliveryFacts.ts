// lib/deliveryFacts.ts — TESLİMAT BİLGİ NOTU (14 Kas 2026, ADDITIVE).
// İlk sürüm saati mahalle konumlarıyla ödeme motorundan aralık olarak okuyordu; aynı gün işletme sahibinin
// yaka kuralı (lib/istanbulYakaKurali.ts) esas alındı. Burada yalnız motorun ilçe kararı okunur: kural,
// motor ilçeyi standart kurye kapsamında saymıyorsa ya da daha erken kapatıyorsa GÖSTERİLMEZ.
// Motor okunamazsa null → not basılmaz (sayfa bugünkü hâlinde kalır).
import type { MotorIlceKarari } from "./istanbulYakaKurali.ts";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.skyversal.xyz";

const TTL_MS = 10 * 60 * 1000;
const memo = new Map<string, { at: number; v: MotorIlceKarari }>();

/** İstanbul ilçesi için motor kararı (reach + son sipariş saati). Okunamazsa null. Süreç içi 10 dk önbellek. */
export async function fetchMotorIlceKarari(districtSlug: string): Promise<MotorIlceKarari | null> {
  const hit = memo.get(districtSlug);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.v;
  try {
    const resp = await fetch(`${API_ORIGIN}/api/public/global/reach?city=istanbul&district=${encodeURIComponent(districtSlug)}`, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { data?: { reach?: string | null; cutoff_time?: string | null } };
    if (!json.data) return null;
    const v: MotorIlceKarari = { reach: json.data.reach ?? null, cutoff_time: json.data.cutoff_time ?? null };
    memo.set(districtSlug, { at: Date.now(), v });
    return v;
  } catch {
    return null;
  }
}
