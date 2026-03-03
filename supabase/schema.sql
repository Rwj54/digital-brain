-- supabase/schema.sql
-- Digital Brain (Phase 2E)
-- Database schema + policies that must be tracked in source control.
-- NOTE: Apply in Supabase SQL editor, then mirror changes here.

begin;

-- ============================================================
-- TABLE: project_authority_scores
-- ============================================================

-- RLS enabled
alter table public.project_authority_scores enable row level security;

-- Unique key: allow multiple versions per day
alter table public.project_authority_scores
drop constraint if exists project_authority_scores_project_id_captured_at_key;

create unique index if not exists project_authority_scores_project_id_captured_at_version_key
on public.project_authority_scores (project_id, captured_at, version);

-- ============================================================
-- RLS: project_authority_scores
-- ============================================================

-- Read policy:
-- Allow authenticated users to read authority scores for projects they can access.
-- Current implementation: project must exist. (Tighten later to user/client ownership.)
drop policy if exists "read authority scores" on public.project_authority_scores;

create policy "read authority scores"
on public.project_authority_scores
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_authority_scores.project_id
  )
);

commit;