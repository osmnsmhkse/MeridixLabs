-- ─────────────────────────────────────────────────────────────────────
-- Security baseline — 2026-06-05
--
-- Meridix Labs' data model: ALL access goes through Next.js server routes
-- using the Supabase SERVICE ROLE key, which authorizes by first checking the
-- Clerk session and then scoping every query by user_id. The browser only ever
-- holds the ANON key, which must be able to do NOTHING.
--
-- That safety rests on one invariant: every table has RLS ENABLED with NO
-- permissive policy (deny-by-default). The service role bypasses RLS by design;
-- anon/authenticated are denied. This migration re-asserts that invariant
-- idempotently so a missed table can never silently expose data via the
-- shipped anon key.
--
-- ⚠️  DO NOT add `... TO anon` / `... TO authenticated` policies to any table
--     holding user or patient data. If you ever need browser-side reads, add a
--     policy that checks the Clerk JWT — never a blanket grant.
--
-- Safe to re-run (idempotent).
-- ─────────────────────────────────────────────────────────────────────

alter table if exists public.users_profile        enable row level security;
alter table if exists public.lab_analyses          enable row level security;
alter table if exists public.lab_chat_messages     enable row level security;
alter table if exists public.symptom_sessions      enable row level security;
alter table if exists public.diagnosis_sessions    enable row level security;
alter table if exists public.practice_sessions     enable row level security;
alter table if exists public.feedback              enable row level security;
alter table if exists public.health_goals          enable row level security;
alter table if exists public.interventions         enable row level security;
alter table if exists public.user_supplements      enable row level security;
alter table if exists public.analysis_shares       enable row level security;
alter table if exists public.doctor_waitlist       enable row level security;
alter table if exists public.knowledge_chunks      enable row level security;
alter table if exists public.analytics_events      enable row level security;
alter table if exists public.ab_events             enable row level security;
alter table if exists public.clerk_users           enable row level security;
alter table if exists public.pubmed_marker_cache   enable row level security;

-- Note: no CREATE POLICY statements here on purpose. "RLS enabled + zero
-- policies" = deny-all for anon/authenticated, which is exactly what we want.
