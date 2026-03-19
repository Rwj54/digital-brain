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

-- ============================================================
-- TABLE: owner_priority_snapshots
-- ============================================================

create table if not exists public.owner_priority_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  captured_at date not null,
  version text not null default 'v1.0',
  priorities_json jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now()
);

create unique index if not exists owner_priority_snapshots_project_id_captured_at_version_key
on public.owner_priority_snapshots (project_id, captured_at, version);

create index if not exists owner_priority_snapshots_project_id_captured_at_idx
on public.owner_priority_snapshots (project_id, captured_at desc);

alter table public.owner_priority_snapshots enable row level security;

drop policy if exists "read owner priority snapshots" on public.owner_priority_snapshots;

create policy "read owner priority snapshots"
on public.owner_priority_snapshots
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = owner_priority_snapshots.project_id
  )
);

-- ============================================================
-- TABLE: owner_tasks
-- ============================================================

create table if not exists public.owner_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  priority_snapshot_id uuid references public.owner_priority_snapshots(id) on delete set null,
  title text not null,
  plain_language_reason text,
  why_now text,
  expected_benefit text,
  who_should_do_it text,
  difficulty text,
  time_to_complete_estimate text,
  proof_of_completion text,
  confidence_level numeric,
  status text not null default 'open',
  sort_order integer not null default 100,
  task_type text,
  task_data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone
);

create index if not exists owner_tasks_project_id_status_idx
on public.owner_tasks (project_id, status, sort_order, created_at desc);

create index if not exists owner_tasks_project_id_created_at_idx
on public.owner_tasks (project_id, created_at desc);

create index if not exists owner_tasks_priority_snapshot_id_idx
on public.owner_tasks (priority_snapshot_id);

create unique index if not exists owner_tasks_project_id_title_status_open_key
on public.owner_tasks (project_id, title, status);

alter table public.owner_tasks enable row level security;

drop policy if exists "read owner tasks" on public.owner_tasks;

create policy "read owner tasks"
on public.owner_tasks
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = owner_tasks.project_id
  )
);

commit;
