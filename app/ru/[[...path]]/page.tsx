// GLOBAL 14-dil — /ru/* locale yüzeyi (ince sarmalayıcı; motor lib/global/page).
// İçeriksiz yüzeyler 404/noindex kalır; vitrin açılışı approved içerikle olur.
import type { Metadata } from "next";
import { localeMetadata, LocalePage } from "@/lib/global/page";

export const dynamic = "force-dynamic";

type Props = { params: { path?: string[] }; searchParams?: { [key: string]: string | string[] | undefined } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return localeMetadata("ru", params.path ?? []);
}

export default function Page({ params, searchParams }: Props) {
  // ?category / ?page yalnız lokasyon kataloğu sayfalaması içindir; metadata (canonical) sorgusuz kalır.
  return <LocalePage locale="ru" path={params.path ?? []} searchParams={searchParams} />;
}
