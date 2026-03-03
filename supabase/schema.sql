-- supabase/schema.sql
-- Digital Brain (Phase 2E)
-- Database schema + policies that must be tracked in source control.
-- NOTE: This file is an operational "source of truth" log.
-- Apply changes in Supabase SQL editor, then mirror them here.

begin;

-- ============================================================
-- RLS: project_authority_scores
-- ============================================================

-- Ensure RLS is enabled
alter table public.project_authority_scores enable row level security;

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