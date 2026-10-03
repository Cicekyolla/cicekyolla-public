// GLOBAL 14-dil — /es/* locale yüzeyi (ince sarmalayıcı; motor lib/global/page).
// İçeriksiz yüzeyler 404/noindex kalır; vitrin açılışı approved içerikle olur.
import type { Metadata } from "next";
import { localeMetadata, LocalePage } from "@/lib/global/page";

export const dynamic = "force-dynamic";

type Props = { params: { path?: string[] }; searchParams?: { [key: string]: string | string[] | undefined } };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  // EK (SEO YAYIN ZİNCİRİ): lokasyon / niyet listesinde sayfa ≥ 2 kendi canonical'ını ve başlığını taşır; 1. sayfa aynen.
  return localeMetadata("es", params.path ?? [], searchParams);
}

export default function Page({ params, searchParams }: Props) {
  // ?category / ?page yalnız lokasyon kataloğu sayfalaması içindir; 1. sayfanın canonical'ı sorgusuz kalır.
  return <LocalePage locale="es" path={params.path ?? []} searchParams={searchParams} />;
}
