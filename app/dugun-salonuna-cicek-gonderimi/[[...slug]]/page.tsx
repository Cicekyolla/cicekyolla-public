// Yer sayfaları (ADDITIVE, 30 Eki 2026): /dugun-salonuna-cicek-gonderimi hub'ı ve /dugun-salonuna-cicek-gonderimi/{yer}. İçerik panelden — bkz. components/place/PlacePage.tsx.
import type { Metadata } from "next";
import { PlacePage, placePageMetadata } from "@/components/place/PlacePage";

export const revalidate = 300;
export const dynamicParams = true;

type Props = { params: { slug?: string[] } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return placePageMetadata("dugun", params);
}

export default async function Page({ params }: Props) {
  return <PlacePage kind="dugun" params={params} />;
}
