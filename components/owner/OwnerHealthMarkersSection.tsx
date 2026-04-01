import { type OwnerPageDashboard } from "@/lib/owner/types";
import {
  HealthMarkerItem,
  SectionLabel,
} from "@/components/owner/OwnerPagePrimitives";

type Props = {
  dashboard: OwnerPageDashboard;
};

export function OwnerHealthMarkersSection({ dashboard }: Props) {
  return (
    <section className="border-b border-[var(--border)] py-6">
      <SectionLabel>Health markers</SectionLabel>
      <div className="mt-5 grid gap-4 xl:grid-cols-4">
        {dashboard.dashboard.healthMarkers.map((marker) => (
          <HealthMarkerItem key={marker.label} marker={marker} />
        ))}
      </div>
    </section>
  );
}