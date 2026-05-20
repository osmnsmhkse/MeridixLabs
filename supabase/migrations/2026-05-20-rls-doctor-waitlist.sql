-- ─────────────────────────────────────────────────────────────────────
-- Security hardening — 2026-05-20
--   1. Enable RLS on public.doctor_waitlist (matches existing pattern:
--      deny-by-default, service role bypasses for /api/doctor-waitlist).
--   2. Pin search_path on public.set_updated_at to silence the
--      "Function Search Path Mutable" advisor warning and prevent
--      search_path injection attacks.
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────

alter table public.doctor_waitlist enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
