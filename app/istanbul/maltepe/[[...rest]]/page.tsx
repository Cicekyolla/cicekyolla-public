// ═══════════════════════════════════════════════════════════════════════════
// DENEY — IZOLE CANARY (yalniz preview olcumu, production'a gitmez)
//
// Bu rota /istanbul/maltepe ve /istanbul/maltepe/<mahalle> yollarini karsilar.
// Next.js daha spesifik literal segmenti once esler; bu yuzden app/[...slug]
// rotasi HIC DEGISMEZ ve diger 71.400 URL bugunku davranisini korur.
//
// Render ve metadata mantigi catch-all sayfadan AYNEN yeniden kullanilir —
// ikinci bir kod yolu yaratilmaz, davranis kopyalanmaz.
// ═══════════════════════════════════════════════════════════════════════════
import type { Metadata } from "next";
import CatchAllPage, { generateMetadata as catchAllMetadata } from "@/app/[...slug]/page";
import { fetchDistrictNeighborhoods } from "@/lib/api";

export const revalidate = 30;   // DENEY: bayatlik penceresi 300s -> 30s
export const dynamicParams = true;

type Props = { params: { rest?: string[] } };

const toSlug = (rest?: string[]) => ["istanbul", "maltepe", ...(rest ?? [])];

export async function generateStaticParams(): Promise<{ rest: string[] }[]> {
  const out: { rest: string[] }[] = [{ rest: [] }];
  try {
    const d = await fetchDistrictNeighborhoods("istanbul", "maltepe");
    if (d) for (const m of d.neighborhoods) out.push({ rest: [m.slug] });
  } catch { /* API yoksa yalniz ilce sayfasi uretilir; davranis degismez */ }
  return out;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return catchAllMetadata({ params: { slug: toSlug(params.rest) } });
}

export default async function Page({ params }: Props) {
  return CatchAllPage({ params: { slug: toSlug(params.rest) } });
}
