// GLOBAL Faz 1 — /de/* locale yüzeyi (ince sarmalayıcı; motor lib/global/page).
// Statik "de" segmenti app/[...slug] catch-all'ından ÖNCELİKLİDİR; TR route'ları etkilenmez.
import type { Metadata } from "next";
import { localeMetadata, LocalePage } from "@/lib/global/page";

// Yayın durumu (approved/indexable) anında yansımalı — cache yok.
export const dynamic = "force-dynamic";

type Props = { params: { path?: string[] } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return localeMetadata("de", params.path ?? []);
}

export default function Page({ params }: Props) {
  return <LocalePage locale="de" path={params.path ?? []} />;
}
