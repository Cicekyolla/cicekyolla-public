// GLOBAL Faz 1 — /en/* locale yüzeyi (ince sarmalayıcı; motor lib/global/page).
import type { Metadata } from "next";
import { localeMetadata, LocalePage } from "@/lib/global/page";

export const dynamic = "force-dynamic";

type Props = { params: { path?: string[] } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return localeMetadata("en", params.path ?? []);
}

export default function Page({ params }: Props) {
  return <LocalePage locale="en" path={params.path ?? []} />;
}
