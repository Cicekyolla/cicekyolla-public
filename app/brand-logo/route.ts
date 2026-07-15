export const runtime = "nodejs";

const LOGO_BASE64 = "undefined";

export function GET() {
  return new Response(Buffer.from(LOGO_BASE64, "base64"), {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
