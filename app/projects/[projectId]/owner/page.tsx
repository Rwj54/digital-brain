"use client";

import { useMemo, useState } from "react";

import { OwnerActionPlanSection } from "@/components/owner/OwnerActionPlanSection";
import { OwnerDetailSections } from "@/components/owner/OwnerDetailSections";
import { OwnerHealthMarkersSection } from "@/components/owner/OwnerHealthMarkersSection";
import { OwnerHeroSection } from "@/components/owner/OwnerHeroSection";
import { buildOwnerSteps } from "@/lib/owner/buildOwnerSteps";
import { useOwnerPageState } from "@/lib/owner/useOwnerPageState";
import { type DetailTab, type Props } from "@/lib/owner/types";

export default function OwnerDashboardPage({ params }: Props) {
  const [detailTab, setDetailTab] = useState<DetailTab>("visibility");

  const {
    dashboard,
    tasksData,
    impactsData,
    loading,
    savingTaskId,
    error,
    toggleTask,
  } = useOwnerPageState(params);

  const steps = useMemo(() => {
    if (!dashboard || !tasksData) {
      return [];
    }

    return buildOwnerSteps(dashboard, tasksData);
  }, [dashboard, tasksData]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-[var(--text-body)]">
            Loading owner dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (error || !dashboard || !tasksData || !impactsData) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="border-t-2 border-[var(--danger)] pt-5">
            <p className="text-base font-medium text-[var(--danger)]">
              {error || "Failed to load owner dashboard."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const primaryStep = steps[0] ?? null;

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--text-strong)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <OwnerHeroSection
          dashboard={dashboard}
          primaryStep={primaryStep}
        />

        <OwnerHealthMarkersSection dashboard={dashboard} />

        <OwnerActionPlanSection
          dashboard={dashboard}
          steps={steps}
          tasksSummary={tasksData.summary}
          savingTaskId={savingTaskId}
          onToggleTask={toggleTask}
        />

        <OwnerDetailSections
          dashboard={dashboard}
          tasksData={tasksData}
          impactsData={impactsData}
          steps={steps}
          detailTab={detailTab}
          onDetailTabChange={setDetailTab}
        />
      </div>
    </main>
  );
}