-- ─────────────────────────────────────────────────────────────────────
-- Meridix Labs — Supabase schema
-- Run this in the Supabase SQL editor on a fresh project.
-- ─────────────────────────────────────────────────────────────────────

-- Extensions
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────
-- users_profile
--   One row per Clerk user. Keyed by Clerk user_id (string).
--   Minimal required: age, sex, medications, allergies (all optional).
--   Optional extended fields can be filled in from the dashboard.
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.users_profile (
  user_id           text primary key,                 -- Clerk user id
  email             text,
  display_name      text,

  -- minimal profile (asked at signup, all optional)
  age               integer,
  sex               text check (sex in ('male','female','other') or sex is null),
  medications       text,
  allergies         text,

  -- standard (optional from dashboard)
  weight_kg         numeric,
  height_cm         numeric,
  ethnicity         text,
  fasting_default   boolean default false,

  -- comprehensive (optional)
  conditions        text,
  family_history    text,
  lifestyle_notes   text,

  profile_depth     text default 'minimal' check (profile_depth in ('minimal','standard','comprehensive')),

  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- lab_analyses
--   One row per AI-analyzed lab report. Stores extracted lab values and
--   AI interpretation JSON. We do NOT store the raw PDF.
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.lab_analyses (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null references public.users_profile(user_id) on delete cascade,

  report_date       date,                             -- collection or report date if known
  source_filename   text,                             -- e.g. "labcorp_2026_04.pdf"
  patient_context   jsonb,                            -- age/sex/meds snapshot at time of analysis

  tier              text check (tier in ('simple','medium','expert') or tier is null),
  summary           text,                             -- short TL;DR
  analysis          jsonb not null,                   -- full AnalysisResult JSON (flags, supplements, etc.)
  flags             jsonb,                            -- [{marker, value, unit, reference, status, severity}]
  labs_raw          jsonb,                            -- [{marker, value, unit, reference, status}]
  health_score      integer,                          -- 0-100 derived score (optional)

  created_at        timestamptz default now()
);

create index if not exists lab_analyses_user_idx          on public.lab_analyses(user_id, created_at desc);
create index if not exists lab_analyses_report_date_idx   on public.lab_analyses(user_id, report_date desc);

-- ─────────────────────────────────────────────────────────────────────
-- lab_chat_messages
--   Persisted chat between the user and Meridix AI about a specific
--   analyzed lab report. Anonymous users keep history in localStorage;
--   only signed-in users land here.
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.lab_chat_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null references public.users_profile(user_id) on delete cascade,
  analysis_id  uuid not null references public.lab_analyses(id) on delete cascade,
  role         text not null check (role in ('user','assistant')),
  content      text not null,
  tier         text check (tier in ('simple','medium','expert') or tier is null),
  created_at   timestamptz default now()
);

create index if not exists lab_chat_messages_analysis_idx on public.lab_chat_messages(analysis_id, created_at asc);
create index if not exists lab_chat_messages_user_idx     on public.lab_chat_messages(user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- symptom_sessions — /symptom tool history
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.symptom_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references public.users_profile(user_id) on delete cascade,
  symptoms    text,
  result      jsonb,
  created_at  timestamptz default now()
);
create index if not exists symptom_sessions_user_idx on public.symptom_sessions(user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- diagnosis_sessions — /diagnosed tool history
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.diagnosis_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references public.users_profile(user_id) on delete cascade,
  diagnosis   text,
  result      jsonb,
  created_at  timestamptz default now()
);
create index if not exists diagnosis_sessions_user_idx on public.diagnosis_sessions(user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- practice_sessions — /learn tool (XP, streak, grades)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.practice_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references public.users_profile(user_id) on delete cascade,
  specialty     text,
  difficulty    text,
  mode          text,
  grade         text,
  score_pct     integer,
  xp_earned     integer default 0,
  case_data     jsonb,
  evaluation    jsonb,
  created_at    timestamptz default now()
);
create index if not exists practice_sessions_user_idx on public.practice_sessions(user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- Row Level Security
--   We authenticate via Clerk server-side and query through the
--   service role key from Next.js server routes. RLS is enabled with
--   deny-by-default; only the service role (API) can read/write.
-- ─────────────────────────────────────────────────────────────────────
alter table public.users_profile      enable row level security;
alter table public.lab_analyses       enable row level security;
alter table public.lab_chat_messages  enable row level security;
alter table public.symptom_sessions   enable row level security;
alter table public.diagnosis_sessions enable row level security;
alter table public.practice_sessions  enable row level security;

-- No policies means anon/authenticated (anon key) cannot read/write.
-- Service role bypasses RLS by design.

-- ─────────────────────────────────────────────────────────────────────
-- updated_at trigger for users_profile
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_profile_updated_at on public.users_profile;
create trigger users_profile_updated_at
  before update on public.users_profile
  for each row execute function public.set_updated_at();
