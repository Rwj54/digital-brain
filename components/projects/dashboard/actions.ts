"use client";

import type { FormEvent } from "react";
import type { VolumePresetOption } from "@/components/projects/dashboard/types";
import type { useProjectDashboardFormState } from "@/components/projects/dashboard/formState";
import {
  deleteCompetitorData,
  saveCompetitorData,
  saveGbpProfileData,
  saveProjectReviewCapacityData,
} from "@/components/projects/dashboard/writeData";

type DashboardForm = ReturnType<typeof useProjectDashboardFormState>;

type DashboardActionsArgs = {
  clientId: string;
  projectId: string;
  form: DashboardForm;
  preset: VolumePresetOption;
  loadAll: () => Promise<void>;
  setStatus: (value: string | null) => void;
};

type RunOnboardingClarificationInput = {
  category: string;
  metro: string;
};

export function createProjectDashboardActions({
  clientId,
  projectId,
  form,
  preset,
  loadAll,
  setStatus,
}: DashboardActionsArgs) {
  async function saveProjectReviewCapacity(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

    const { error } = await saveProjectReviewCapacityData({
      clientId,
      projectId,
      monthlyEvents: form.monthlyEvents,
      reviewConvRate: form.reviewConvRate,
      volumePreset: form.volumePreset,
      eventLabelSingular: form.eventLabelSingular,
      eventLabelPlural: form.eventLabelPlural,
      preset,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    await loadAll();
    setStatus("Saved review capacity settings.");
  }

  async function saveGbpProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

    const { error } = await saveGbpProfileData({
      projectId,
      gbpName: form.gbpName,
      placeId: form.placeId,
      gbpUrl: form.gbpUrl,
      primaryCategory: form.primaryCategory,
      rating: form.rating,
      totalReviews: form.totalReviews,
      photosCount: form.photosCount,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    await loadAll();
    setStatus("Saved GBP snapshot.");
  }

  async function addOrUpdateCompetitor(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

    const { error } = await saveCompetitorData({
      projectId,
      compDomain: form.compDomain,
      compName: form.compName,
      compSource: form.compSource,
      compRating: form.compRating,
      compReviews: form.compReviews,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    form.resetCompetitorForm();
    await loadAll();
    setStatus("Saved competitor metrics.");
  }

  async function deleteCompetitor(id: string) {
    setStatus(null);

    const { error } = await deleteCompetitorData(id);

    if (error) {
      setStatus(error.message);
      return;
    }

    await loadAll();
  }

  async function runOnboardingClarification(
    input: RunOnboardingClarificationInput,
  ) {
    setStatus(null);

    const response = await fetch(`/api/projects/${projectId}/onboarding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: input.category,
        metro: input.metro,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          error?: string;
          setupStatus?: string;
        }
      | null;

    if (!response.ok || !payload?.ok) {
      setStatus(payload?.error ?? "Onboarding clarification failed.");
      return;
    }

    await loadAll();

    if (payload.setupStatus === "activated") {
      setStatus("Saved onboarding clarification and activated project onboarding.");
      return;
    }

    setStatus("Saved onboarding clarification.");
  }

  return {
    saveProjectReviewCapacity,
    saveGbpProfile,
    addOrUpdateCompetitor,
    deleteCompetitor,
    runOnboardingClarification,
  };
}
