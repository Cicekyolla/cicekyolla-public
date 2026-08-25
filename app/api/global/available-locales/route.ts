// GLOBAL 14-dil — dil seçicinin tek kaynağı: public vitrini hazır locale'ler
// (approved 'home'). Upstream'e no-store proxy (yayın durumu anında yansır).
export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export async function GET() {
  try {
    const resp = await fetch(`${API_ORIGIN}/api/public/global/available-locales`, { cache: "no-store" });
    const body = await resp.json();
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ data: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
