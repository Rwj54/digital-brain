"use client";

import { useState } from "react";

export type DashboardFormStateValues = {
  volumePreset: string;
  showAdvancedLabels: boolean;
  eventLabelSingular: string;
  eventLabelPlural: string;
  monthlyEvents: string;
  reviewConvRate: string;
  gbpName: string;
  placeId: string;
  gbpUrl: string;
  primaryCategory: string;
  rating: string;
  totalReviews: string;
  photosCount: string;
};

export function useProjectDashboardFormState() {
  const [gbpName, setGbpName] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [gbpUrl, setGbpUrl] = useState("");
  const [primaryCategory, setPrimaryCategory] = useState("");
  const [rating, setRating] = useState("");
  const [totalReviews, setTotalReviews] = useState("");
  const [photosCount, setPhotosCount] = useState("");

  const [compDomain, setCompDomain] = useState("");
  const [compName, setCompName] = useState("");
  const [compSource, setCompSource] = useState("manual");
  const [compRating, setCompRating] = useState("");
  const [compReviews, setCompReviews] = useState("");

  const [volumePreset, setVolumePreset] = useState("jobs");
  const [showAdvancedLabels, setShowAdvancedLabels] = useState(false);
  const [eventLabelSingular, setEventLabelSingular] = useState("Job");
  const [eventLabelPlural, setEventLabelPlural] = useState("Jobs");
  const [monthlyEvents, setMonthlyEvents] = useState("");
  const [reviewConvRate, setReviewConvRate] = useState("");

  function applyLoadedFormState(values: DashboardFormStateValues) {
    setVolumePreset(values.volumePreset);
    setShowAdvancedLabels(values.showAdvancedLabels);
    setEventLabelSingular(values.eventLabelSingular);
    setEventLabelPlural(values.eventLabelPlural);
    setMonthlyEvents(values.monthlyEvents);
    setReviewConvRate(values.reviewConvRate);

    setGbpName(values.gbpName);
    setPlaceId(values.placeId);
    setGbpUrl(values.gbpUrl);
    setPrimaryCategory(values.primaryCategory);
    setRating(values.rating);
    setTotalReviews(values.totalReviews);
    setPhotosCount(values.photosCount);
  }

  function resetCompetitorForm() {
    setCompDomain("");
    setCompName("");
    setCompSource("manual");
    setCompRating("");
    setCompReviews("");
  }

  return {
    gbpName,
    setGbpName,
    placeId,
    setPlaceId,
    gbpUrl,
    setGbpUrl,
    primaryCategory,
    setPrimaryCategory,
    rating,
    setRating,
    totalReviews,
    setTotalReviews,
    photosCount,
    setPhotosCount,
    compDomain,
    setCompDomain,
    compName,
    setCompName,
    compSource,
    setCompSource,
    compRating,
    setCompRating,
    compReviews,
    setCompReviews,
    volumePreset,
    setVolumePreset,
    showAdvancedLabels,
    setShowAdvancedLabels,
    eventLabelSingular,
    setEventLabelSingular,
    eventLabelPlural,
    setEventLabelPlural,
    monthlyEvents,
    setMonthlyEvents,
    reviewConvRate,
    setReviewConvRate,
    applyLoadedFormState,
    resetCompetitorForm,
  };
}