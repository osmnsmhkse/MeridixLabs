import { ImageResponse } from "next/og";

// Static social-share card (1200×630) used for Open Graph + Twitter previews.
export const alt = "Meridix Labs — Lab results, in plain English";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "radial-gradient(120% 120% at 0% 0%, #15233f 0%, #0a0f1c 55%, #070a13 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #4a85ef, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "38px",
              fontWeight: 700,
            }}
          >
            M
          </div>
          <div style={{ fontSize: "34px", fontWeight: 600, letterSpacing: "-0.02em" }}>
            Meridix Labs
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              fontSize: "76px",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: "900px",
            }}
          >
            Your health, finally explained.
          </div>
          <div style={{ fontSize: "34px", color: "#a9b4c9", maxWidth: "880px" }}>
            AI-powered medical interpretation — lab results, symptoms and
            diagnoses in plain English.
          </div>
        </div>

        {/* Footer URL */}
        <div style={{ fontSize: "28px", color: "#6f7d97", letterSpacing: "0.02em" }}>
          meridixlabs.com
        </div>
      </div>
    ),
    { ...size }
  );
}
