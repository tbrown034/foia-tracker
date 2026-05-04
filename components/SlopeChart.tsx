import { renderSlopeChartSvg } from "@/lib/charts/slope-svg";
import type { SlopeChartData } from "@/lib/queries";

type Props = {
  data: SlopeChartData;
  width?: number;
  height?: number;
  topN?: number;
};

export function SlopeChart({ data, width, height, topN }: Props) {
  const svg = renderSlopeChartSvg(data, { width, height, topN });
  return (
    <div
      className="w-full overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
