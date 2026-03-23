"use client";

import { useParams, useRouter } from "next/navigation";
import { MobileBottomNav } from "@/components/projects/dashboard/MobileBottomNav";
import { OverviewTab } from "@/components/projects/dashboard/OverviewTab";
import { DataTab } from "@/components/projects/dashboard/DataTab";
import { ActionsTab } from "@/components/projects/dashboard/ActionsTab";
import { SettingsTab } from "@/components/projects/dashboard/SettingsTab";
import { useProjectDashboard } from "@/components/projects/dashboard/useProjectDashboard";

function formatDomain(siteUrl: string | null | undefined): string {
  if (!siteUrl) {
    return "Not set";
  }

  try {
    return new URL(siteUrl).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return siteUrl;
  }
}

function formatRadius(radiusMiles: number | null | undefined): string {
  if (typeof radiusMiles !== "number" || !Number.isFinite(radiusMiles)) {
    return "Not set";
  }

  return `${radiusMiles} mi`;
}

function ProjectMetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold text-[var(--text-strong)]">
        {value}
      </dd>
    </div>
  );
}

export default function ProjectDashboard() {
  const router = useRouter();
  const params = useParams<{ clientId: string; projectId: string }>();

  const clientId = params.clientId;
  const projectId = params.projectId;

  const dashboard = useProjectDashboard({ clientId, projectId });

  if (dashboard.loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-base text-[var(--text-body)]">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[var(--app-bg)] text-[var(--text-strong)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 pb-28 sm:px-6 sm:py-8 md:pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => router.push(`/clients/${clientId}`)}
              className="text-sm font-semibold text-[var(--text-body)] underline underline-offset-4 opacity-90 hover:opacity-100"
            >
              ← Back to projects
            </button>
            <button
              onClick={() => router.push("/clients")}
              className="text-sm font-semibold text-[var(--text-body)] underline underline-offset-4 opacity-80 hover:opacity-100"
            >
              Clients
            </button>
          </div>

          <section className="border-b border-[var(--border)] pb-8">
            <div className="grid gap-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start lg:gap-8">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-700)]">
                    Project workspace
                  </p>

                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[2.15rem] sm:leading-tight">
                    {dashboard.client ? dashboard.client.name : "Client"} — Project dashboard
                  </h1>

                  {dashboard.project ? (
                    <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
                      This is the working project view for{" "}
                      <span className="font-semibold text-[var(--text-strong)]">
                        {formatDomain(dashboard.project.site_url)}
                      </span>
                      . Review setup, inspect data, take action, and refine project
                      settings from one place.
                    </p>
                  ) : (
                    <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
                      Review the current project, inspect the supporting data, and move
                      into the next actions without falling back into a dead-end setup flow.
                    </p>
                  )}
                </div>

                <div className="lg:justify-self-end">
                  <div className="inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-700)] ring-1 ring-inset ring-[var(--border)]/60">
                    Current project
                  </div>
                </div>
              </div>

              <dl className="grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-2 xl:grid-cols-4">
                <ProjectMetaItem
                  label="Domain"
                  value={formatDomain(dashboard.project?.site_url)}
                />
                <ProjectMetaItem
                  label="Category"
                  value={dashboard.project?.category ?? "Not set"}
                />
                <ProjectMetaItem
                  label="Metro"
                  value={dashboard.project?.metro ?? "Not set"}
                />
                <ProjectMetaItem
                  label="Radius"
                  value={formatRadius(dashboard.project?.radius_miles)}
                />
              </dl>
            </div>
          </section>

          <section className="hidden md:block">
            <div className="flex flex-wrap gap-6 border-b border-[var(--border)]">
              {dashboard.tabs.map((tabOption) => {
                const active = dashboard.tab === tabOption.key;

                return (
                  <button
                    key={tabOption.key}
                    type="button"
                    onClick={() => dashboard.setTab(tabOption.key)}
                    className="border-b-2 px-0 pb-3 text-sm font-semibold transition"
                    style={{
                      borderColor: active ? "var(--brand-600)" : "transparent",
                      color: active ? "var(--text-strong)" : "var(--text-body)",
                    }}
                  >
                    {tabOption.label}
                  </button>
                );
              })}
            </div>
          </section>

          {dashboard.status ? (
            <section className="border-l-4 border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3">
              <p className="text-sm font-medium text-[var(--warning)]">
                {dashboard.status}
              </p>
            </section>
          ) : null}

          <section className="grid gap-5">
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
          </section>
        </div>
      </main>

      <MobileBottomNav tab={dashboard.tab} setTab={dashboard.setTab} />
    </>
  );
}
