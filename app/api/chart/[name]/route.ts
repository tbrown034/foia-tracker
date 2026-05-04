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
    });
    return svgResponse("foia-tracker-slope-chart.svg", svg);
  }

  return new Response(`Unknown chart: ${name}. Available: slope`, {
    status: 404,
  });
}
