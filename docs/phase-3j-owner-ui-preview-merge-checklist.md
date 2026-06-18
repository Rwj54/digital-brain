# Phase 3J Owner UI Preview Merge Checklist

## Current accepted preview checkpoint

Branch: `phase-3j-owner-ui-preview`
Latest accepted commit: `72d6eca Add impact watch inspection copy guard`
Full SHA: `72d6ecaf3fce43ae3ee2cc09246997d5bfc0093e`
Vercel branch alias: `digital-brain-git-phase-3j-owne-58d09c-rick-s-projects-bed4b8e3.vercel.app`

## Merge decision

Do not merge casually.

This branch is ahead of `main` by 230 commits and contains the full Phase 3 owner-mode preview build.
It should be merged only after a controlled merge review.

## Required pre-merge checks

- `npm run verify:owner-task-impact-eligible-candidates`
- `npm run verify:owner-task-impact-safety`
- `npm run lint`
- `npm run build`

## Required no-write boundaries

- No database writes from impact-watch inspection UI.
- No `comparison_metrics` write route enabled.
- No `impact_summary` write enabled.
- No `confidence_level` write enabled.
- No stored impact status promotion.
- No attribution claim that an owner task caused a result.
- `databaseWritesPerformed` must remain `false`.

## Required impact-watch behavior

- Owner Task evidence shows impact watch timing.
- Owner Task evidence links to `/projects/[projectId]/impact-watches`.
- Impact-watch inspection page shows `Changed since baseline preview`.
- Impact-watch inspection page shows `Waiting for window`.
- Impact-watch inspection page shows `Read-only`.
- Impact-watch inspection page shows `No attribution claim`.
- The inspection page must not say the action worked.
- The inspection page must not claim causation.

## Recommended merge path

1. Keep `phase-3j-owner-ui-preview` as the accepted preview branch.
2. Create a fresh merge branch from `main`.
3. Merge or cherry-pick controlled Phase 3 owner-mode commits into that branch.
4. Run the full safety, lint, and build suite.
5. Visually verify owner page and impact-watch page.
6. Only then merge to `main`.

## Current status

As of checkpoint `72d6eca`, this preview branch is accepted for continued preview work, not yet accepted for direct merge to `main`.
