-- ─────────────────────────────────────────────────────────────────────
-- Lab-chat persistence — chat history tied to a specific lab analysis
-- Run this in the Supabase SQL editor on your existing project.
-- Safe to re-run (uses IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────

-- ── lab_chat_messages ──
-- Persisted chat between the user and Meridix AI about a specific
-- analyzed lab report. Messages are saved in the order they were
-- exchanged. Anonymous users keep their history client-side in
-- localStorage; only signed-in users land here.
create table if not exists public.lab_chat_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null references public.users_profile(user_id) on delete cascade,
  analysis_id  uuid not null references public.lab_analyses(id) on delete cascade,
  role         text not null check (role in ('user','assistant')),
  content      text not null,
  tier         text check (tier in ('simple','medium','expert') or tier is null),
  created_at   timestamptz default now()
);

create index if not exists lab_chat_messages_analysis_idx
  on public.lab_chat_messages(analysis_id, created_at asc);

create index if not exists lab_chat_messages_user_idx
  on public.lab_chat_messages(user_id, created_at desc);

-- ── RLS ──
-- Deny by default; service role (API routes) bypasses RLS.
alter table public.lab_chat_messages enable row level security;
