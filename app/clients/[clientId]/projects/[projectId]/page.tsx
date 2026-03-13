"use client";

import { useParams, useRouter } from "next/navigation";
import { MobileBottomNav } from "@/components/projects/dashboard/MobileBottomNav";
import { TabPill } from "@/components/projects/dashboard/TabPill";
import { OverviewTab } from "@/components/projects/dashboard/OverviewTab";
import { DataTab } from "@/components/projects/dashboard/DataTab";
import { ActionsTab } from "@/components/projects/dashboard/ActionsTab";
import { SettingsTab } from "@/components/projects/dashboard/SettingsTab";
import { useProjectDashboard } from "@/components/projects/dashboard/useProjectDashboard";

export default function ProjectDashboard() {
  const router = useRouter();
  const params = useParams<{ clientId: string; projectId: string }>();

  const clientId = params.clientId;
  const projectId = params.projectId;

  const dashboard = useProjectDashboard({ clientId, projectId });

  if (dashboard.loading) {
    return <div className="p-8">Loading dashboard…</div>;
  }

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-6 pb-28 md:px-6 md:pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => router.push(`/clients/${clientId}`)}
            className="text-sm font-semibold underline underline-offset-4 opacity-80 hover:opacity-100"
          >
            ← Back to projects
          </button>
          <button
            onClick={() => router.push("/clients")}
            className="text-sm font-semibold underline underline-offset-4 opacity-60 hover:opacity-100"
          >
            Clients
          </button>
        </div>

        <div className="mt-4">
          <div className="text-2xl font-black tracking-tight md:text-3xl">
            {dashboard.client ? dashboard.client.name : "Client"} — Project Dashboard
          </div>
          {dashboard.project && (
            <div className="mt-2 text-sm text-zinc-700 md:text-base">
              <span className="font-bold">{dashboard.project.site_url}</span>
              <span className="mx-2 opacity-40">•</span>
              {dashboard.project.category}
              <span className="mx-2 opacity-40">•</span>
              {dashboard.project.metro}
              <span className="mx-2 opacity-40">•</span>
              {dashboard.project.radius_miles} mi
            </div>
          )}
        </div>

        <div className="mt-4 hidden md:block">
          <div className="flex flex-wrap gap-2">
            {dashboard.tabs.map((tabOption) => (
              <TabPill
                key={tabOption.key}
                active={dashboard.tab === tabOption.key}
                label={tabOption.label}
                onClick={() => dashboard.setTab(tabOption.key)}
              />
            ))}
          </div>
        </div>

        {dashboard.status && (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-900">
            {dashboard.status}
          </div>
        )}

        <div className="mt-4">
          {dashboard.tab === "overview" && (
            <OverviewTab
              gbp={dashboard.gbp}
              competitors={dashboard.competitors}
              project={dashboard.project}
              labelPlural={dashboard.labelPlural}
              hasGbp={dashboard.hasGbp}
              hasCompetitors={dashboard.hasCompetitors}
              hasCapacity={dashboard.hasCapacity}
              setupDoneCount={dashboard.setupDoneCount}
              gapReviews={dashboard.gapReviews}
              desiredTarget90d={dashboard.desiredTarget90d}
              maxReviews90d={dashboard.maxReviews90d}
              realisticTarget90d={dashboard.realisticTarget90d}
              perWeek={dashboard.perWeek}
              monthsToCloseGap={dashboard.monthsToCloseGap}
              onGoToSettings={() => dashboard.setTab("settings")}
            />
          )}

          {dashboard.tab === "data" && (
            <DataTab
              hasGbp={dashboard.hasGbp}
              hasCompetitors={dashboard.hasCompetitors}
              hasCapacity={dashboard.hasCapacity}
              competitors={dashboard.competitors}
            />
          )}

          {dashboard.tab === "actions" && (
            <ActionsTab
              realisticTarget90d={dashboard.realisticTarget90d}
              perWeek={dashboard.perWeek}
              labelSingular={dashboard.labelSingular}
            />
          )}

          {dashboard.tab === "settings" && (
            <SettingsTab
              siteUrl={dashboard.project?.site_url ?? null}
              projectCategory={dashboard.project?.category ?? null}
              projectMetro={dashboard.project?.metro ?? null}
              projectRadiusMiles={dashboard.project?.radius_miles ?? null}
              targetDomain={dashboard.project?.target_domain ?? null}
              targetBrandName={dashboard.project?.target_brand_name ?? null}
              labelPlural={dashboard.labelPlural}
              preset={dashboard.preset}
              presetOptions={dashboard.presetOptions}
              volumePreset={dashboard.volumePreset}
              showAdvancedLabels={dashboard.showAdvancedLabels}
              eventLabelSingular={dashboard.eventLabelSingular}
              eventLabelPlural={dashboard.eventLabelPlural}
              monthlyEvents={dashboard.monthlyEvents}
              reviewConvRate={dashboard.reviewConvRate}
              gbpName={dashboard.gbpName}
              primaryCategory={dashboard.primaryCategory}
              placeId={dashboard.placeId}
              gbpUrl={dashboard.gbpUrl}
              rating={dashboard.rating}
              totalReviews={dashboard.totalReviews}
              photosCount={dashboard.photosCount}
              compDomain={dashboard.compDomain}
              compName={dashboard.compName}
              compSource={dashboard.compSource}
              compRating={dashboard.compRating}
              compReviews={dashboard.compReviews}
              competitors={dashboard.competitors}
              onSaveProjectReviewCapacity={dashboard.saveProjectReviewCapacity}
              onSaveGbpProfile={dashboard.saveGbpProfile}
              onAddOrUpdateCompetitor={dashboard.addOrUpdateCompetitor}
              onDeleteCompetitor={dashboard.deleteCompetitor}
              setVolumePreset={dashboard.setVolumePreset}
              setShowAdvancedLabels={dashboard.setShowAdvancedLabels}
              setEventLabelSingular={dashboard.setEventLabelSingular}
              setEventLabelPlural={dashboard.setEventLabelPlural}
              setMonthlyEvents={dashboard.setMonthlyEvents}
              setReviewConvRate={dashboard.setReviewConvRate}
              setGbpName={dashboard.setGbpName}
              setPrimaryCategory={dashboard.setPrimaryCategory}
              setPlaceId={dashboard.setPlaceId}
              setGbpUrl={dashboard.setGbpUrl}
              setRating={dashboard.setRating}
              setTotalReviews={dashboard.setTotalReviews}
              setPhotosCount={dashboard.setPhotosCount}
              setCompDomain={dashboard.setCompDomain}
              setCompName={dashboard.setCompName}
              setCompSource={dashboard.setCompSource}
              setCompRating={dashboard.setCompRating}
              setCompReviews={dashboard.setCompReviews}
            />
          )}
        </div>
      </div>

      <MobileBottomNav tab={dashboard.tab} setTab={dashboard.setTab} />
    </>
  );
}
