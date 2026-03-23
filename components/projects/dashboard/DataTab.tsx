import { Card } from "@/components/projects/dashboard/Card";
import type { CompetitorMetric } from "@/components/projects/dashboard/types";

type DataTabProps = {
  hasGbp: boolean;
  hasCompetitors: boolean;
  hasCapacity: boolean;
  competitors: CompetitorMetric[];
};

export function DataTab({
  hasGbp,
  hasCompetitors,
  hasCapacity,
  competitors,
}: DataTabProps) {
  return (
    <div className="grid gap-4">
      <Card title="Data status" subtitle="MVP is manual. Automation comes next.">
        <div className="grid gap-2 text-sm text-zinc-800">
          <div>• GBP snapshot: {hasGbp ? "Saved ✅" : "Missing ⚠️"}</div>
          <div>• Competitors: {hasCompetitors ? `${competitors.length} saved ✅` : "Missing ⚠️"}</div>
          <div>• Capacity model: {hasCapacity ? "Saved ✅" : "Missing ⚠️"}</div>
        </div>
        <div className="mt-3 text-xs text-zinc-500">
          Next: nightly Maps pulls + weekly SERP pulls + review velocity tracking.
        </div>
      </Card>
    </div>
  );
}
