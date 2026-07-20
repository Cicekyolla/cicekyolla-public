import { NextResponse } from "next/server";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://cicekyolla-api.onrender.com";

export async function POST(request: Request, context: { params: { action: string } }) {
  const action = context.params.action;
  if (action !== "register" && action !== "login" && action !== "logout") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const body = action === "logout" ? undefined : await request.text();
    const upstream = await fetch(`${API_ORIGIN}/api/auth/${action}`, {
      method: "POST",
      headers: body ? { "Content-Type": request.headers.get("content-type") ?? "application/json" } : undefined,
      body,
      cache: "no-store",
    });
    const data = await upstream.text();
    const response = new NextResponse(data, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    });
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  } catch {
    return NextResponse.json({ error: "proxy_error" }, { status: 502 });
  }
}
