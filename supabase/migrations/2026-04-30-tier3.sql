-- ─────────────────────────────────────────────────────────────────────
-- Tier 3 migration — goals, interventions, supplements, shares
-- Run this in the Supabase SQL editor on your existing project.
-- Safe to re-run (uses IF NOT EXISTS / DO $$ blocks).
-- ─────────────────────────────────────────────────────────────────────

-- ── health_goals ──
-- One row per goal the user sets (e.g. "lower LDL to <100 by Aug 2026").
create table if not exists public.health_goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null references public.users_profile(user_id) on delete cascade,

  marker_slug     text not null,                  -- biomarker slug from src/lib/biomarkers.ts
  marker_label    text not null,                  -- canonical name snapshot
  direction       text not null check (direction in ('decrease','increase','reach-range')),
  target_value    numeric,                        -- e.g. 100 (mg/dL)
  target_unit     text,                           -- e.g. mg/dL
  target_date     date,                           -- optional deadline

  status          text not null default 'active' check (status in ('active','achieved','paused','archived')),
  baseline_value  numeric,                        -- value at goal creation (for progress calc)
  baseline_date   date,

  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  achieved_at     timestamptz
);

create index if not exists health_goals_user_idx on public.health_goals(user_id, created_at desc);

-- ── interventions ──
-- Things the user is doing to move a marker (diet, exercise, med, supp, lifestyle).
-- Optionally linked to a goal.
create table if not exists public.interventions (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null references public.users_profile(user_id) on delete cascade,
  goal_id         uuid references public.health_goals(id) on delete set null,

  kind            text not null check (kind in ('diet','exercise','supplement','medication','lifestyle','other')),
  name            text not null,
  dose            text,                           -- "500mg daily", "30 min/day", etc.
  notes           text,

  started_at      date not null default current_date,
  ended_at        date,

  created_at      timestamptz default now()
);

create index if not exists interventions_user_idx on public.interventions(user_id, created_at desc);
create index if not exists interventions_goal_idx on public.interventions(goal_id);

-- ── user_supplements ──
-- The user's current supplement stack. Distinct from `interventions` because
-- supplements are a long-running stack the user manages explicitly.
create table if not exists public.user_supplements (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null references public.users_profile(user_id) on delete cascade,

  supplement_key  text not null,                  -- catalog key from src/lib/supplements.ts
  display_name    text not null,                  -- snapshot (so old rows still render if catalog changes)
  dose            text,                           -- "5000 IU daily"
  reason          text,                           -- "trying to raise vitamin D"
  source          text default 'self' check (source in ('self','ai-suggested')),

  started_at      date not null default current_date,
  ended_at        date,

  created_at      timestamptz default now()
);

create index if not exists user_supplements_user_idx on public.user_supplements(user_id, started_at desc);

-- ── analysis_shares ──
-- Time-limited public read tokens for a single lab_analyses row.
-- Anyone with the token can view the analysis at /share/<token>.
create table if not exists public.analysis_shares (
  token         text primary key,                  -- random url-safe string
  analysis_id   uuid not null references public.lab_analyses(id) on delete cascade,
  user_id       text not null references public.users_profile(user_id) on delete cascade,

  expires_at    timestamptz,                       -- null = no expiry
  created_at    timestamptz default now(),
  view_count    integer not null default 0,
  last_viewed_at timestamptz
);

create index if not exists analysis_shares_user_idx     on public.analysis_shares(user_id, created_at desc);
create index if not exists analysis_shares_analysis_idx on public.analysis_shares(analysis_id);

-- ── RLS (deny by default; everything goes through service role) ──
alter table public.health_goals      enable row level security;
alter table public.interventions     enable row level security;
alter table public.user_supplements  enable row level security;
alter table public.analysis_shares   enable row level security;

-- ── updated_at trigger reuses public.set_updated_at from main schema ──
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists health_goals_updated_at on public.health_goals;
    create trigger health_goals_updated_at
      before update on public.health_goals
      for each row execute function public.set_updated_at();
  end if;
end $$;
