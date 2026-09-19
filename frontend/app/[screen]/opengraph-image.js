import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Deliberately a small local map, not an import from page.js's screenInfo --
// that file pulls in every screen component (Dashboard, BotsPage, etc.) just
// for their titles, which would bloat this lightweight image route for no
// reason. Only the public screens need a title here; anything else falls
// back to the generic wordmark.
const TITLES = {
  "how-it-works": "How It Works",
  pricing: "Pricing",
  enterprise: "Enterprise Integrations",
  docs: "Documentation & Playground",
  privacy: "Privacy Policy",
  terms: "Terms & Conditions",
};

export default async function Image({ params }) {
  const { screen } = await params;
  const title = TITLES[screen];

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
          <div style={{ fontSize: 88, fontWeight: 800, color: "#ffffff", fontFamily: "sans-serif" }}>
            botimi
          </div>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#FFC977", marginTop: 10 }} />
        </div>
        {title && (
          <div style={{ fontSize: 42, color: "#E0D4F5", marginTop: 24, fontFamily: "sans-serif" }}>
            {title}
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
