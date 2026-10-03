// GLOBAL Faz 1 — /de/* locale yüzeyi (ince sarmalayıcı; motor lib/global/page).
// Statik "de" segmenti app/[...slug] catch-all'ından ÖNCELİKLİDİR; TR route'ları etkilenmez.
import type { Metadata } from "next";
import { localeMetadata, LocalePage } from "@/lib/global/page";

// Yayın durumu (approved/indexable) anında yansımalı — cache yok.
export const dynamic = "force-dynamic";

type Props = { params: { path?: string[] }; searchParams?: { [key: string]: string | string[] | undefined } };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  // EK (SEO YAYIN ZİNCİRİ): lokasyon / niyet listesinde sayfa ≥ 2 kendi canonical'ını ve başlığını taşır; 1. sayfa aynen.
  return localeMetadata("de", params.path ?? [], searchParams);
}

export default function Page({ params, searchParams }: Props) {
  // ?category / ?page yalnız lokasyon kataloğu sayfalaması içindir; 1. sayfanın canonical'ı sorgusuz kalır.
  return <LocalePage locale="de" path={params.path ?? []} searchParams={searchParams} />;
}
