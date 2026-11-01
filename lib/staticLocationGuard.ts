// EK (2 Kas 2026): sabit 4 ilin (istanbul/ankara/izmir/bursa) KAYITSIZ (sentetik) konum yollarında karar.
// Sorun: syntheticDeliveryPage hiçbir segmenti doğrulamıyordu → /istanbul/kadikoy/orkideler gibi yollar
// 200 + noindex + uydurma "Orkideler Mahallesi" metni üretiyordu. Dinamik iller (dynamicDeliveryParts) zaten
// lokasyon çekirdeğiyle doğruluyor; burada aynı ilke sabit illere, MEVCUT veri kaynaklarıyla uygulanır:
//   • İstanbul → yönetilen 301 haritası (975 × /istanbul/{ilçe}/{mahalle}-mah + 39 × /istanbul/{ilçe})
//       gerçek mahallenin eksiz yolu → yeni adresine 301 · haritada olmayan segment → 404
//   • Ankara/İzmir/Bursa (3 parça) → lokasyon çekirdeği mahalle slug'ları ("x" ya da "x-mah") → yoksa 404
// FAIL-SAFE: harita boş/İstanbul kaydı yok ya da çekirdek okunamadı (null) → "synthetic" (bugünkü davranış birebir).
// Yayınlanmış seo_page yolları buraya hiç gelmez (resolvePage önce fetchSeoPage'i dener).
// Saf modül: düz `node --test` ile sınanır.

export type StaticLocationDecision =
  | { kind: "synthetic" }
  | { kind: "redirect"; to: string }
  | { kind: "notfound" };

const SYNTHETIC: StaticLocationDecision = { kind: "synthetic" };
const NOT_FOUND: StaticLocationDecision = { kind: "notfound" };

function hasIstanbulEntries(redirects: ReadonlyMap<string, string>): boolean {
  for (const key of redirects.keys()) if (key.startsWith("/istanbul/")) return true;
  return false;
}

/** İstanbul /istanbul/{ilçe}[/{segment}] kayıtsız yolu → yönetilen 301 haritasına göre karar. */
export function istanbulLocationDecision(parts: string[], redirects: ReadonlyMap<string, string>): StaticLocationDecision {
  if (parts[0] !== "istanbul" || parts.length < 2 || parts.length > 3) return SYNTHETIC;
  if (!hasIstanbulEntries(redirects)) return SYNTHETIC;
  if (parts.length === 2) {
    const to = redirects.get(`/istanbul/${parts[1]}`);
    return to ? { kind: "redirect", to } : NOT_FOUND;
  }
  const seg = parts[2].endsWith("-mah") ? parts[2] : `${parts[2]}-mah`;
  const to = redirects.get(`/istanbul/${parts[1]}/${seg}`);
  return to ? { kind: "redirect", to } : NOT_FOUND;
}

/** Ankara/İzmir/Bursa 3 parçalı kayıtsız yol: çekirdek mahalle slug'larında yoksa 404; çekirdek yoksa bugünkü gibi. */
export function coreNeighborhoodDecision(segment: string, coreSlugs: readonly string[] | null): StaticLocationDecision {
  if (!coreSlugs) return SYNTHETIC;
  return coreSlugs.includes(segment) || coreSlugs.includes(`${segment}-mah`) ? SYNTHETIC : NOT_FOUND;
}
