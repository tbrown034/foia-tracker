import { renderSlopeChartSvg } from "@/lib/charts/slope-svg";
import { getSlopeChartData } from "@/lib/queries";

export const dynamic = "force-dynamic";

function svgResponse(filename: string, body: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${body}`;
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const key = name.replace(/\.svg$/i, "");

  if (key === "slope") {
    const data = await getSlopeChartData();
    const svg = renderSlopeChartSvg(data, {
      width: 1100,
      height: 680,
      topN: 20,
      annotations: [
        {
          agency: "Department of Justice",
          text: "FBI, ATF, DEA all report through DOJ",
          side: "right",
        },
        {
          agency: "Department of Health and Human Services",
          text: "CDC FOIA office eliminated, April 2025",
          side: "right",
        },
        {
          agency: "Department of Transportation",
          text: "Lost 10% of FOIA staff",
          side: "right",
        },
      ],
    });
    return svgResponse("foia-tracker-slope-chart.svg", svg);
  }

  return new Response(`Unknown chart: ${name}. Available: slope`, {
    status: 404,
  });
}
