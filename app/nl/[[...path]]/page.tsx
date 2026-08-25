// GLOBAL 14-dil — /nl/* locale yüzeyi (ince sarmalayıcı; motor lib/global/page).
// İçeriksiz yüzeyler 404/noindex kalır; vitrin açılışı approved içerikle olur.
import type { Metadata } from "next";
import { localeMetadata, LocalePage } from "@/lib/global/page";

export const dynamic = "force-dynamic";

type Props = { params: { path?: string[] } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return localeMetadata("nl", params.path ?? []);
}

export default function Page({ params }: Props) {
  return <LocalePage locale="nl" path={params.path ?? []} />;
}
