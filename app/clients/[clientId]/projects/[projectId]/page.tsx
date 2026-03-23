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

export default function ProjectDashboard() {
  const router = useRouter();
  const params = useParams<{ clientId: string; projectId: string }>();

  const clientId = params.clientId;
  const projectId = params.projectId;

  const dashboard = useProjectDashboard({ clientId, projectId });

  if (dashboard.loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[28px] border border-[var(--border)] bg-white px-6 py-6 shadow-sm">
            <p className="text-base text-[var(--text-body)]">Loading dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[var(--app-bg)] text-[var(--text-strong)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 pb-28 sm:px-6 sm:py-6 md:pb-8">
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

          <section className="rounded-[32px] border border-[var(--border)] bg-white px-5 py-5 shadow-sm sm:px-7 sm:py-6">
            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr] xl:items-center">
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
                    . From here the user can review setup, inspect data, take action,
                    and refine project settings.
                  </p>
                ) : (
                  <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
                    Review the current project, inspect the supporting data, and move
                    into the next actions without falling back into a dead-end setup flow.
                  </p>
                )}
              </div>

              <div className="rounded-[28px] border border-[var(--border)] bg-[var(--primary-soft)] px-5 py-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-700)]">
                  Current project
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      Domain
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
                      {formatDomain(dashboard.project?.site_url)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      Category
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
                      {dashboard.project?.category ?? "Not set"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      Metro
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
                      {dashboard.project?.metro ?? "Not set"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      Radius
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
                      {dashboard.project?.radius_miles ?? "Not set"} mi
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="hidden md:block">
            <div className="flex flex-wrap gap-2">
              {dashboard.tabs.map((tabOption) => {
                const active = dashboard.tab === tabOption.key;

                return (
                  <button
                    key={tabOption.key}
                    type="button"
                    onClick={() => dashboard.setTab(tabOption.key)}
                    className="rounded-full px-4 py-2 text-sm font-semibold transition"
                    style={{
                      backgroundColor: active ? "var(--brand-600)" : "var(--reference-soft)",
                      color: active ? "#ffffff" : "var(--text-body)",
                    }}
                  >
                    {tabOption.label}
                  </button>
                );
              })}
            </div>
          </section>

          {dashboard.status ? (
            <section className="rounded-[24px] border border-[var(--warning)] bg-[var(--warning-soft)] px-5 py-4 shadow-sm">
              <p className="text-sm font-medium text-[var(--warning)]">{dashboard.status}</p>
            </section>
          ) : null}

          <section className="rounded-[32px] border border-[var(--border)] bg-white px-5 py-5 shadow-sm sm:px-6 sm:py-6">
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