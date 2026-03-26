import { Card } from "@/components/projects/dashboard/Card";
import type { CompetitorMetric } from "@/components/projects/dashboard/types";

type DataTabProps = {
  hasGbp: boolean;
  hasCompetitors: boolean;
  hasCapacity: boolean;
  competitors: CompetitorMetric[];
};

function DataStatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning";
}) {
  return (
    <div
      className="grid gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[180px_minmax(0,1fr)]"
      style={{ borderTop: "1px solid rgba(15, 104, 128, 0.14)" }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-700)]">
        {label}
      </div>
      <div
        className="text-sm font-semibold"
        style={{
          color: tone === "success" ? "var(--success)" : "var(--warning)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function DataTab({
  hasGbp,
  hasCompetitors,
  hasCapacity,
  competitors,
}: DataTabProps) {
  return (
    <div className="grid gap-4">
      <Card title="Data status" subtitle="MVP is manual. Automation comes next.">
        <div
          className="border"
          style={{ borderColor: "var(--brand-700)" }}
        >
          <div
            className="border-b px-5 py-4 sm:px-6"
            style={{
              borderColor: "rgba(255,255,255,0.18)",
              background:
                "linear-gradient(135deg, var(--brand-700) 0%, var(--brand-600) 62%, #1798bb 100%)",
            }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/84">
              Current data footing
            </div>
            <div className="mt-2 max-w-3xl text-sm leading-7 text-white/92">
              This shows whether the project has the minimum inputs needed for
              stronger recommendations and better automation.
            </div>
          </div>

          <div
            className="px-5 py-5 sm:px-6"
            style={{ backgroundColor: "rgba(235, 248, 250, 0.96)" }}
          >
            <DataStatusRow
              label="GBP snapshot"
              value={hasGbp ? "Saved" : "Missing"}
              tone={hasGbp ? "success" : "warning"}
            />
            <DataStatusRow
              label="Competitors"
              value={hasCompetitors ? `${competitors.length} saved` : "Missing"}
              tone={hasCompetitors ? "success" : "warning"}
            />
            <DataStatusRow
              label="Capacity model"
              value={hasCapacity ? "Saved" : "Missing"}
              tone={hasCapacity ? "success" : "warning"}
            />

            <div
              className="mt-5 border-l-2 pl-4 text-xs leading-6 text-[var(--text-body)]"
              style={{ borderColor: "var(--brand-600)" }}
            >
              Next: nightly Maps pulls + weekly SERP pulls + review velocity tracking.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}