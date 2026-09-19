import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#4A1A8A",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ fontSize: 120, fontWeight: 800, color: "#ffffff", fontFamily: "sans-serif" }}>
            botimi
          </div>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#FFC977", marginTop: 14 }} />
        </div>
        <div style={{ fontSize: 36, color: "#E0D4F5", marginTop: 28, fontFamily: "sans-serif" }}>
          AI Chatbots for Customer Support &amp; Sales
        </div>
      </div>
    ),
    { ...size }
  );
}
