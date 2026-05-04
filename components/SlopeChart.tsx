import { renderSlopeChartSvg } from "@/lib/charts/slope-svg";
import type { SlopeAnnotation } from "@/lib/charts/slope-svg";
import type { SlopeChartData } from "@/lib/queries";

type Props = {
  data: SlopeChartData;
  width?: number;
  height?: number;
  topN?: number;
  annotations?: SlopeAnnotation[];
};

export function SlopeChart({
  data,
  width,
  height,
  topN,
  annotations,
}: Props) {
  const svg = renderSlopeChartSvg(data, { width, height, topN, annotations });
  return (
    <div
      className="w-full overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
