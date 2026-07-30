import { NextResponse } from "next/server";
import { categories } from "./data";

export async function GET() {
  return NextResponse.json(
    { categories, total: categories.length },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
