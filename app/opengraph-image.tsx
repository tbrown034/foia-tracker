import { ImageResponse } from "next/og";

export const alt = "FOIA Tracker — Federal FOIA Backlog Dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          padding: "70px 80px",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            height: "6px",
            background: "#1c1917",
            width: "100%",
            marginBottom: 56,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 32,
          }}
        >
          {/* Inline favicon mark */}
          <div
            style={{
              width: 44,
              height: 56,
              background: "#fafaf9",
              border: "3px solid #1c1917",
              borderRadius: 3,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 4,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -3,
                right: -3,
                width: 12,
                height: 12,
                background: "#1c1917",
                clipPath: "polygon(100% 0, 0 0, 100% 100%)",
              }}
            />
            <div style={{ width: 28, height: 4, background: "#1c1917" }} />
            <div style={{ width: 20, height: 4, background: "#1c1917" }} />
            <div style={{ width: 28, height: 4, background: "#1c1917" }} />
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#737373",
              letterSpacing: 4,
              textTransform: "uppercase",
              fontFamily: "sans-serif",
            }}
          >
            FOIA Tracker
          </div>
        </div>
        <div
          style={{
            fontSize: 84,
            color: "#1c1917",
            lineHeight: 1.05,
            fontWeight: 400,
            marginBottom: 28,
            letterSpacing: -2,
            maxWidth: 980,
          }}
        >
          Where federal records requests go to die
        </div>
        <div
          style={{
            fontSize: 30,
            color: "#525252",
            lineHeight: 1.35,
            maxWidth: 920,
            fontFamily: "sans-serif",
            marginBottom: "auto",
          }}
        >
          17 years of FOIA backlog data, ranking every federal agency by
          response time, request age, and exemption use.
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontFamily: "sans-serif",
            marginTop: 40,
          }}
        >
          <span style={{ fontSize: 22, color: "#525252" }}>
            Data from FOIA.gov — DOJ Office of Information Policy
          </span>
          <span style={{ fontSize: 20, color: "#a3a3a3" }}>
            foiatracker.org
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
