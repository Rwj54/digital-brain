"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Client,
  CompetitorMetric,
  GbpProfile,
  Project,
  TabKey,
} from "@/components/projects/dashboard/types";
import {
  DASHBOARD_PRESET_OPTIONS,
  DASHBOARD_TABS,
} from "@/components/projects/dashboard/config";
import { computeDashboardDerived } from "@/components/projects/dashboard/calculations";
import { useProjectDashboardFormState } from "@/components/projects/dashboard/formState";
import { createProjectDashboardActions } from "@/components/projects/dashboard/actions";
import {
  loadProjectDashboardData,
  requireDashboardAuth,
} from "@/components/projects/dashboard/readData";

type UseProjectDashboardArgs = {
  clientId: string;
  projectId: string;
};

function normalizeDraftValue(value: string | null | undefined): string {
  return typeof value === "string" ? value : "";
}

export function useProjectDashboard({
  clientId,
  projectId,
}: UseProjectDashboardArgs) {
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [gbp, setGbp] = useState<GbpProfile | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorMetric[]>([]);

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("overview");
  const [onboardingCategory, setOnboardingCategory] = useState("");
  const [onboardingMetro, setOnboardingMetro] = useState("");

  const form = useProjectDashboardFormState();

  const presetOptions = DASHBOARD_PRESET_OPTIONS;
  const tabs = DASHBOARD_TABS;

  async function loadAll() {
    setLoading(true);
    setStatus(null);

    try {
      const result = await loadProjectDashboardData({
        clientId,
        projectId,
        presetOptions,
      });

      if (!result.ok) {
        setStatus(result.error);
        setLoading(false);
        return;
      }

      setClient(result.client);
      setProject(result.project);
      setGbp(result.gbp);
      setCompetitors(result.competitors);
      form.applyLoadedFormState(result.formState);
      setOnboardingCategory(normalizeDraftValue(result.project?.category));
      setOnboardingMetro(normalizeDraftValue(result.project?.metro));
      setLoading(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected dashboard load error.";

      setStatus(message);
      setLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function bootstrap() {
      try {
        const isAuthed = await requireDashboardAuth();

        if (!isActive) {
          return;
        }

        if (!isAuthed) {
          router.replace("/login");
          return;
        }

        await loadAll();
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unexpected dashboard bootstrap error.";

        setStatus(message);
        setLoading(false);
      }
    }

    void bootstrap();

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, projectId, router]);

  const preset =
    presetOptions.find((option) => option.key === form.volumePreset) ||
    presetOptions[0];

  const derived = computeDashboardDerived({
    project,
    gbp,
    competitors,
    eventLabelSingular: form.eventLabelSingular,
    eventLabelPlural: form.eventLabelPlural,
    preset,
  });

  const actions = createProjectDashboardActions({
    clientId,
    projectId,
    form,
    preset,
    loadAll,
    setStatus,
  });

  return {
    client,
    project,
    gbp,
    competitors,
    status,
    loading,
    tab,
    setTab,
    onboardingCategory,
    setOnboardingCategory,
    onboardingMetro,
    setOnboardingMetro,
    gbpName: form.gbpName,
    setGbpName: form.setGbpName,
    placeId: form.placeId,
    setPlaceId: form.setPlaceId,
    gbpUrl: form.gbpUrl,
    setGbpUrl: form.setGbpUrl,
    primaryCategory: form.primaryCategory,
    setPrimaryCategory: form.setPrimaryCategory,
    rating: form.rating,
    setRating: form.setRating,
    totalReviews: form.totalReviews,
    setTotalReviews: form.setTotalReviews,
    photosCount: form.photosCount,
    setPhotosCount: form.setPhotosCount,
    compDomain: form.compDomain,
    setCompDomain: form.setCompDomain,
    compName: form.compName,
    setCompName: form.setCompName,
    compSource: form.compSource,
    setCompSource: form.setCompSource,
    compRating: form.compRating,
    setCompRating: form.setCompRating,
    compReviews: form.compReviews,
    setCompReviews: form.setCompReviews,
    volumePreset: form.volumePreset,
    setVolumePreset: form.setVolumePreset,
    showAdvancedLabels: form.showAdvancedLabels,
    setShowAdvancedLabels: form.setShowAdvancedLabels,
    eventLabelSingular: form.eventLabelSingular,
    setEventLabelSingular: form.setEventLabelSingular,
    eventLabelPlural: form.eventLabelPlural,
    setEventLabelPlural: form.setEventLabelPlural,
    monthlyEvents: form.monthlyEvents,
    setMonthlyEvents: form.setMonthlyEvents,
    reviewConvRate: form.reviewConvRate,
    setReviewConvRate: form.setReviewConvRate,
    presetOptions,
    tabs,
    preset,
    labelSingular: derived.labelSingular,
    labelPlural: derived.labelPlural,
    saveProjectReviewCapacity: actions.saveProjectReviewCapacity,
    saveGbpProfile: actions.saveGbpProfile,
    addOrUpdateCompetitor: actions.addOrUpdateCompetitor,
    deleteCompetitor: actions.deleteCompetitor,
    runOnboardingClarification: actions.runOnboardingClarification,
    gapReviews: derived.gapReviews,
    desiredTarget90d: derived.desiredTarget90d,
    maxReviews90d: derived.maxReviews90d,
    realisticTarget90d: derived.realisticTarget90d,
    perWeek: derived.perWeek,
    monthsToCloseGap: derived.monthsToCloseGap,
    hasCapacity: derived.hasCapacity,
    hasGbp: derived.hasGbp,
    hasCompetitors: derived.hasCompetitors,
    setupDoneCount: derived.setupDoneCount,
  };
}
