// Yer sayfaları (ADDITIVE, 31 Eki 2026): /mezarliga-cicek-gonderimi hub'ı ve /mezarliga-cicek-gonderimi/{yer}. İçerik panelden — bkz. components/place/PlacePage.tsx.
import type { Metadata } from "next";
import { PlacePage, placePageMetadata } from "@/components/place/PlacePage";

export const revalidate = 300;
export const dynamicParams = true;

type Props = { params: { slug?: string[] } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return placePageMetadata("mezarlik", params);
}

export default async function Page({ params }: Props) {
  return <PlacePage kind="mezarlik" params={params} />;
}
