import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ÇiçekYolla — Premium Çiçekçi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          color: "white",
          background:
            "linear-gradient(135deg, #090012 0%, #25104A 52%, #6D28D9 100%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 540,
            height: 540,
            borderRadius: 999,
            right: -100,
            top: -170,
            background: "rgba(192,132,252,0.27)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 360,
            height: 360,
            borderRadius: 999,
            left: -120,
            bottom: -180,
            background: "rgba(139,92,246,0.3)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "72px 86px",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#D8B4FE",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
            }}
          >
            1986'dan beri premium çiçekçi
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 88,
              fontWeight: 800,
              letterSpacing: "-0.055em",
              lineHeight: 1,
            }}
          >
            ÇiçekYolla
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              maxWidth: 900,
              color: "#E9D5FF",
              fontSize: 36,
              lineHeight: 1.25,
            }}
          >
            Her duygu, ustalıkla hazırlanan bir çiçekle anlam kazanır.
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 44 }}>
            <div
              style={{
                display: "flex",
                border: "1px solid rgba(255,255,255,0.26)",
                borderRadius: 999,
                padding: "14px 22px",
                fontSize: 20,
              }}
            >
              İstanbul'da aynı gün teslimat
            </div>
            <div
              style={{
                display: "flex",
                border: "1px solid rgba(255,255,255,0.26)",
                borderRadius: 999,
                padding: "14px 22px",
                fontSize: 20,
              }}
            >
              Türkiye geneli 1–3 iş günü kargo
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
