import type { EngagementBand } from "@prisma/client";

const BAND_COLORS: Record<EngagementBand, { ring: string; label: string; text: string }> = {
  HEALTHY: { ring: "stroke-green-500", label: "Healthy", text: "text-green-700" },
  WATCH: { ring: "stroke-amber-500", label: "Watch", text: "text-amber-700" },
  AT_RISK: { ring: "stroke-red-500", label: "At risk", text: "text-red-700" },
};

export function EngagementGauge({
  score,
  band,
  trend7d,
}: {
  score: number;
  band: EngagementBand;
  trend7d: number;
}) {
  const r = 48;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const colors = BAND_COLORS[band];
  const trendArrow = trend7d > 0 ? "↑" : trend7d < 0 ? "↓" : "→";

  return (
    <div className="card p-5 flex items-center gap-6">
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx={60} cy={60} r={r} className="stroke-slate-200" strokeWidth={10} fill="none" />
          <circle
            cx={60}
            cy={60}
            r={r}
            className={colors.ring}
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold">{score.toFixed(0)}</div>
            <div className="text-xs text-slate-500">/ 100</div>
          </div>
        </div>
      </div>
      <div>
        <div className={`text-sm font-medium ${colors.text}`}>{colors.label}</div>
        <div className="mt-1 text-xs text-slate-500">
          7-day trend: {trendArrow} {Math.abs(trend7d).toFixed(1)}
        </div>
        <p className="mt-2 max-w-xs text-sm text-slate-600">
          Based on your attendance, RSVPs, club count, and announcement reads over
          the last 60 days.
        </p>
      </div>
    </div>
  );
}
