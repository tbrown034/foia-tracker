import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#1c1917",
          borderRadius: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 30,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            background: "#fafaf9",
            borderRadius: 6,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            position: "relative",
          }}
        >
          {/* Corner fold */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 22,
              height: 22,
              background: "#1c1917",
              clipPath: "polygon(100% 0, 0 0, 100% 100%)",
            }}
          />
          {/* Redaction bars */}
          <div style={{ width: 80, height: 10, background: "#1c1917" }} />
          <div style={{ width: 56, height: 10, background: "#1c1917" }} />
          <div style={{ width: 80, height: 10, background: "#1c1917" }} />
          <div style={{ width: 40, height: 10, background: "#1c1917" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
