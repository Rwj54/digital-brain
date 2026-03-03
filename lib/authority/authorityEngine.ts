// lib/authority/authorityEngine.ts

export type AuthorityTier =
  | "Establishing"
  | "Building"
  | "Competitive"
  | "Strong Authority"
  | "Dominant";

export type MomentumLabel =
  | "Declining"
  | "Flat"
  | "Gaining"
  | "Surging";

export interface AuthorityInputs {
  // Competitive inputs
  yourReviews: number;
  top3MedianReviews: number;

  yourVelocity90: number;
  top3MedianVelocity90: number;

  percentileRank: number; // 0–1

  marketDensityScore: number; // 0–1 normalized
  marketReviewCeilingScore: number; // 0–1 normalized
  marketVelocityCeilingScore: number; // 0–1 normalized

  // Structural inputs
  hasPrimaryCategory: boolean;
  additionalCategoryCount: number;
  hasDescription: boolean;
  hasHours: boolean;
  hasPhone: boolean;
  hasWebsite: boolean;

  reviewResponseRate?: number; // 0–1 optional

  // Momentum inputs
  yourVelocity14: number;
  yourVelocity30: number;
  gapChange90: number; // positive if gap shrinking
  marketAcceleration: number; // normalized
}

export interface AuthorityResult {
  authorityScore: number;
  authorityTier: AuthorityTier;

  competitiveStrength: number;
  structuralOptimization: number;

  momentumScore: number;
  momentumLabel: MomentumLabel;

  inputs: Record<string, any>;
}

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value));
}

function diminishingReturns(baseScore: number): number {
  const b = clamp(0, 100, baseScore) / 100;
  const d = 1 - Math.pow(1 - b, 1.35);
  return clamp(0, 100, d * 100);
}

function getTier(score: number): AuthorityTier {
  if (score < 30) return "Establishing";
  if (score < 55) return "Building";
  if (score < 75) return "Competitive";
  if (score < 90) return "Strong Authority";
  return "Dominant";
}

function getMomentumLabel(score: number): MomentumLabel {
  if (score < -25) return "Declining";
  if (score < 10) return "Flat";
  if (score < 40) return "Gaining";
  return "Surging";
}

export function computeAuthority(inputs: AuthorityInputs): AuthorityResult {
  // -----------------------
  // MARKET COMPETITIVENESS INDEX
  // -----------------------
  const MCI =
    0.4 * inputs.marketDensityScore +
    0.35 * inputs.marketReviewCeilingScore +
    0.25 * inputs.marketVelocityCeilingScore;

  // -----------------------
  // GAP SCORE
  // -----------------------
  const gap = Math.max(
    0,
    inputs.top3MedianReviews - inputs.yourReviews
  );

  const G = 60 + 40 * MCI; // harder markets increase gap sensitivity
  const gapScore = 100 * Math.exp(-gap / G);

  // -----------------------
  // PERCENTILE SCORE
  // -----------------------
  const percentileScore = 100 * clamp(0, 1, inputs.percentileRank);

  // -----------------------
  // VELOCITY SCORE
  // -----------------------
  const velocityRatio =
    inputs.yourVelocity90 /
    Math.max(1, inputs.top3MedianVelocity90);

  const velocityScore =
    100 * Math.pow(Math.min(1, velocityRatio), 0.7);

  // -----------------------
  // CATEGORY STRENGTH SCORE
  // -----------------------
  const categoryStrengthScore = 100 * (1 - MCI);

  const competitiveStrength =
    0.4 * gapScore +
    0.3 * percentileScore +
    0.2 * velocityScore +
    0.1 * categoryStrengthScore;

  // -----------------------
  // STRUCTURAL OPTIMIZATION
  // -----------------------
  let structuralComponents: number[] = [];

  const completenessSignals = [
    inputs.hasPrimaryCategory ? 1 : 0,
    inputs.additionalCategoryCount > 0 ? 1 : 0,
    inputs.hasDescription ? 1 : 0,
    inputs.hasHours ? 1 : 0,
    inputs.hasPhone ? 1 : 0,
    inputs.hasWebsite ? 1 : 0,
  ];

  const completenessScore =
    (completenessSignals.reduce((a, b) => a + b, 0) /
      completenessSignals.length) *
    100;

  structuralComponents.push(0.3 * completenessScore);

  if (inputs.reviewResponseRate !== undefined) {
    structuralComponents.push(
      0.25 * (inputs.reviewResponseRate * 100)
    );
  }

  const structuralOptimization =
    structuralComponents.reduce((a, b) => a + b, 0) /
    structuralComponents
      .map((v) => v)
      .reduce((a, b) => a + b, 0) *
    100;

  // -----------------------
  // AUTHORITY SCORE
  // -----------------------
  const baseAuthority =
    0.6 * competitiveStrength +
    0.4 * structuralOptimization;

  const authorityScore = diminishingReturns(baseAuthority);
  const authorityTier = getTier(authorityScore);

  // -----------------------
  // MOMENTUM
  // -----------------------
  const accel =
    (inputs.yourVelocity14 - inputs.yourVelocity30) /
    Math.max(1, inputs.yourVelocity30);

  const relativeAccel = accel - inputs.marketAcceleration;

  const A = accel;
  const B = inputs.gapChange90 / 50;
  const C = relativeAccel;

  const momentumScore =
    50 * Math.tanh(A) +
    30 * Math.tanh(B) +
    20 * Math.tanh(C);

  const momentumLabel = getMomentumLabel(momentumScore);

  return {
    authorityScore: Math.round(authorityScore * 10) / 10,
    authorityTier,

    competitiveStrength:
      Math.round(competitiveStrength * 10) / 10,
    structuralOptimization:
      Math.round(structuralOptimization * 10) / 10,

    momentumScore: Math.round(momentumScore * 10) / 10,
    momentumLabel,

    inputs,
  };
}