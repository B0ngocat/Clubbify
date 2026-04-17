import type { EngagementBand } from "@prisma/client";

const CLASSES: Record<EngagementBand, string> = {
  HEALTHY: "bg-green-100 text-green-800",
  WATCH: "bg-amber-100 text-amber-800",
  AT_RISK: "bg-red-100 text-red-800",
};

const LABELS: Record<EngagementBand, string> = {
  HEALTHY: "Healthy",
  WATCH: "Watch",
  AT_RISK: "At risk",
};

export function BandBadge({ band }: { band: EngagementBand }) {
  return <span className={`badge ${CLASSES[band]}`}>{LABELS[band]}</span>;
}

export function TrendCell({ trend }: { trend: number }) {
  const arrow = trend > 0 ? "↑" : trend < 0 ? "↓" : "→";
  const color = trend < -5 ? "text-red-700" : trend > 5 ? "text-green-700" : "text-slate-500";
  return (
    <span className={color}>
      {arrow} {Math.abs(trend).toFixed(1)}
    </span>
  );
}
